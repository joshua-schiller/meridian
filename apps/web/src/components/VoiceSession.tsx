"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ServerMsg =
  | { type: "ready"; opening: string }
  | { type: "agent_text"; text: string; turn_id: string }
  | { type: "agent_audio"; data: string; turn_id: string }
  | { type: "transcript_final"; text: string; turn_id: string }
  | { type: "tts_error"; message: string }
  | { type: "session_complete"; transcript: Record<string, unknown> }
  | { type: "error"; message: string };

type Turn = { id: string; speaker: "agent" | "interviewee"; text: string };

type Status = "idle" | "connecting" | "live" | "done" | "error";

const SCRIPTED_RESPONSES = [
  "Honestly the biggest issue is that by the time I get a synthesis doc from the research team, we've already made half the decisions. The bottleneck isn't the interviews themselves, it's how long it takes to turn them into something actionable.",
  "We've tried having researchers take detailed notes and share a doc after each call, but it still takes 48 hours minimum. And by then the PM meeting has happened and we've moved on.",
  "If something could watch the conversation in real time and flag key themes as they emerge — not after the fact — that would change everything. Right now I feel like I'm flying blind until the report lands.",
];

const API_WS_BASE =
  process.env.NEXT_PUBLIC_API_WS_URL ?? "ws://localhost:8001";

export default function VoiceSession() {
  const [status, setStatus] = useState<Status>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [scriptedIdx, setScriptedIdx] = useState(0);
  const [finalTranscript, setFinalTranscript] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const stopMic = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const playAudio = useCallback((base64Data: string) => {
    const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play().catch(console.error);
    audio.onended = () => URL.revokeObjectURL(url);
  }, []);

  const handleMessage = useCallback(
    (msg: ServerMsg) => {
      switch (msg.type) {
        case "ready":
          break;
        case "agent_text":
          setTurns((t) => [...t, { id: msg.turn_id, speaker: "agent", text: msg.text }]);
          break;
        case "agent_audio":
          playAudio(msg.data);
          break;
        case "transcript_final":
          setTurns((t) => [
            ...t,
            { id: msg.turn_id, speaker: "interviewee", text: msg.text },
          ]);
          break;
        case "session_complete":
          setFinalTranscript(msg.transcript);
          setStatus("done");
          break;
        case "error":
        case "tts_error":
          setErrorMsg(msg.message);
          break;
      }
    },
    [playAudio],
  );

  const connect = useCallback(
    async (scripted: boolean) => {
      setStatus("connecting");
      setTurns([]);
      setScriptedIdx(0);
      setFinalTranscript(null);
      setErrorMsg("");

      // Acquire the mic BEFORE opening the socket so we can fail cleanly.
      let stream: MediaStream | null = null;
      if (!scripted) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
          });
        } catch {
          setStatus("error");
          setErrorMsg("Microphone access denied. Try scripted mode instead.");
          return;
        }
      }

      const ws = new WebSocket(
        `${API_WS_BASE}/voice/session?contact=maya_chen&scripted=${scripted}`,
      );
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("live");
        // Capture raw 16kHz mono PCM via Web Audio and stream it to the API,
        // which forwards it to Deepgram. (Chunked WebM from MediaRecorder is
        // not independently decodable, so live STT needs raw linear16.)
        if (stream) {
          const audioCtx = new AudioContext({ sampleRate: 16000 });
          audioCtxRef.current = audioCtx;
          mediaStreamRef.current = stream;
          const source = audioCtx.createMediaStreamSource(stream);
          const processor = audioCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;
          processor.onaudioprocess = (e) => {
            if (wsRef.current?.readyState !== WebSocket.OPEN) return;
            const input = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
              const s = Math.max(-1, Math.min(1, input[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            wsRef.current.send(pcm16.buffer);
          };
          source.connect(processor);
          // Route through a muted gain so onaudioprocess fires without feedback.
          const sink = audioCtx.createGain();
          sink.gain.value = 0;
          processor.connect(sink);
          sink.connect(audioCtx.destination);
        }
      };
      ws.onmessage = (event) => handleMessage(JSON.parse(event.data) as ServerMsg);
      ws.onerror = () => {
        setStatus("error");
        setErrorMsg("WebSocket connection failed. Make sure the API is running on port 8001.");
      };
      ws.onclose = () => stopMic();
    },
    [handleMessage, stopMic],
  );

  const injectScriptedResponse = useCallback(() => {
    if (!wsRef.current || scriptedIdx >= SCRIPTED_RESPONSES.length) return;
    wsRef.current.send(
      JSON.stringify({ type: "inject_text", text: SCRIPTED_RESPONSES[scriptedIdx] }),
    );
    setScriptedIdx((i) => i + 1);
  }, [scriptedIdx]);

  const endSession = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "end_session" }));
  }, []);

  const reset = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("idle");
    setTurns([]);
    setScriptedIdx(0);
    setFinalTranscript(null);
    setErrorMsg("");
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      {status === "idle" && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => connect(true)}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Start Demo (scripted)
          </button>
          <button
            onClick={() => connect(false)}
            className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:bg-[var(--panel-strong)]"
          >
            Start Live (microphone)
          </button>
        </div>
      )}

      {status === "connecting" && (
        <p className="text-sm text-[var(--muted)]">Connecting to session…</p>
      )}

      {status === "live" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Live session
          </span>
          <button
            onClick={injectScriptedResponse}
            disabled={scriptedIdx >= SCRIPTED_RESPONSES.length}
            className="ml-auto rounded-md bg-[var(--panel-strong)] px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            Inject Maya's response ({scriptedIdx + 1}/{SCRIPTED_RESPONSES.length})
          </button>
          <button
            onClick={endSession}
            className="rounded-md border border-[var(--line)] px-3 py-1.5 text-xs hover:bg-[var(--panel-strong)]"
          >
            End session
          </button>
        </div>
      )}

      {(status === "done" || status === "error") && (
        <button
          onClick={reset}
          className="w-fit rounded-md border border-[var(--line)] px-3 py-1.5 text-xs hover:bg-[var(--panel-strong)]"
        >
          Start over
        </button>
      )}

      {errorMsg && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</p>
      )}

      {/* Transcript */}
      {turns.length > 0 && (
        <div
          ref={scrollRef}
          className="max-h-[28rem] space-y-3 overflow-auto rounded-lg border border-[var(--line)] p-4"
        >
          {turns.map((turn) => (
            <div
              key={turn.id}
              className={`rounded-md border border-[var(--line)] p-3 text-sm ${
                turn.speaker === "agent" ? "bg-[var(--panel)]" : "bg-[var(--panel-strong)]"
              }`}
            >
              <span className="font-mono text-xs uppercase text-[var(--muted)]">
                {turn.speaker === "agent" ? "Meridian" : "Maya Chen"}
              </span>
              <p className="mt-1 leading-6">{turn.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Session complete */}
      {status === "done" && finalTranscript && (
        <div className="rounded-lg border border-[var(--accent)] bg-[var(--panel)] p-4">
          <p className="font-semibold text-[var(--accent)]">Session complete</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {String(finalTranscript.summary ?? "")}
          </p>
          <p className="mt-1 font-mono text-xs text-[var(--muted)]">
            id: {String(finalTranscript.id ?? "")}
          </p>
          <p className="mt-3 text-xs text-[var(--muted)]">
            This transcript is now ready to feed the adaptive loop — run the research endpoint to
            generate Interview 2&apos;s sharper question bank.
          </p>
        </div>
      )}
    </div>
  );
}

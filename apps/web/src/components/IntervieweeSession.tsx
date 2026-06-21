"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ServerMsg =
  | { type: "ready"; opening: string }
  | { type: "agent_text"; text: string; turn_id: string }
  | { type: "agent_audio"; data: string; turn_id: string; seq?: number; final?: boolean }
  | { type: "transcript_final"; text: string; turn_id: string }
  | { type: "tts_error"; message: string }
  | { type: "session_complete"; transcript: unknown }
  | { type: "error"; message: string };

// idle → connecting → (speaking ↔ listening, with thinking between) → done
type Phase = "idle" | "connecting" | "speaking" | "listening" | "thinking" | "done" | "error";

type AgentLine = { id: string; text: string };

const API_WS_BASE = process.env.NEXT_PUBLIC_API_WS_URL ?? "ws://localhost:8001";
// Hera — the warm Aura-2 voice we settled on for the interviewer.
const VOICE = "aura-2-hera-en";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Ready when you are",
  connecting: "Connecting…",
  speaking: "Meridian is speaking",
  listening: "Listening — go ahead",
  thinking: "Thinking…",
  done: "Interview complete",
  error: "Something went wrong",
};

export default function IntervieweeSession() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [agentLines, setAgentLines] = useState<AgentLine[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Half-duplex gate: while the agent speaks/thinks we send silence so its own
  // voice isn't transcribed back into the loop.
  const agentBusyRef = useRef<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const playingRef = useRef<boolean>(false);
  const finalChunkReceivedRef = useRef<boolean>(true);

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
  }, [agentLines]);

  // Tear everything down when the screen unmounts.
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      currentAudioRef.current?.pause();
      processorRef.current?.disconnect();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // Play queued TTS chunks in order; reopen the mic only once the whole reply
  // has finished playing (never mid-reply).
  const playFromQueue = useCallback(() => {
    const next = audioQueueRef.current.shift();
    if (next === undefined) {
      playingRef.current = false;
      if (finalChunkReceivedRef.current) {
        agentBusyRef.current = false;
        setPhase((p) => (p === "speaking" ? "listening" : p));
      }
      return;
    }
    playingRef.current = true;
    agentBusyRef.current = true;
    setPhase("speaking");
    const bytes = Uint8Array.from(atob(next), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
    const audio = new Audio(url);
    currentAudioRef.current = audio;
    const advance = () => {
      URL.revokeObjectURL(url);
      playFromQueue();
    };
    audio.onended = advance;
    audio.onerror = advance;
    audio.play().catch((err) => {
      console.error(err);
      advance();
    });
  }, []);

  const enqueueAudio = useCallback(
    (base64Data: string, isFinal: boolean) => {
      if (isFinal) finalChunkReceivedRef.current = true;
      audioQueueRef.current.push(base64Data);
      agentBusyRef.current = true;
      if (!playingRef.current) playFromQueue();
    },
    [playFromQueue],
  );

  const handleMessage = useCallback((msg: ServerMsg) => {
    switch (msg.type) {
      case "ready":
        break;
      case "agent_text":
        // A new agent turn begins — mute the mic and reset the queue so it
        // won't reopen until this reply's final chunk has played.
        agentBusyRef.current = true;
        finalChunkReceivedRef.current = false;
        audioQueueRef.current = [];
        setPhase("speaking");
        setAgentLines((lines) => [...lines, { id: msg.turn_id, text: msg.text }]);
        break;
      case "agent_audio":
        enqueueAudio(msg.data, msg.final ?? true);
        break;
      case "transcript_final":
        // The interviewee finished a turn — hold the mic shut while Meridian
        // thinks up its reply. We deliberately do NOT show their words; this
        // screen is a transcript of Meridian's responses only.
        agentBusyRef.current = true;
        setPhase("thinking");
        break;
      case "session_complete":
        setPhase("done");
        stopMic();
        break;
      case "error":
      case "tts_error":
        finalChunkReceivedRef.current = true;
        if (!playingRef.current) agentBusyRef.current = false;
        setErrorMsg(msg.message);
        break;
    }
  }, [enqueueAudio, stopMic]);

  const begin = useCallback(async () => {
    setErrorMsg("");
    setAgentLines([]);
    setPhase("connecting");
    agentBusyRef.current = true; // agent speaks the opening first
    audioQueueRef.current = [];
    playingRef.current = false;
    finalChunkReceivedRef.current = true;

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      setPhase("error");
      setErrorMsg("Microphone access is needed for the interview. Please allow it and try again.");
      return;
    }

    const ws = new WebSocket(
      `${API_WS_BASE}/voice/session?contact=maya_chen&scripted=false&voice=${VOICE}`,
    );
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      // Capture raw 16kHz mono PCM and stream it to the API (which forwards to
      // Deepgram). Half-duplex: send silence while the agent is speaking.
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      mediaStreamRef.current = stream;
      const source = audioCtx.createMediaStreamSource(stream!);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(input.length);
        if (!agentBusyRef.current) {
          for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
        }
        wsRef.current.send(pcm16.buffer);
      };
      source.connect(processor);
      const sink = audioCtx.createGain();
      sink.gain.value = 0;
      processor.connect(sink);
      sink.connect(audioCtx.destination);
    };
    ws.onmessage = (event) => handleMessage(JSON.parse(event.data) as ServerMsg);
    ws.onerror = () => {
      setPhase("error");
      setErrorMsg("Couldn't reach the interview service. Make sure the API is running.");
    };
    ws.onclose = () => stopMic();
  }, [handleMessage, stopMic]);

  const endSession = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "end_session" }));
  }, []);

  const reset = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    currentAudioRef.current?.pause();
    stopMic();
    audioQueueRef.current = [];
    playingRef.current = false;
    agentBusyRef.current = false;
    setPhase("idle");
    setAgentLines([]);
    setErrorMsg("");
  }, [stopMic]);

  const active = phase !== "idle" && phase !== "done" && phase !== "error";
  const latest = agentLines[agentLines.length - 1];

  return (
    <div className="flex flex-col items-center gap-10">
      {/* The orb — the focal point. Reacts to whether Meridian is speaking,
          listening, or thinking. */}
      <div className="relative flex h-72 w-72 items-center justify-center">
        {/* Expanding rings while speaking */}
        {phase === "speaking" &&
          [0, 1, 2].map((i) => (
            <span
              key={i}
              className="absolute rounded-full border border-[var(--accent)]/40"
              style={{
                width: "18rem",
                height: "18rem",
                animation: "orbPing 1.8s cubic-bezier(0,0,0.2,1) infinite",
                animationDelay: `${i * 0.45}s`,
              }}
            />
          ))}

        {/* Soft breathing halo while listening */}
        {phase === "listening" && (
          <span
            className="absolute rounded-full bg-[var(--accent)]/10"
            style={{ width: "17rem", height: "17rem", animation: "orbBreathe 2.6s ease-in-out infinite" }}
          />
        )}

        {/* Rotating arc while thinking */}
        {phase === "thinking" && (
          <span
            className="absolute rounded-full border-2 border-transparent border-t-[var(--accent)]/70 border-r-[var(--accent)]/30"
            style={{ width: "16rem", height: "16rem", animation: "spin 1.1s linear infinite" }}
          />
        )}

        {/* Core orb */}
        <div
          className="relative flex items-center justify-center rounded-full shadow-[0_20px_60px_-12px_rgba(10,102,194,0.55)] transition-transform duration-700 ease-out"
          style={{
            width: "11rem",
            height: "11rem",
            background:
              "radial-gradient(circle at 32% 28%, #4d9be6 0%, var(--accent) 42%, #063e78 100%)",
            transform:
              phase === "speaking"
                ? "scale(1.06)"
                : phase === "listening"
                  ? "scale(1.0)"
                  : phase === "thinking"
                    ? "scale(0.98)"
                    : "scale(0.92)",
            animation: active && phase !== "speaking" ? "orbFloat 4s ease-in-out infinite" : undefined,
          }}
        >
          {/* glossy highlight */}
          <span
            className="absolute rounded-full"
            style={{
              inset: "0.6rem",
              background: "radial-gradient(circle at 35% 25%, rgba(255,255,255,0.45), transparent 55%)",
            }}
          />
          {/* center pulse dot */}
          <span
            className="relative block h-3 w-3 rounded-full bg-white/90"
            style={{
              animation:
                phase === "speaking"
                  ? "orbDot 0.6s ease-in-out infinite"
                  : phase === "listening"
                    ? "orbDot 1.6s ease-in-out infinite"
                    : undefined,
            }}
          />
        </div>
      </div>

      {/* Status line */}
      <div className="flex flex-col items-center gap-2 text-center">
        {phase !== "idle" && (
          <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
            {active && phase !== "connecting" && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
            )}
            {PHASE_LABEL[phase]}
          </span>
        )}
        {/* The most recent thing Meridian said, as a live caption */}
        {latest && phase !== "done" && (
          <p className="max-w-md text-lg font-medium leading-relaxed text-[var(--foreground)]">
            “{latest.text}”
          </p>
        )}
        {phase === "done" && (
          <p className="max-w-md text-base text-[var(--muted)]">
            Thanks — that's everything Meridian needed. You can close this screen.
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {phase === "idle" && (
          <button
            type="button"
            onClick={begin}
            className="rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-[var(--accent)]/30 transition hover:bg-[var(--accent-ink)] cursor-pointer"
          >
            Begin interview
          </button>
        )}
        {active && (
          <button
            type="button"
            onClick={endSession}
            disabled={phase === "connecting"}
            className="rounded-full border border-[var(--line)] bg-white px-6 py-2.5 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--panel-strong)] disabled:opacity-40 cursor-pointer"
          >
            End interview
          </button>
        )}
        {(phase === "done" || phase === "error") && (
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-[var(--line)] bg-white px-6 py-2.5 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--panel-strong)] cursor-pointer"
          >
            Start over
          </button>
        )}
      </div>

      {errorMsg && (
        <p className="max-w-md rounded-lg bg-red-50 px-4 py-2 text-center text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      {/* Transcript of Meridian's responses only */}
      {agentLines.length > 0 && (
        <div className="w-full max-w-xl">
          <h2 className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
            Meridian transcript
          </h2>
          <div
            ref={scrollRef}
            className="max-h-72 space-y-2.5 overflow-auto rounded-2xl border border-[var(--line)] bg-white/70 p-4 backdrop-blur"
          >
            {agentLines.map((line, i) => {
              const isLatest = i === agentLines.length - 1;
              return (
                <div
                  key={line.id}
                  className={`rounded-xl px-4 py-3 text-sm leading-relaxed transition-colors ${
                    isLatest && phase !== "done"
                      ? "bg-[var(--accent-wash)] text-[var(--foreground)] border border-[var(--accent)]/20"
                      : "bg-[var(--panel-strong)] text-[var(--muted)]"
                  }`}
                >
                  {line.text}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Component-scoped keyframes so we don't touch the shared globals. */}
      <style>{`
        @keyframes orbPing {
          0% { transform: scale(0.62); opacity: 0.7; }
          100% { transform: scale(1.05); opacity: 0; }
        }
        @keyframes orbBreathe {
          0%, 100% { transform: scale(0.92); opacity: 0.5; }
          50% { transform: scale(1.04); opacity: 0.9; }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0) scale(1.0); }
          50% { transform: translateY(-6px) scale(1.0); }
        }
        @keyframes orbDot {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(2.1); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

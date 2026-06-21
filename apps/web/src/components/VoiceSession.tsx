"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  LivingInsightDocument,
  QuestionBank,
  Transcript,
} from "@/lib/fixtures";

type ServerMsg =
  | { type: "ready"; opening: string }
  | { type: "agent_text"; text: string; turn_id: string }
  | { type: "agent_audio"; data: string; turn_id: string; seq?: number; final?: boolean }
  | { type: "transcript_final"; text: string; turn_id: string }
  | { type: "tts_error"; message: string }
  | { type: "session_complete"; transcript: Transcript }
  | { type: "error"; message: string };

type Turn = { id: string; speaker: "agent" | "interviewee"; text: string };

type Status = "idle" | "connecting" | "live" | "done" | "error";
type PipelineStatus = "idle" | "running" | "ready" | "error";

type LoopMetrics = {
  specificity_before: number;
  specificity_after: number;
  findings_added: number;
  grounded_questions: number;
  mode: string;
  requested_mode?: string;
  resolved_mode?: string;
  fallback_reason?: string | null;
};

type LoopEvidence = {
  id: string;
  finding_id: string;
  question_id: string | null;
  interviewee: string;
  quote: string;
  takeaway: string;
};

type LoopResult = {
  id: string;
  evidence: LoopEvidence[];
  summary: string;
};

type AdaptiveLoopResponse = {
  insight_doc_after: LivingInsightDocument;
  question_bank_after: QuestionBank;
  loop_result: LoopResult;
  metrics: LoopMetrics;
};

const SCRIPTED_RESPONSES = [
  "Honestly the hard part is not getting calls. We can get customers on the phone, but we keep asking broad questions for too long because nobody has time to turn the first transcript into a sharper next plan.",
  "Context is scattered. Sales notes live in the CRM, support has Slack threads, and I have call notes in docs, so none of that is in front of me when I am writing the next interview.",
  "If an agent proposed the next question bank, I would need it to show me what changed, why it changed, and what evidence it came from before I would trust it.",
];

const API_WS_BASE =
  process.env.NEXT_PUBLIC_API_WS_URL ?? "ws://localhost:8001";
const API_HTTP_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";
const ADAPTIVE_LOOP_QUERY = "mode=auto";

function loopEngineLabel(metrics: LoopMetrics): string {
  const resolvedMode = metrics.resolved_mode ?? metrics.mode;
  if (resolvedMode === "claude") return "Claude synthesis";
  if (resolvedMode === "deterministic") return "Deterministic fallback";
  return resolvedMode;
}

function evidenceForQuestion(
  question: QuestionBank["questions"][number],
  evidence: LoopEvidence[],
): LoopEvidence | null {
  const byId = evidence.find((item) => item.question_id === question.id);
  if (byId) return byId;

  return (
    evidence.find((item) =>
      question.grounding.some(
        (grounding) => grounding.includes(item.quote) || item.quote.includes(grounding),
      ),
    ) ?? null
  );
}

// A curated set of Aura-2 American-English voices. Deepgram offers ~36 of
// these (90 total across languages); keep this list in sync with VOICE_CHOICES
// in apps/api/app/deepgram_voice.py. Hera first = the default.
const VOICES: { id: string; label: string; desc: string }[] = [
  { id: "aura-2-hera-en", label: "Hera", desc: "Smooth, warm, pro" },
  { id: "aura-2-andromeda-en", label: "Andromeda", desc: "Casual, expressive" },
  { id: "aura-2-thalia-en", label: "Thalia", desc: "Clear, confident" },
  { id: "aura-2-cora-en", label: "Cora", desc: "Smooth, melodic" },
  { id: "aura-2-helena-en", label: "Helena", desc: "Caring, natural" },
  { id: "aura-2-luna-en", label: "Luna", desc: "Friendly, engaging" },
  { id: "aura-2-athena-en", label: "Athena", desc: "Calm, professional" },
  { id: "aura-2-juno-en", label: "Juno", desc: "Natural, melodic" },
  { id: "aura-2-vesta-en", label: "Vesta", desc: "Expressive, patient" },
  { id: "aura-2-cordelia-en", label: "Cordelia", desc: "Approachable, warm" },
  { id: "aura-2-apollo-en", label: "Apollo", desc: "Confident male" },
  { id: "aura-2-orion-en", label: "Orion", desc: "Approachable male" },
];

export default function VoiceSession() {
  const [status, setStatus] = useState<Status>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [scriptedIdx, setScriptedIdx] = useState(0);
  const [finalTranscript, setFinalTranscript] = useState<Transcript | null>(null);
  const [loopStatus, setLoopStatus] = useState<PipelineStatus>("idle");
  const [reportStatus, setReportStatus] = useState<PipelineStatus>("idle");
  const [adaptiveLoop, setAdaptiveLoop] = useState<AdaptiveLoopResponse | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [sampling, setSampling] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const scriptedResponsesDone = scriptedIdx >= SCRIPTED_RESPONSES.length;
  // Half-duplex gate: while the agent is speaking (or thinking), we stop
  // sending mic audio so its own voice isn't transcribed back into the loop.
  const agentBusyRef = useRef<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  // Streaming TTS playback: the agent's reply arrives as ordered audio chunks
  // (one per sentence). We queue them and play in order so the mic only
  // reopens once the whole reply has finished.
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
  }, [turns]);

  useEffect(() => {
    return () => {
      if (reportUrl) URL.revokeObjectURL(reportUrl);
    };
  }, [reportUrl]);

  const playSample = useCallback((voiceId: string) => {
    setSelectedVoice(voiceId);
    sampleAudioRef.current?.pause();
    setSampling(voiceId);
    const audio = new Audio(`${API_HTTP_BASE}/voice/sample?model=${voiceId}`);
    sampleAudioRef.current = audio;
    const clear = () => setSampling((v) => (v === voiceId ? null : v));
    audio.onended = clear;
    audio.onerror = clear;
    audio.play().catch(clear);
  }, []);

  // Play the next queued chunk; when the queue is empty AND the final chunk of
  // the reply has arrived, reopen the mic (half-duplex).
  const playFromQueue = useCallback(() => {
    const next = audioQueueRef.current.shift();
    if (next === undefined) {
      playingRef.current = false;
      // Only reopen the mic once the whole reply has played, never mid-reply.
      if (finalChunkReceivedRef.current) agentBusyRef.current = false;
      return;
    }
    playingRef.current = true;
    agentBusyRef.current = true; // mute mic while the agent speaks
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

  const runPostInterviewPipeline = useCallback(async (transcript: Transcript) => {
    setAdaptiveLoop(null);
    setLoopStatus("running");
    setReportStatus("idle");
    setErrorMsg("");
    const body = JSON.stringify({ transcript });
    let loopReady = false;

    try {
      const loopResponse = await fetch(
        `${API_HTTP_BASE}/research/run-transcript?${ADAPTIVE_LOOP_QUERY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        },
      );
      if (!loopResponse.ok) {
        throw new Error(`Adaptive loop failed (${loopResponse.status})`);
      }
      const loopPayload = (await loopResponse.json()) as AdaptiveLoopResponse;
      setAdaptiveLoop(loopPayload);
      setLoopStatus("ready");
      loopReady = true;

      setReportStatus("running");
      const reportResponse = await fetch(`${API_HTTP_BASE}/report/from-loop-result.pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loop_result: loopPayload.loop_result }),
      });
      if (!reportResponse.ok) {
        throw new Error(`PDF generation failed (${reportResponse.status})`);
      }
      const blob = await reportResponse.blob();
      setReportUrl(URL.createObjectURL(blob));
      setReportStatus("ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Post-interview pipeline failed.";
      setErrorMsg(message);
      if (loopReady) {
        setReportStatus("error");
      } else {
        setLoopStatus("error");
      }
    }
  }, []);

  const handleMessage = useCallback(
    (msg: ServerMsg) => {
      switch (msg.type) {
        case "ready":
          break;
        case "agent_text":
          // New agent turn begins — mute the mic and reset the audio queue so
          // the mic won't reopen until this reply's final chunk has played.
          agentBusyRef.current = true;
          finalChunkReceivedRef.current = false;
          audioQueueRef.current = [];
          setTurns((t) => [...t, { id: msg.turn_id, speaker: "agent", text: msg.text }]);
          break;
        case "agent_audio":
          enqueueAudio(msg.data, msg.final ?? true);
          break;
        case "transcript_final":
          // User finished a turn — mute the mic until the agent has replied,
          // so the gap while Claude is thinking doesn't capture stray audio.
          agentBusyRef.current = true;
          setTurns((t) => [
            ...t,
            { id: msg.turn_id, speaker: "interviewee", text: msg.text },
          ]);
          break;
        case "session_complete":
          setFinalTranscript(msg.transcript);
          setStatus("done");
          void runPostInterviewPipeline(msg.transcript);
          break;
        case "error":
        case "tts_error":
          // No more audio is coming, so let the queue drain and reopen the mic.
          finalChunkReceivedRef.current = true;
          if (!playingRef.current) agentBusyRef.current = false;
          setErrorMsg(msg.message);
          break;
      }
    },
    [enqueueAudio, runPostInterviewPipeline],
  );

  const connect = useCallback(
    async (scripted: boolean) => {
      setStatus("connecting");
      setTurns([]);
      setScriptedIdx(0);
      setFinalTranscript(null);
      setAdaptiveLoop(null);
      setLoopStatus("idle");
      setReportStatus("idle");
      setReportUrl(null);
      setErrorMsg("");
      // Agent speaks the opening first, so start muted until it finishes.
      agentBusyRef.current = true;

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
        `${API_WS_BASE}/voice/session?contact=maya_chen&scripted=${scripted}&voice=${selectedVoice}`,
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
            // Half-duplex: while the agent is speaking/thinking we send SILENCE
            // (zeros) rather than the real mic. This keeps Deepgram's stream
            // alive (it times out with no audio) while not feeding it the
            // agent's own voice echoing back through the speakers.
            if (!agentBusyRef.current) {
              for (let i = 0; i < input.length; i++) {
                const s = Math.max(-1, Math.min(1, input[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
              }
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
    [handleMessage, stopMic, selectedVoice],
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
    setAdaptiveLoop(null);
    setLoopStatus("idle");
    setReportStatus("idle");
    setReportUrl(null);
    setErrorMsg("");
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      {status === "idle" && (
        <div className="flex flex-col gap-4">
          {/* Voice picker — click a voice to hear a sample; the selected one
              is used for the interview. */}
          <div className="rounded-lg border border-[var(--line)] p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Interviewer voice · click to preview
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {VOICES.map((v) => {
                const active = selectedVoice === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => playSample(v.id)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left transition ${
                      active
                        ? "border-[var(--accent)] bg-[var(--panel-strong)]"
                        : "border-[var(--line)] hover:bg-[var(--panel-strong)]"
                    }`}
                  >
                    <span className="text-base leading-none">
                      {sampling === v.id ? "🔊" : "▶"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {v.label}
                        {active ? (
                          <span className="ml-1 text-[var(--accent)]">✓</span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-[var(--muted)]">
                        {v.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => connect(true)}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Run scripted fallback
            </button>
            <button
              onClick={() => connect(false)}
              className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:bg-[var(--panel-strong)]"
            >
              Start Live (microphone)
            </button>
          </div>
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
            disabled={scriptedResponsesDone}
            className="ml-auto rounded-md bg-[var(--panel-strong)] px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            {scriptedResponsesDone
              ? "All scripted responses sent"
              : `Inject Maya's response (${scriptedIdx + 1}/${SCRIPTED_RESPONSES.length})`}
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
        <div className="space-y-4 rounded-lg border border-[var(--accent)] bg-[var(--panel)] p-4">
          <div>
            <p className="font-semibold text-[var(--accent)]">Interview complete</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{finalTranscript.summary}</p>
            <p className="mt-1 font-mono text-xs text-[var(--muted)]">
              transcript: {finalTranscript.id}
            </p>
          </div>

          <div className="grid gap-2 text-sm md:grid-cols-3">
            <div className="rounded-md border border-[var(--line)] p-3">
              <span className="font-mono text-xs uppercase text-[var(--muted)]">Step 1</span>
              <p className="mt-1 font-semibold">Transcript captured</p>
            </div>
            <div className="rounded-md border border-[var(--line)] p-3">
              <span className="font-mono text-xs uppercase text-[var(--muted)]">Step 2</span>
              <p className="mt-1 font-semibold">
                {loopStatus === "ready"
                  ? "Interview 2 plan ready"
                  : loopStatus === "running"
                    ? "Synthesizing..."
                    : loopStatus === "error"
                      ? "Loop needs attention"
                      : "Waiting"}
              </p>
            </div>
            <div className="rounded-md border border-[var(--line)] p-3">
              <span className="font-mono text-xs uppercase text-[var(--muted)]">Step 3</span>
              <p className="mt-1 font-semibold">
                {reportStatus === "ready"
                  ? "PDF ready"
                  : reportStatus === "running"
                    ? "Rendering PDF..."
                    : reportStatus === "error"
                      ? "PDF needs attention"
                      : "Waiting"}
              </p>
            </div>
          </div>

          {adaptiveLoop && (
            <div className="rounded-md border border-[var(--line)] bg-white p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">Next Meridian Interview Plan</p>
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${
                        (adaptiveLoop.metrics.resolved_mode ?? adaptiveLoop.metrics.mode) === "claude"
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--warn)] text-white"
                      }`}
                    >
                      {loopEngineLabel(adaptiveLoop.metrics)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    Generated from {finalTranscript.turns.length} captured turns for Interview{" "}
                    {adaptiveLoop.question_bank_after.interview_number}; the PDF is rendered from
                    this same loop result.
                  </p>
                  {adaptiveLoop.metrics.fallback_reason && (
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {adaptiveLoop.metrics.fallback_reason}
                    </p>
                  )}
                </div>
                {reportUrl && (
                  <a
                    href={reportUrl}
                    download="meridian-discovery-report.pdf"
                    className="w-fit rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    Download PDF
                  </a>
                )}
              </div>
              <div className="mt-3 space-y-2">
                {adaptiveLoop.question_bank_after.questions.slice(0, 2).map((question) => {
                  const evidence = evidenceForQuestion(question, adaptiveLoop.loop_result.evidence);
                  return (
                    <div key={question.id} className="rounded-md bg-[var(--panel-strong)] p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Generated question
                      </p>
                      <p className="mt-1 text-sm font-medium leading-6">{question.primary}</p>
                      {evidence ? (
                        <div className="mt-3 border-l-2 border-[var(--accent)] pl-3">
                          <p className="text-xs font-semibold text-[var(--accent-ink)]">
                            Evidence quote
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                            "{evidence.quote}"
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                            {evidence.takeaway}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-[var(--muted)]">
                          Why Meridian asks: {question.rationale_gap}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

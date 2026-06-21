# Voice latency → real-time roadmap

Future work to take the live discovery call from **~2.8s** time-to-first-audio
toward **sub-second**, real-time feel. Deferred during the hackathon because
~2.8s is demo-acceptable and the adaptive loop (not voice timbre/latency) is
what wins. Revisit when there's spare time.

## Where we are now (baseline)

Pipeline per turn (all stages serial, each a barrier):

```
mic PCM ─▶ our WS ─▶ FastAPI ─▶ Deepgram STT (endpointing wait)
        ─▶ Claude (Anthropic, full reply) ─▶ Deepgram TTS (batch HTTP)
        ─▶ base64 over our WS ─▶ browser <audio> queue
```

Measured budget to first audio (warm):

| Stage | Time | Notes |
|---|---|---|
| Endpointing (turn detection) | ~800ms | `endpointing=800` in the STT URL |
| STT finalize + transport | ~200ms | the only "Deepgram 300ms" part |
| Claude Haiku generation | ~1000ms | external LLM, full reply before TTS |
| Deepgram **batch** TTS (first sentence) | ~900ms | `POST /v1/speak`, whole-sentence synth |
| transport + browser decode | ~150ms | |
| **Total to first audio** | **~2.8s** | |

Current code:
- Backend TTS: `synthesize_speech()` + `_agent_speak()` in
  `apps/api/app/deepgram_voice.py`. Already **sentence-chunked**: splits the
  reply via `_split_for_tts()`, synthesizes chunks concurrently, emits
  `agent_audio` messages with `seq`/`final`.
- Frontend playback: `enqueueAudio()` / `playFromQueue()` in
  `apps/web/src/components/VoiceSession.tsx` — an `<audio>`-element queue gated
  by `agentBusyRef` (half-duplex) and `finalChunkReceivedRef`.

## Target

First audio in ~700ms–1.2s instead of ~2.8s, by (a) streaming TTS and
(b) overlapping LLM generation with TTS so we don't wait for the whole reply.

---

## Phase 1 — Deepgram streaming TTS (biggest single win, self-contained)

Replace batch `POST /v1/speak` with the streaming TTS WebSocket. Cuts TTS
time-to-first-audio ~1s → ~300ms. **~2.8s → ~2.1s overall.**

### Backend (`deepgram_voice.py`)
- Open `wss://api.deepgram.com/v1/speak?encoding=linear16&sample_rate=24000&model=<voice>`
  with `Authorization: Token <key>`.
- Send `{"type":"Speak","text": <chunk>}` then `{"type":"Flush"}`.
- Receive **raw PCM (linear16) binary frames** as they're generated; forward
  each to the browser over our WS (base64 or binary), tagged with the turn id.
- Send a `{"type":"agent_audio_end","turn_id"}` control message when the last
  PCM frame for the turn has been sent.
- Keep `synthesize_speech()` (batch) as a **fallback** if the streaming WS
  fails — feature-flag via env (e.g. `VOICE_TTS_STREAMING=1`).

### Frontend (`VoiceSession.tsx`) — the hard part
- `<audio>` elements can't play raw PCM. Replace the audio-element queue with a
  **Web Audio playback pipeline**:
  - One `AudioContext` (24kHz).
  - For each PCM frame: convert Int16 → Float32, make an `AudioBuffer`,
    schedule an `AudioBufferSourceNode` back-to-back using a running
    `nextStartTime` cursor (`source.start(nextStartTime); nextStartTime += buffer.duration`).
  - Keep scheduling tight to avoid clicks/gaps between frames.
- **Half-duplex integration:** the mic must stay muted until the agent's audio
  has *finished playing out*, not just finished arriving. Track the scheduled
  `nextStartTime` + the `agent_audio_end` signal; reopen the mic
  (`agentBusyRef.current = false`) only when `audioContext.currentTime` passes
  the last scheduled end time. This replaces the `finalChunkReceivedRef` +
  `onended` logic.

### Gotchas
- Clicks/gaps if chunk scheduling isn't sample-accurate.
- Mic-reopen timing is the riskiest bit — get it wrong and the overlap/echo bug
  returns. Test hard with `endpointing` + barge-in scenarios.
- Third concurrent WebSocket (STT + TTS + browser) — handle open/flush/close/
  disconnect for each.

**Effort:** ~half a day. **Risk:** medium (rewrites the playback path we just
stabilized). Keep batch fallback wired the whole time.

---

## Phase 2 — Stream Claude tokens into TTS (where latency really collapses)

Today we wait for Claude's *entire* reply before any TTS. Instead, stream
Claude's tokens and start synthesizing as soon as the first sentence/clause is
complete — overlapping LLM generation with TTS playback.

### Backend
- Use `client.messages.stream(...)` (Anthropic streaming) in
  `generate_interviewer_response()`.
- Accumulate streamed text; whenever a sentence boundary (`.!?`) is emitted,
  push that sentence into the Phase-1 streaming-TTS WS immediately.
- Net effect: the agent starts *speaking sentence 1* while Claude is still
  *writing sentence 2*. First audio can land ~300–500ms after Claude's first
  sentence instead of after the whole reply.

**Depends on Phase 1.** Combined Phase 1+2 target: first audio ~0.8–1.2s after
end-of-turn (endpointing 800ms still applies; see Phase 3).

**Effort:** ~half a day on top of Phase 1. **Risk:** medium.

---

## Phase 3 — Turn-taking polish (optional, tunable)

- The 800ms `endpointing` is a deliberate wait so mid-sentence pauses don't
  fragment input. Lowering it feels snappier but re-introduces fragmentation.
- Better: switch STT to `interim_results=true` + `utterance_end_ms` and use
  Deepgram's `SpeechStarted` / `UtteranceEnd` events for smarter end-of-turn,
  plus **barge-in** (stop agent audio the moment the user starts speaking).
- Barge-in is much easier once Phase 1 exists (just stop the Web Audio
  scheduler) than with the current `<audio>` queue.

**Effort:** ~half a day. **Risk:** medium (turn-taking is fiddly).

---

## Phase 4 — Alternative: Deepgram Voice Agent API (re-architecture)

Deepgram's managed Voice Agent API co-locates STT + LLM + TTS in one connection,
purpose-built for sub-second turns, with Claude as the BYO LLM.

- **Pro:** likely the fastest path to true real-time; one integration instead of
  three hops.
- **Con:** restructures our "transcript is the seam" design — the loop consumes
  a `Transcript`, and we'd need to make sure the Voice Agent still emits that
  same canonical `Transcript` shape so Joshua's adaptive loop / report pipeline
  is unaffected. Bigger change; evaluate only if Phases 1–2 aren't enough.

---

## Suggested order if revisited

1. **Phase 1** (streaming TTS) — biggest self-contained win, batch fallback kept.
2. **Phase 2** (token-stream Claude → TTS) — the real collapse; needs Phase 1.
3. **Phase 3** (barge-in + smarter endpointing) — polish.
4. **Phase 4** only if 1–3 still feel too slow.

## Guardrails

- Everything behind an env flag with the current batch path as fallback, so a
  glitch never breaks the demo.
- Keep emitting the canonical `Transcript` (the loop's seam) unchanged — none of
  this should touch `packages/research_core` or Joshua's pipeline.
- Re-verify half-duplex (no overlap/echo) after every phase.

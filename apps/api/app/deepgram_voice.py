from __future__ import annotations

import asyncio
import base64
import json
import os
import re
import uuid
from pathlib import Path
from typing import Any

import httpx
from anthropic import AsyncAnthropic
from fastapi import APIRouter, HTTPException, Response, WebSocket, WebSocketDisconnect

from research_core import Contact, Dossier, QuestionBank, Transcript, TranscriptTurn

router = APIRouter(prefix="/voice", tags=["voice"])

ROOT_DIR = Path(__file__).resolve().parents[3]
FIXTURES_DIR = ROOT_DIR / "fixtures"


def _dg_key() -> str:
    return os.environ.get("DEEPGRAM_API_KEY", "")


def _ant_key() -> str:
    return os.environ.get("ANTHROPIC_API_KEY", "")


def _claude_model() -> str:
    return os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5")


# The live interviewer favors speed over depth, so it defaults to Haiku (much
# lower latency). The post-interview loop synthesis still uses _claude_model().
def _voice_model() -> str:
    return os.environ.get("VOICE_CLAUDE_MODEL", "claude-haiku-4-5")


# Aura-2 is Deepgram's newer, more natural/expressive TTS family. Override the
# voice with DEEPGRAM_TTS_MODEL (e.g. aura-2-andromeda-en, aura-2-cora-en).
def _tts_model() -> str:
    return os.environ.get("DEEPGRAM_TTS_MODEL", "aura-2-hera-en")


async def synthesize_speech(text: str, model: str | None = None) -> bytes:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.deepgram.com/v1/speak",
            headers={
                "Authorization": f"Token {_dg_key()}",
                "Content-Type": "application/json",
            },
            json={"text": text},
            params={"model": model or _tts_model()},
        )
        resp.raise_for_status()
        return resp.content


# Voices offered in the picker. Keep in sync with the frontend list.
VOICE_CHOICES = {
    "aura-2-hera-en",
    "aura-2-andromeda-en",
    "aura-2-thalia-en",
    "aura-2-cora-en",
    "aura-2-helena-en",
    "aura-2-luna-en",
    "aura-2-athena-en",
    "aura-2-juno-en",
    "aura-2-vesta-en",
    "aura-2-cordelia-en",
    "aura-2-apollo-en",
    "aura-2-orion-en",
    "aura-asteria-en",
}

SAMPLE_LINE = (
    "Oh, that's such a real tension — the insight arrives after the ship has "
    "already sailed. Walk me through the last time that happened."
)


def _split_for_tts(text: str) -> list[str]:
    """Split a reply into sentence-ish chunks so TTS can stream. Short trailing
    fragments are merged back so we never synthesize a 2-word chunk."""
    text = text.strip()
    if not text:
        return []
    parts = [p.strip() for p in re.findall(r"[^.!?]+[.!?]*", text) if p.strip()]
    chunks: list[str] = []
    for part in parts:
        if chunks and len(part) < 14:
            chunks[-1] = f"{chunks[-1]} {part}"
        else:
            chunks.append(part)
    return chunks or [text]


async def generate_interviewer_response(
    turns: list[TranscriptTurn],
    question_bank: QuestionBank,
    contact: Contact,
    dossier: Dossier,
    question_idx: int,
) -> str:
    client = AsyncAnthropic(api_key=_ant_key())
    first_name = contact.name.split()[0]
    questions_remaining = question_bank.questions[question_idx:]
    recent = turns[-8:]
    transcript_text = "\n".join(
        f"{'YOU' if t.speaker == 'agent' else first_name.upper()}: {t.text}" for t in recent
    )

    hooks = "\n".join(f"- {h}" for h in dossier.personalization_hooks) or "- (nothing on file)"
    pains = ", ".join(dossier.likely_pain_points) if dossier.likely_pain_points else "(unknown)"

    if questions_remaining:
        q = questions_remaining[0]
        probes = ", ".join(q.probes) if q.probes else ""
        directive = f'''Your goal for THIS turn is to get to this topic — but reach it like a real person would, never by reading it aloud:
"{q.primary}"
{f"(Why it matters to you: {q.rationale_gap})" if q.rationale_gap else ""}
{f"(Angles you might probe: {probes})" if probes else ""}

If {first_name}'s last answer was vague or hinted at something deeper, it's completely fine to ask a quick follow-up on THAT instead of jumping ahead — follow the conversation, don't march through a list.'''
    else:
        directive = (
            f"You've covered everything you came to learn. Warmly wrap up: thank {first_name} by name, "
            "reflect back one genuinely interesting thing they shared, and let them know how helpful this was. "
            "Do not ask another question."
        )

    system = f"""You are a senior product researcher running a live discovery call. You're warm, sharp, and genuinely curious — the kind of interviewer who makes people comfortable enough to tell real stories. You are NOT a survey bot, and you never read from a script.

WHO YOU'RE TALKING TO
{contact.name} — {contact.role} at {contact.company}.
{contact.background}

WHAT YOU ALREADY KNOW (weave in naturally, never recite):
{hooks}
Pain points to listen for: {pains}

WHAT YOU'RE TRYING TO UNDERSTAND
{question_bank.research_goal}

{directive}

HOW YOU TALK (spoken aloud on a live call — every extra word adds delay):
- EXTREMELY BRIEF. A tiny reaction (3-6 words) + ONE short question. Aim for ~15 words total, NEVER more than 20. One or two short sentences. No lists, no markdown, no emoji.
- React first with something specific from {first_name}'s OWN words so they feel heard ("So it's the synthesis, not the interviews —").
- Ask exactly ONE question. Never stack two.
- Go for specifics: "Walk me through the last time that happened" beats "Does that happen a lot?"
- Use {first_name}'s name occasionally, not every line.
- Never mention question banks, research goals, scores, or that you're an AI. You're just a person having a real conversation.

EXAMPLES of the right length:
"So volume's the real bottleneck, not synthesis. How many interviews are you running a month?"
"Three weeks to surface that? Walk me through where it got stuck."
"""

    response = await client.messages.create(
        model=_voice_model(),
        max_tokens=70,
        temperature=0.7,
        system=system,
        messages=[
            {
                "role": "user",
                "content": f"Here's the conversation so far:\n\n{transcript_text}\n\nGive your next spoken response.",
            }
        ],
    )
    return response.content[0].text.strip()


async def generate_opening(
    contact: Contact, dossier: Dossier, question_bank: QuestionBank
) -> str:
    """A warm, personal call opening. Falls back to the fixture opening if the
    model is unreachable, so the call always starts cleanly."""
    first_name = contact.name.split()[0]
    hooks = "\n".join(f"- {h}" for h in dossier.personalization_hooks)
    try:
        client = AsyncAnthropic(api_key=_ant_key())
        system = f"""You are a senior product researcher opening a live discovery call. Greet {first_name} warmly by first name, take a sentence to say what you're hoping to learn together, and reference something specific you know about them so it feels personal — then hand it to them with one easy, open question.

WHO THEY ARE: {contact.name}, {contact.role} at {contact.company}. {contact.background}
WHAT YOU KNOW ABOUT THEM:
{hooks}
WHAT YOU WANT TO UNDERSTAND: {question_bank.research_goal}

This is spoken out loud. Warm and natural, 2-3 sentences, ending in one easy open question. No lists, no markdown. Never say you're an AI or mention a 'research goal'."""
        resp = await client.messages.create(
            model=_voice_model(),
            max_tokens=160,
            temperature=0.7,
            system=system,
            messages=[{"role": "user", "content": "Give your spoken opening."}],
        )
        text = resp.content[0].text.strip()
        if text:
            return text
    except Exception:
        pass
    return question_bank.personalized_opening


class VoiceSession:
    def __init__(
        self,
        ws: WebSocket,
        contact: Contact,
        dossier: Dossier,
        question_bank: QuestionBank,
        scripted: bool = False,
        voice: str | None = None,
        use_claude: bool = True,
    ) -> None:
        self.ws = ws
        self.contact = contact
        self.dossier = dossier
        self.question_bank = question_bank
        self.scripted = scripted
        self.voice = voice
        # When False, the agent reads the predetermined script verbatim (no
        # Claude call per turn) — much lower latency, no live adaptation.
        self.use_claude = use_claude
        self.turns: list[TranscriptTurn] = []
        self.question_idx = 0
        self._counter = 0

    def _turn_id(self) -> str:
        self._counter += 1
        return f"t_{self._counter:03d}"

    def _fallback_agent_response(self, question_idx: int) -> str:
        if question_idx >= len(self.question_bank.questions):
            return "Thank you, that gives me what I need for the next synthesis pass."

        question = self.question_bank.questions[question_idx]
        if question_idx == 0:
            return question.primary
        return f"That helps. {question.primary}"

    async def _send(self, payload: dict[str, Any]) -> None:
        await self.ws.send_text(json.dumps(payload))

    async def _agent_speak(self, text: str) -> None:
        turn_id = self._turn_id()
        self.turns.append(
            TranscriptTurn(
                id=turn_id,
                speaker="agent",
                text=text,
                timestamp_seconds=self._counter * 20,
            )
        )
        await self._send({"type": "agent_text", "text": text, "turn_id": turn_id})
        if not _dg_key():
            return

        # Stream TTS sentence-by-sentence: synthesize all chunks concurrently
        # but emit them in order, so the agent starts speaking after the FIRST
        # sentence is ready (~1.5s) instead of waiting for the whole reply.
        chunks = _split_for_tts(text)
        tasks = [asyncio.create_task(synthesize_speech(c, self.voice)) for c in chunks]
        for i, task in enumerate(tasks):
            try:
                audio_bytes = await task
            except Exception as exc:
                await self._send({"type": "tts_error", "message": str(exc)})
                for pending in tasks[i + 1 :]:
                    pending.cancel()
                break
            await self._send(
                {
                    "type": "agent_audio",
                    "data": base64.b64encode(audio_bytes).decode(),
                    "turn_id": turn_id,
                    "seq": i,
                    "final": i == len(tasks) - 1,
                }
            )

    async def _handle_interviewee_turn(self, text: str) -> None:
        turn_id = self._turn_id()
        self.turns.append(
            TranscriptTurn(
                id=turn_id,
                speaker="interviewee",
                text=text,
                timestamp_seconds=self._counter * 20,
            )
        )
        await self._send({"type": "transcript_final", "text": text, "turn_id": turn_id})

        question_idx = self.question_idx
        # Use the live Claude interviewer unless this session opted into the
        # deterministic script (use_claude=False) for lower latency. The
        # deterministic fallback also kicks in automatically when no API key.
        if not self.use_claude or not _ant_key():
            response = self._fallback_agent_response(question_idx)
        else:
            response = await generate_interviewer_response(
                self.turns,
                self.question_bank,
                self.contact,
                self.dossier,
                question_idx,
            )
        await self._agent_speak(response)
        if question_idx < len(self.question_bank.questions):
            self.question_idx += 1

    def _build_transcript(self) -> Transcript:
        return Transcript(
            id=f"live_{uuid.uuid4().hex[:8]}",
            research_goal=self.question_bank.research_goal,
            interview_number=self.question_bank.interview_number,
            interviewee_id=self.contact.id,
            source="fixture" if self.scripted else "deepgram",
            turns=self.turns,
            summary=f"Live interview with {self.contact.name}. {len(self.turns)} turns captured.",
        )

    async def run(self) -> None:
        # Skip the Claude-generated opening in deterministic mode — read the
        # scripted personalized opening straight from the question bank.
        if self.use_claude and _ant_key():
            opening = await generate_opening(self.contact, self.dossier, self.question_bank)
        else:
            opening = self.question_bank.personalized_opening
        await self._send({"type": "ready", "opening": opening})
        await self._agent_speak(opening)

        if self.scripted:
            await self._run_scripted_session()
        else:
            await self._run_deepgram_session()

        transcript = self._build_transcript()
        await self._send(
            {"type": "session_complete", "transcript": transcript.model_dump(mode="json")}
        )

    async def _run_scripted_session(self) -> None:
        try:
            while True:
                raw = await self.ws.receive_text()
                msg = json.loads(raw)
                if msg.get("type") == "end_session":
                    break
                if msg.get("type") == "inject_text" and msg.get("text"):
                    await self._handle_interviewee_turn(msg["text"])
        except WebSocketDisconnect:
            pass

    async def _run_deepgram_session(self) -> None:
        # Connect to Deepgram's live STT WebSocket directly. We send raw 16kHz
        # mono linear16 PCM (the browser captures it via Web Audio), so we tell
        # Deepgram the exact encoding rather than relying on container sniffing.
        from websockets.asyncio.client import connect as ws_connect

        # Turn-taking: enable interim results + utterance_end_ms so Deepgram
        # tells us when the speaker has actually FINISHED (≈1.5s of silence)
        # rather than finalizing on every short mid-sentence pause. We buffer
        # the is_final segments and only emit a turn on UtteranceEnd, so a
        # natural pause mid-answer never cuts the speaker off.
        dg_url = (
            "wss://api.deepgram.com/v1/listen"
            "?encoding=linear16&sample_rate=16000&channels=1"
            "&model=nova-2&language=en-US&smart_format=true"
            "&interim_results=true&utterance_end_ms=1500"
        )

        try:
            dg_ws = await ws_connect(
                dg_url,
                additional_headers={"Authorization": f"Token {_dg_key()}"},
                max_size=None,
            )
        except Exception as exc:
            await self._send(
                {"type": "error", "message": f"Deepgram STT connect failed: {exc}"}
            )
            return

        transcript_queue: asyncio.Queue[str | None] = asyncio.Queue()

        async def from_browser() -> None:
            # Pull mic PCM (and control messages) off the browser socket and
            # forward audio bytes straight to Deepgram.
            try:
                while True:
                    data = await self.ws.receive()
                    if data.get("type") == "websocket.disconnect":
                        break
                    if data.get("bytes") is not None:
                        await dg_ws.send(data["bytes"])
                    elif data.get("text") is not None:
                        msg = json.loads(data["text"])
                        if msg.get("type") == "end_session":
                            break
                        if msg.get("type") == "inject_text" and msg.get("text"):
                            await transcript_queue.put(msg["text"])
            finally:
                try:
                    await dg_ws.send(json.dumps({"type": "CloseStream"}))
                except Exception:
                    pass

        async def from_deepgram() -> None:
            # Accumulate finalized segments and only flush them as one complete
            # turn when Deepgram signals the utterance is over (UtteranceEnd),
            # so a natural pause mid-answer doesn't cut the speaker off.
            buffer: list[str] = []
            try:
                async for raw in dg_ws:
                    evt = json.loads(raw)
                    etype = evt.get("type")
                    if etype == "Results":
                        alt = evt.get("channel", {}).get("alternatives", [{}])[0]
                        text = (alt.get("transcript") or "").strip()
                        if text and evt.get("is_final"):
                            buffer.append(text)
                    elif etype == "UtteranceEnd":
                        if buffer:
                            await transcript_queue.put(" ".join(buffer))
                            buffer = []
            except Exception:
                pass
            finally:
                if buffer:
                    await transcript_queue.put(" ".join(buffer))
                await transcript_queue.put(None)

        async def process_transcripts() -> None:
            while True:
                text = await transcript_queue.get()
                if text is None:
                    break
                await self._handle_interviewee_turn(text)

        consumer = asyncio.create_task(process_transcripts())
        try:
            await asyncio.gather(from_browser(), from_deepgram())
        finally:
            await dg_ws.close()
            await consumer


@router.get("/sample")
async def voice_sample(model: str = "aura-2-thalia-en") -> Response:
    """A short spoken sample of a given voice, for the voice picker."""
    if model not in VOICE_CHOICES:
        raise HTTPException(status_code=400, detail=f"Unknown voice: {model}")
    audio = await synthesize_speech(SAMPLE_LINE, model)
    return Response(
        content=audio,
        media_type="audio/mpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.websocket("/session")
async def voice_session_endpoint(
    ws: WebSocket,
    contact: str = "maya_chen",
    scripted: bool = False,
    voice: str | None = None,
    claude: bool = True,
) -> None:
    contact_slug = contact
    contact = Contact.model_validate(
        json.loads((FIXTURES_DIR / f"contacts/{contact_slug}.json").read_text())
    )
    dossier = Dossier.model_validate(
        json.loads((FIXTURES_DIR / f"dossiers/{contact_slug}.json").read_text())
    )
    question_bank = QuestionBank.model_validate(
        json.loads(
            (FIXTURES_DIR / "question_banks/interview_1_broad.json").read_text()
        )
    )

    selected_voice = voice if voice in VOICE_CHOICES else None

    await ws.accept()
    session = VoiceSession(
        ws,
        contact,
        dossier,
        question_bank,
        scripted=scripted,
        voice=selected_voice,
        use_claude=claude,
    )
    try:
        await session.run()
    except WebSocketDisconnect:
        pass

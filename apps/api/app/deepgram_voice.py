from __future__ import annotations

import asyncio
import base64
import json
import os
import uuid
from pathlib import Path
from typing import Any

import httpx
from anthropic import AsyncAnthropic
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from research_core import Contact, Dossier, QuestionBank, Transcript, TranscriptTurn

router = APIRouter(prefix="/voice", tags=["voice"])

ROOT_DIR = Path(__file__).resolve().parents[3]
FIXTURES_DIR = ROOT_DIR / "fixtures"


def _dg_key() -> str:
    return os.environ.get("DEEPGRAM_API_KEY", "")


def _ant_key() -> str:
    return os.environ.get("ANTHROPIC_API_KEY", "")


async def synthesize_speech(text: str) -> bytes:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.deepgram.com/v1/speak",
            headers={
                "Authorization": f"Token {_dg_key()}",
                "Content-Type": "application/json",
            },
            json={"text": text},
            params={"model": "aura-asteria-en"},
        )
        resp.raise_for_status()
        return resp.content


async def generate_interviewer_response(
    turns: list[TranscriptTurn],
    question_bank: QuestionBank,
    contact: Contact,
    dossier: Dossier,
    question_idx: int,
) -> str:
    client = AsyncAnthropic(api_key=_ant_key())
    questions_remaining = question_bank.questions[question_idx:]
    transcript_text = "\n".join(
        f"{t.speaker.upper()}: {t.text}" for t in turns[-6:]
    )

    if not questions_remaining:
        next_q = "Wrap up the interview gracefully — thank them and close."
    else:
        next_q = questions_remaining[0].primary

    system = f"""You are Meridian, an AI discovery call interviewer.

Interviewee: {contact.name}, {contact.role} at {contact.company}
Research goal: {question_bank.research_goal}

Personalization hooks:
{chr(10).join(f"- {h}" for h in dossier.personalization_hooks)}

Your next question to ask: {next_q}

Rules:
- Keep your response to 2-3 sentences max
- Briefly acknowledge what they just said, then ask the next question
- Sound natural, not robotic
- Ask exactly ONE question"""

    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=150,
        system=system,
        messages=[
            {
                "role": "user",
                "content": f"Transcript so far:\n{transcript_text}\n\nRespond and ask your next question.",
            }
        ],
    )
    return response.content[0].text.strip()


class VoiceSession:
    def __init__(
        self,
        ws: WebSocket,
        contact: Contact,
        dossier: Dossier,
        question_bank: QuestionBank,
        scripted: bool = False,
    ) -> None:
        self.ws = ws
        self.contact = contact
        self.dossier = dossier
        self.question_bank = question_bank
        self.scripted = scripted
        self.turns: list[TranscriptTurn] = []
        self.question_idx = 0
        self._counter = 0

    def _turn_id(self) -> str:
        self._counter += 1
        return f"t_{self._counter:03d}"

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
        try:
            audio_bytes = await synthesize_speech(text)
            await self._send(
                {
                    "type": "agent_audio",
                    "data": base64.b64encode(audio_bytes).decode(),
                    "turn_id": turn_id,
                }
            )
        except Exception as exc:
            await self._send({"type": "tts_error", "message": str(exc)})

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

        if self.question_idx < len(self.question_bank.questions):
            self.question_idx += 1

        response = await generate_interviewer_response(
            self.turns,
            self.question_bank,
            self.contact,
            self.dossier,
            self.question_idx,
        )
        await self._agent_speak(response)

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

        # Note: utterance_end_ms requires interim_results=true, so we use
        # endpointing instead to get is_final segments on speech pauses.
        dg_url = (
            "wss://api.deepgram.com/v1/listen"
            "?encoding=linear16&sample_rate=16000&channels=1"
            "&model=nova-2&language=en-US&smart_format=true"
            "&interim_results=false&endpointing=300"
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
            try:
                async for raw in dg_ws:
                    evt = json.loads(raw)
                    if evt.get("type") != "Results":
                        continue
                    alt = evt.get("channel", {}).get("alternatives", [{}])[0]
                    text = (alt.get("transcript") or "").strip()
                    if text and evt.get("is_final"):
                        await transcript_queue.put(text)
            except Exception:
                pass
            finally:
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


@router.websocket("/session")
async def voice_session_endpoint(
    ws: WebSocket,
    contact: str = "maya_chen",
    scripted: bool = False,
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

    await ws.accept()
    session = VoiceSession(ws, contact, dossier, question_bank, scripted=scripted)
    try:
        await session.run()
    except WebSocketDisconnect:
        pass

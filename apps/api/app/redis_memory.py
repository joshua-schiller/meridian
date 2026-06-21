from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Protocol
import json
import os
import re

from research_core import LivingInsightDocument, LoopResult, QuestionBank


def session_id_for_goal(research_goal: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", research_goal.lower()).strip("-")
    return slug[:72] or "default-research-session"


@dataclass(frozen=True)
class MemoryRead:
    enabled: bool
    provider: str
    session_id: str
    status: str
    retrieved_context_items: int = 0
    context_items: list[dict[str, Any]] = field(default_factory=list)
    insight_doc: LivingInsightDocument | None = None
    latest_question_bank: QuestionBank | None = None
    error: str | None = None

    def to_payload(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "provider": self.provider,
            "session_id": self.session_id,
            "status": self.status,
            "retrieved_context_items": self.retrieved_context_items,
            "context_items": self.context_items,
            "insight_doc_id": self.insight_doc.id if self.insight_doc else None,
            "question_bank_id": self.latest_question_bank.id if self.latest_question_bank else None,
            "error": self.error,
        }


@dataclass(frozen=True)
class MemoryWrite:
    enabled: bool
    provider: str
    session_id: str
    status: str
    persisted: bool = False
    keys: list[str] = field(default_factory=list)
    error: str | None = None

    def to_payload(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "provider": self.provider,
            "session_id": self.session_id,
            "status": self.status,
            "persisted": self.persisted,
            "keys": self.keys,
            "error": self.error,
        }


class ResearchMemory(Protocol):
    provider: str

    def retrieve(self, *, session_id: str, research_goal: str) -> MemoryRead:
        ...

    def persist(
        self,
        *,
        session_id: str,
        loop_result: LoopResult,
        baseline_question_bank: QuestionBank,
    ) -> MemoryWrite:
        ...

    def snapshot(self, *, session_id: str) -> dict[str, Any]:
        ...


class DisabledResearchMemory:
    provider = "disabled"

    def __init__(self, reason: str = "REDIS_URL is not configured.") -> None:
        self.reason = reason

    def retrieve(self, *, session_id: str, research_goal: str) -> MemoryRead:
        return MemoryRead(
            enabled=False,
            provider=self.provider,
            session_id=session_id,
            status="disabled",
            error=self.reason,
        )

    def persist(
        self,
        *,
        session_id: str,
        loop_result: LoopResult,
        baseline_question_bank: QuestionBank,
    ) -> MemoryWrite:
        return MemoryWrite(
            enabled=False,
            provider=self.provider,
            session_id=session_id,
            status="disabled",
            persisted=False,
            error=self.reason,
        )

    def snapshot(self, *, session_id: str) -> dict[str, Any]:
        return {
            "enabled": False,
            "provider": self.provider,
            "session_id": session_id,
            "status": "disabled",
            "error": self.reason,
            "latest_insight_doc": None,
            "latest_question_bank": None,
            "latest_loop_result": None,
            "event_ids": [],
        }


class RedisResearchMemory:
    provider = "redis"

    def __init__(
        self,
        *,
        redis_url: str,
        key_prefix: str = "meridian",
        use_redis_json: bool = False,
    ) -> None:
        self.key_prefix = key_prefix.rstrip(":")
        self.use_redis_json = use_redis_json
        try:
            import redis
        except ImportError as exc:
            raise RuntimeError("Install the `redis` package to enable Redis memory.") from exc

        self.client = redis.Redis.from_url(redis_url, decode_responses=True)

    def retrieve(self, *, session_id: str, research_goal: str) -> MemoryRead:
        try:
            insight_payload = self._get_json(self._key(session_id, "latest_insight_doc"))
            question_bank_payload = self._get_json(self._key(session_id, "latest_question_bank"))
            insight_doc = (
                LivingInsightDocument.model_validate(insight_payload)
                if insight_payload
                else None
            )
            question_bank = (
                QuestionBank.model_validate(question_bank_payload)
                if question_bank_payload
                else None
            )
            context_items = insight_context_items(insight_doc) if insight_doc else []
            return MemoryRead(
                enabled=True,
                provider=self.provider,
                session_id=session_id,
                status="hit" if insight_doc else "miss",
                retrieved_context_items=len(context_items),
                context_items=context_items,
                insight_doc=insight_doc,
                latest_question_bank=question_bank,
            )
        except Exception as exc:
            return MemoryRead(
                enabled=True,
                provider=self.provider,
                session_id=session_id,
                status="error",
                error=str(exc),
            )

    def persist(
        self,
        *,
        session_id: str,
        loop_result: LoopResult,
        baseline_question_bank: QuestionBank,
    ) -> MemoryWrite:
        now = datetime.now(timezone.utc).isoformat()
        keys = {
            "latest_insight_doc": self._key(session_id, "latest_insight_doc"),
            "latest_question_bank": self._key(session_id, "latest_question_bank"),
            "latest_loop_result": self._key(session_id, "latest_loop_result"),
            "baseline_question_bank": self._key(session_id, "baseline_question_bank"),
            "event": self._key(session_id, f"loops:{loop_result.id}"),
            "events": self._key(session_id, "loop_events"),
            "sessions": f"{self.key_prefix}:sessions",
        }
        try:
            self._set_json(
                keys["latest_insight_doc"],
                loop_result.updated_insight_doc.model_dump(mode="json"),
            )
            self._set_json(
                keys["latest_question_bank"],
                loop_result.next_question_bank.model_dump(mode="json"),
            )
            self._set_json(keys["latest_loop_result"], loop_result.model_dump(mode="json"))
            self._set_json(
                keys["baseline_question_bank"],
                baseline_question_bank.model_dump(mode="json"),
            )
            self._set_json(
                keys["event"],
                {
                    "id": loop_result.id,
                    "created_at": now,
                    "transcript_id": loop_result.transcript.id,
                    "insight_doc_id": loop_result.updated_insight_doc.id,
                    "question_bank_id": loop_result.next_question_bank.id,
                },
            )
            self.client.sadd(keys["sessions"], session_id)
            self.client.rpush(keys["events"], loop_result.id)
            return MemoryWrite(
                enabled=True,
                provider=self.provider,
                session_id=session_id,
                status="persisted",
                persisted=True,
                keys=list(keys.values()),
            )
        except Exception as exc:
            return MemoryWrite(
                enabled=True,
                provider=self.provider,
                session_id=session_id,
                status="error",
                persisted=False,
                keys=list(keys.values()),
                error=str(exc),
            )

    def snapshot(self, *, session_id: str) -> dict[str, Any]:
        try:
            event_ids = self.client.lrange(self._key(session_id, "loop_events"), 0, -1)
            return {
                "enabled": True,
                "provider": self.provider,
                "session_id": session_id,
                "status": "ok",
                "latest_insight_doc": self._get_json(self._key(session_id, "latest_insight_doc")),
                "latest_question_bank": self._get_json(
                    self._key(session_id, "latest_question_bank")
                ),
                "latest_loop_result": self._get_json(self._key(session_id, "latest_loop_result")),
                "event_ids": event_ids,
            }
        except Exception as exc:
            return {
                "enabled": True,
                "provider": self.provider,
                "session_id": session_id,
                "status": "error",
                "error": str(exc),
                "latest_insight_doc": None,
                "latest_question_bank": None,
                "latest_loop_result": None,
                "event_ids": [],
            }

    def _key(self, session_id: str, name: str) -> str:
        return f"{self.key_prefix}:session:{session_id}:{name}"

    def _set_json(self, key: str, payload: dict[str, Any]) -> None:
        if self.use_redis_json:
            try:
                self.client.json().set(key, "$", payload)
                return
            except Exception:
                pass
        self.client.set(key, json.dumps(payload))

    def _get_json(self, key: str) -> dict[str, Any] | None:
        if self.use_redis_json:
            try:
                payload = self.client.json().get(key)
                if isinstance(payload, dict):
                    return payload
            except Exception:
                pass

        raw = self.client.get(key)
        if raw is None:
            return None
        if isinstance(raw, bytes):
            raw = raw.decode()
        return json.loads(raw)


class InMemoryResearchMemory:
    provider = "memory"

    def __init__(self) -> None:
        self.sessions: dict[str, dict[str, Any]] = {}

    def retrieve(self, *, session_id: str, research_goal: str) -> MemoryRead:
        session = self.sessions.get(session_id, {})
        insight_payload = session.get("latest_insight_doc")
        bank_payload = session.get("latest_question_bank")
        insight_doc = (
            LivingInsightDocument.model_validate(insight_payload)
            if insight_payload
            else None
        )
        question_bank = QuestionBank.model_validate(bank_payload) if bank_payload else None
        context_items = insight_context_items(insight_doc) if insight_doc else []
        return MemoryRead(
            enabled=True,
            provider=self.provider,
            session_id=session_id,
            status="hit" if insight_doc else "miss",
            retrieved_context_items=len(context_items),
            context_items=context_items,
            insight_doc=insight_doc,
            latest_question_bank=question_bank,
        )

    def persist(
        self,
        *,
        session_id: str,
        loop_result: LoopResult,
        baseline_question_bank: QuestionBank,
    ) -> MemoryWrite:
        session = self.sessions.setdefault(session_id, {"event_ids": []})
        session["latest_insight_doc"] = loop_result.updated_insight_doc.model_dump(mode="json")
        session["latest_question_bank"] = loop_result.next_question_bank.model_dump(mode="json")
        session["latest_loop_result"] = loop_result.model_dump(mode="json")
        session["baseline_question_bank"] = baseline_question_bank.model_dump(mode="json")
        session["event_ids"].append(loop_result.id)
        return MemoryWrite(
            enabled=True,
            provider=self.provider,
            session_id=session_id,
            status="persisted",
            persisted=True,
            keys=[
                "latest_insight_doc",
                "latest_question_bank",
                "latest_loop_result",
                "baseline_question_bank",
                "event_ids",
            ],
        )

    def snapshot(self, *, session_id: str) -> dict[str, Any]:
        session = self.sessions.get(session_id, {})
        return {
            "enabled": True,
            "provider": self.provider,
            "session_id": session_id,
            "status": "ok" if session else "miss",
            "latest_insight_doc": session.get("latest_insight_doc"),
            "latest_question_bank": session.get("latest_question_bank"),
            "latest_loop_result": session.get("latest_loop_result"),
            "event_ids": session.get("event_ids", []),
        }


def insight_context_items(insight_doc: LivingInsightDocument, limit: int = 6) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for theme in insight_doc.themes:
        for finding in theme.findings:
            items.append(
                {
                    "theme_id": theme.id,
                    "theme": theme.label,
                    "finding_id": finding.id,
                    "finding": finding.text,
                    "status": finding.status,
                    "confidence": finding.confidence,
                    "quotes": [
                        quote.model_dump(mode="json")
                        for quote in finding.supporting_quotes[:2]
                    ],
                }
            )
            if len(items) >= limit:
                return items
    return items


def build_memory_store() -> ResearchMemory:
    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        return DisabledResearchMemory()

    try:
        return RedisResearchMemory(
            redis_url=redis_url,
            key_prefix=os.environ.get("REDIS_KEY_PREFIX", "meridian"),
            use_redis_json=os.environ.get("REDIS_USE_JSON", "").lower()
            in {"1", "true", "yes"},
        )
    except RuntimeError as exc:
        return DisabledResearchMemory(str(exc))

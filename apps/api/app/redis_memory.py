from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Protocol
import hashlib
import json
import math
import os
import re
import struct

from research_core import LivingInsightDocument, LoopResult, QuestionBank


VECTOR_DIMENSIONS = 64
VECTOR_LIMIT = 6


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
    vector_status: str = "not_attempted"
    vector_index: str | None = None
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
            "vector_status": self.vector_status,
            "vector_index": self.vector_index,
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
    vector_status: str = "not_attempted"
    vector_items: int = 0
    vector_index: str | None = None
    error: str | None = None

    def to_payload(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "provider": self.provider,
            "session_id": self.session_id,
            "status": self.status,
            "persisted": self.persisted,
            "keys": self.keys,
            "vector_status": self.vector_status,
            "vector_items": self.vector_items,
            "vector_index": self.vector_index,
            "error": self.error,
        }


@dataclass(frozen=True)
class MemoryReset:
    enabled: bool
    provider: str
    session_id: str
    status: str
    deleted_keys: int = 0
    error: str | None = None

    def to_payload(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "provider": self.provider,
            "session_id": self.session_id,
            "status": self.status,
            "deleted_keys": self.deleted_keys,
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

    def reset(self, *, session_id: str) -> MemoryReset:
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
            vector_status="disabled",
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
            vector_status="disabled",
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
            "vector_state": {
                "status": "disabled",
                "key": None,
                "items": 0,
            },
        }

    def reset(self, *, session_id: str) -> MemoryReset:
        return MemoryReset(
            enabled=False,
            provider=self.provider,
            session_id=session_id,
            status="disabled",
            error=self.reason,
        )


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
            vector_status = "miss"
            vector_index = self._vector_set_key(session_id)
            context_items: list[dict[str, Any]] = []
            if insight_doc:
                context_items, vector_status = self._retrieve_vector_context(
                    session_id=session_id,
                    query=research_goal_context(research_goal, insight_doc),
                    fallback_doc=insight_doc,
                    limit=VECTOR_LIMIT,
                )
            return MemoryRead(
                enabled=True,
                provider=self.provider,
                session_id=session_id,
                status="hit" if insight_doc else "miss",
                retrieved_context_items=len(context_items),
                context_items=context_items,
                insight_doc=insight_doc,
                latest_question_bank=question_bank,
                vector_status=vector_status,
                vector_index=vector_index,
            )
        except Exception as exc:
            return MemoryRead(
                enabled=True,
                provider=self.provider,
                session_id=session_id,
                status="error",
                vector_status="error",
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
            vector_status, vector_items, vector_index = self._persist_vector_items(
                session_id=session_id,
                loop_result=loop_result,
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
                vector_status=vector_status,
                vector_items=vector_items,
                vector_index=vector_index,
            )
        except Exception as exc:
            return MemoryWrite(
                enabled=True,
                provider=self.provider,
                session_id=session_id,
                status="error",
                persisted=False,
                keys=list(keys.values()),
                vector_status="error",
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
                "vector_state": self._vector_state(session_id),
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
                "vector_state": {
                    "status": "error",
                    "key": self._vector_set_key(session_id),
                    "items": 0,
                    "error": str(exc),
                },
            }

    def reset(self, *, session_id: str) -> MemoryReset:
        try:
            keys = list(self.client.scan_iter(match=self._key(session_id, "*")))
            keys.extend(self.client.scan_iter(match=f"{self._vector_prefix(session_id)}*"))
            keys.append(self._vector_set_key(session_id))
            deleted = self.client.delete(*keys) if keys else 0
            try:
                self.client.execute_command("FT.DROPINDEX", self._vector_index(session_id))
            except Exception:
                pass
            self.client.srem(f"{self.key_prefix}:sessions", session_id)
            return MemoryReset(
                enabled=True,
                provider=self.provider,
                session_id=session_id,
                status="reset",
                deleted_keys=int(deleted),
            )
        except Exception as exc:
            return MemoryReset(
                enabled=True,
                provider=self.provider,
                session_id=session_id,
                status="error",
                error=str(exc),
            )

    def _key(self, session_id: str, name: str) -> str:
        return f"{self.key_prefix}:session:{session_id}:{name}"

    def _vector_prefix(self, session_id: str) -> str:
        return f"{self.key_prefix}:vector:session:{session_id}:"

    def _vector_set_key(self, session_id: str) -> str:
        return f"{self.key_prefix}:vectorset:session:{session_id}:findings"

    def _vector_index(self, session_id: str) -> str:
        safe_session_id = re.sub(r"[^a-zA-Z0-9_-]+", "_", session_id)
        return f"{self.key_prefix}:idx:{safe_session_id}:findings"

    def _persist_vector_items(
        self,
        *,
        session_id: str,
        loop_result: LoopResult,
    ) -> tuple[str, int, str]:
        items = insight_context_items(loop_result.updated_insight_doc, limit=100)
        vector_set_key = self._vector_set_key(session_id)
        vector_set_status, vector_set_items = self._persist_vector_set_items(
            key=vector_set_key,
            items=items,
        )
        if vector_set_status == "vectorset_indexed":
            return vector_set_status, vector_set_items, vector_set_key

        index_name = self._vector_index(session_id)
        try:
            self._ensure_vector_index(session_id)
        except Exception as exc:
            return f"{vector_set_status}; redisearch_unavailable: {exc}", 0, index_name

        try:
            existing_keys = list(self.client.scan_iter(match=f"{self._vector_prefix(session_id)}*"))
            if existing_keys:
                self.client.delete(*existing_keys)
            for item in items:
                text = vector_item_text(item)
                self.client.hset(
                    f"{self._vector_prefix(session_id)}{item['finding_id']}",
                    mapping={
                        "theme_id": item["theme_id"],
                        "theme": item["theme"],
                        "finding_id": item["finding_id"],
                        "finding": item["finding"],
                        "status": item["status"],
                        "confidence": item["confidence"],
                        "quote": first_quote(item),
                        "embedding": embed_text_bytes(text),
                    },
                )
            return "indexed", len(items), index_name
        except Exception as exc:
            return f"error: {exc}", 0, index_name

    def _persist_vector_set_items(
        self,
        *,
        key: str,
        items: list[dict[str, Any]],
    ) -> tuple[str, int]:
        try:
            self.client.delete(key)
            for item in items:
                item_id = str(item["finding_id"])
                self.client.execute_command(
                    "VADD",
                    key,
                    "VALUES",
                    str(VECTOR_DIMENSIONS),
                    *embed_text_values(vector_item_text(item)),
                    item_id,
                )
                self.client.execute_command(
                    "VSETATTR",
                    key,
                    item_id,
                    json.dumps(
                        {
                            "theme_id": item["theme_id"],
                            "theme": item["theme"],
                            "finding_id": item["finding_id"],
                            "finding": item["finding"],
                            "status": item["status"],
                            "confidence": item["confidence"],
                            "quote": first_quote(item),
                        }
                    ),
                )
            return "vectorset_indexed", len(items)
        except Exception as exc:
            return f"vectorset_unavailable: {exc}", 0

    def _ensure_vector_index(self, session_id: str) -> None:
        index_name = self._vector_index(session_id)
        try:
            self.client.execute_command("FT.INFO", index_name)
            return
        except Exception:
            pass

        self.client.execute_command(
            "FT.CREATE",
            index_name,
            "ON",
            "HASH",
            "PREFIX",
            "1",
            self._vector_prefix(session_id),
            "SCHEMA",
            "theme_id",
            "TEXT",
            "theme",
            "TEXT",
            "finding_id",
            "TEXT",
            "finding",
            "TEXT",
            "status",
            "TEXT",
            "confidence",
            "TEXT",
            "quote",
            "TEXT",
            "embedding",
            "VECTOR",
            "HNSW",
            "6",
            "TYPE",
            "FLOAT32",
            "DIM",
            str(VECTOR_DIMENSIONS),
            "DISTANCE_METRIC",
            "COSINE",
        )

    def _retrieve_vector_context(
        self,
        *,
        session_id: str,
        query: str,
        fallback_doc: LivingInsightDocument,
        limit: int,
    ) -> tuple[list[dict[str, Any]], str]:
        vector_set_items, vector_set_status = self._retrieve_vector_set_context(
            key=self._vector_set_key(session_id),
            query=query,
            limit=limit,
        )
        if vector_set_items:
            return vector_set_items, vector_set_status

        index_name = self._vector_index(session_id)
        try:
            self.client.execute_command("FT.INFO", index_name)
        except Exception as exc:
            return insight_context_items(
                fallback_doc,
                limit=limit,
            ), f"{vector_set_status}; fallback_no_index: {exc}"

        try:
            result = self.client.execute_command(
                "FT.SEARCH",
                index_name,
                f"(*)=>[KNN {limit} @embedding $query_vector AS vector_score]",
                "PARAMS",
                "2",
                "query_vector",
                embed_text_bytes(query),
                "SORTBY",
                "vector_score",
                "RETURN",
                "8",
                "theme_id",
                "theme",
                "finding_id",
                "finding",
                "status",
                "confidence",
                "quote",
                "vector_score",
                "DIALECT",
                "2",
            )
            items = parse_vector_search_result(result)
            if not items:
                return insight_context_items(fallback_doc, limit=limit), "fallback_empty"
            return items, "vector_hit"
        except Exception as exc:
            return insight_context_items(fallback_doc, limit=limit), f"fallback_error: {exc}"

    def _retrieve_vector_set_context(
        self,
        *,
        key: str,
        query: str,
        limit: int,
    ) -> tuple[list[dict[str, Any]], str]:
        try:
            result = self.client.execute_command(
                "VSIM",
                key,
                "VALUES",
                str(VECTOR_DIMENSIONS),
                *embed_text_values(query),
                "COUNT",
                str(limit),
                "WITHSCORES",
            )
            items = parse_vector_set_result(self.client, key, result)
            if not items:
                return [], "vectorset_empty"
            return items, "vectorset_hit"
        except Exception as exc:
            return [], f"vectorset_unavailable: {exc}"

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

    def _vector_state(self, session_id: str) -> dict[str, Any]:
        key = self._vector_set_key(session_id)
        try:
            return {
                "status": "ok",
                "key": key,
                "items": int(self.client.execute_command("VCARD", key)),
                "provider": "redis_vectorset",
            }
        except Exception as exc:
            return {
                "status": "unavailable",
                "key": key,
                "items": 0,
                "provider": "redis_vectorset",
                "error": str(exc),
            }


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
            vector_status="in_memory_context",
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
            vector_status="in_memory_context",
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
            "vector_state": {
                "status": "in_memory_context",
                "key": None,
                "items": 0,
            },
        }

    def reset(self, *, session_id: str) -> MemoryReset:
        existed = session_id in self.sessions
        self.sessions.pop(session_id, None)
        return MemoryReset(
            enabled=True,
            provider=self.provider,
            session_id=session_id,
            status="reset",
            deleted_keys=1 if existed else 0,
        )


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


def research_goal_context(research_goal: str, insight_doc: LivingInsightDocument) -> str:
    open_questions = " ".join(insight_doc.open_questions[:4])
    labels = " ".join(theme.label for theme in insight_doc.themes[:6])
    return f"{research_goal} {labels} {open_questions}"


def vector_item_text(item: dict[str, Any]) -> str:
    return " ".join(
        [
            str(item.get("theme", "")),
            str(item.get("finding", "")),
            first_quote(item),
            str(item.get("status", "")),
            str(item.get("confidence", "")),
        ]
    )


def first_quote(item: dict[str, Any]) -> str:
    quotes = item.get("quotes") or []
    if not quotes:
        return ""
    quote = quotes[0]
    if isinstance(quote, dict):
        return str(quote.get("quote", ""))
    return str(quote)


def embed_text_bytes(text: str) -> bytes:
    values = embed_text(text)
    return struct.pack(f"{VECTOR_DIMENSIONS}f", *values)


def embed_text_values(text: str) -> list[str]:
    return [f"{value:.8f}" for value in embed_text(text)]


def embed_text(text: str) -> list[float]:
    vector = [0.0] * VECTOR_DIMENSIONS
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    for token in tokens:
        digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
        bucket = int.from_bytes(digest[:4], "little") % VECTOR_DIMENSIONS
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[bucket] += sign

    magnitude = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / magnitude for value in vector]


def parse_vector_set_result(client: Any, key: str, result: Any) -> list[dict[str, Any]]:
    if not isinstance(result, list):
        return []

    items: list[dict[str, Any]] = []
    for index in range(0, len(result), 2):
        if index + 1 >= len(result):
            break
        item_id = decode_redis_value(result[index])
        score = decode_redis_value(result[index + 1])
        try:
            attrs_raw = client.execute_command("VGETATTR", key, item_id)
        except Exception:
            attrs_raw = None
        attrs_text = decode_redis_value(attrs_raw) if attrs_raw is not None else "{}"
        try:
            attrs = json.loads(attrs_text)
        except json.JSONDecodeError:
            attrs = {}
        item = {
            "theme_id": attrs.get("theme_id", ""),
            "theme": attrs.get("theme", ""),
            "finding_id": attrs.get("finding_id", item_id),
            "finding": attrs.get("finding", ""),
            "status": attrs.get("status", ""),
            "confidence": attrs.get("confidence", ""),
            "quotes": [{"interviewee": "redis_vectorset", "quote": attrs.get("quote", "")}],
        }
        try:
            item["vector_score"] = float(score)
        except (TypeError, ValueError):
            item["vector_score"] = score
        items.append(item)
    return items


def decode_redis_value(value: Any) -> str:
    if isinstance(value, bytes):
        return value.decode("utf-8")
    return str(value)


def parse_vector_search_result(result: Any) -> list[dict[str, Any]]:
    if not isinstance(result, list) or len(result) < 2:
        return []

    items: list[dict[str, Any]] = []
    for index in range(1, len(result), 2):
        if index + 1 >= len(result):
            break
        fields = result[index + 1]
        if not isinstance(fields, list):
            continue
        parsed = {
            fields[field_index]: fields[field_index + 1]
            for field_index in range(0, len(fields) - 1, 2)
        }
        item = {
            "theme_id": parsed.get("theme_id", ""),
            "theme": parsed.get("theme", ""),
            "finding_id": parsed.get("finding_id", ""),
            "finding": parsed.get("finding", ""),
            "status": parsed.get("status", ""),
            "confidence": parsed.get("confidence", ""),
            "quotes": [{"interviewee": "redis_vector", "quote": parsed.get("quote", "")}],
        }
        if "vector_score" in parsed:
            try:
                item["vector_score"] = float(parsed["vector_score"])
            except (TypeError, ValueError):
                item["vector_score"] = parsed["vector_score"]
        items.append(item)
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

from pathlib import Path
import json
import unittest
import warnings
from unittest.mock import patch

from fastapi.testclient import TestClient

from apps.api.app.main import app
from apps.api.app.redis_memory import InMemoryResearchMemory
from research_core.claude_loop import ClaudeLoopError
from research_core.fixture_io import load_demo_inputs
from research_core.loop import run_adaptive_loop


FIXTURES_DIR = Path(__file__).resolve().parents[3] / "fixtures"


def load_fixture_transcript() -> dict:
    return json.loads((FIXTURES_DIR / "transcripts/interview_1_maya_chen.json").read_text())


class ResearchEndpointTests(unittest.TestCase):
    def test_run_fixture_endpoint_returns_grounded_loop_payload(self) -> None:
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", message="The 'app' shortcut", category=DeprecationWarning)
            client = TestClient(app)

        response = client.post("/research/run-fixture")
        response.raise_for_status()
        payload = response.json()

        self.assertEqual(payload["question_bank_after"]["interview_number"], 2)
        self.assertGreater(
            payload["metrics"]["specificity_after"],
            payload["metrics"]["specificity_before"],
        )
        self.assertEqual(
            payload["metrics"]["grounded_questions"],
            len(payload["question_bank_after"]["questions"]),
        )
        self.assertIn("loop_result", payload)
        self.assertIn("memory", payload)
        self.assertIn("persisted", payload["metrics"])

    def test_claude_mode_without_key_returns_clear_400(self) -> None:
        with warnings.catch_warnings(), patch.dict("os.environ", {}, clear=True):
            warnings.filterwarnings("ignore", message="The 'app' shortcut", category=DeprecationWarning)
            client = TestClient(app)

            response = client.post("/research/run-fixture?mode=claude")

        self.assertEqual(response.status_code, 400)
        self.assertIn("ANTHROPIC_API_KEY", response.json()["detail"])

    def test_auto_mode_without_key_uses_deterministic_loop(self) -> None:
        with warnings.catch_warnings(), patch.dict("os.environ", {}, clear=True):
            warnings.filterwarnings("ignore", message="The 'app' shortcut", category=DeprecationWarning)
            client = TestClient(app)

            response = client.post("/research/run-fixture?mode=auto")

        response.raise_for_status()
        payload = response.json()
        self.assertEqual(payload["loop_result"]["id"], "loop_after_interview_001")
        self.assertEqual(payload["metrics"]["mode"], "deterministic")
        self.assertEqual(payload["metrics"]["requested_mode"], "auto")
        self.assertEqual(payload["metrics"]["resolved_mode"], "deterministic")
        self.assertIn("ANTHROPIC_API_KEY", payload["metrics"]["fallback_reason"])

    def test_auto_mode_falls_back_when_claude_contract_fails(self) -> None:
        contact, dossier, transcript, prior_doc, _ = load_demo_inputs(FIXTURES_DIR)
        fallback_result = run_adaptive_loop(
            transcript=transcript,
            prior_insight_doc=prior_doc,
            contact=contact,
            dossier=dossier,
        )

        with (
            warnings.catch_warnings(),
            patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}, clear=True),
            patch("apps.api.app.main.run_loop") as mocked_run_loop,
        ):
            warnings.filterwarnings("ignore", message="The 'app' shortcut", category=DeprecationWarning)
            mocked_run_loop.side_effect = [
                ClaudeLoopError("Claude response did not match the loop contract."),
                fallback_result,
            ]
            client = TestClient(app)

            response = client.post(
                "/research/run-transcript?mode=auto",
                json={"transcript": load_fixture_transcript()},
            )

        response.raise_for_status()
        payload = response.json()
        self.assertEqual(payload["metrics"]["mode"], "deterministic")
        self.assertEqual(payload["metrics"]["requested_mode"], "auto")
        self.assertIn("Claude loop failed", payload["metrics"]["fallback_reason"])
        self.assertEqual(mocked_run_loop.call_count, 2)

    def test_demo_report_markdown_endpoint_returns_stakeholder_report(self) -> None:
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", message="The 'app' shortcut", category=DeprecationWarning)
            client = TestClient(app)

        response = client.get("/demo/report/markdown")

        response.raise_for_status()
        self.assertEqual(response.headers["content-type"], "text/markdown; charset=utf-8")
        self.assertIn("Meridian Discovery Report", response.text)
        self.assertIn("Next AI Interview Plan", response.text)

    def test_demo_report_pdf_endpoint_returns_pdf(self) -> None:
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", message="The 'app' shortcut", category=DeprecationWarning)
            client = TestClient(app)

        response = client.get("/demo/report.pdf")

        response.raise_for_status()
        self.assertEqual(response.headers["content-type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF"))
        self.assertIn("meridian-discovery-report.pdf", response.headers["content-disposition"])

    def test_run_transcript_endpoint_accepts_canonical_transcript(self) -> None:
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", message="The 'app' shortcut", category=DeprecationWarning)
            client = TestClient(app)

        response = client.post(
            "/research/run-transcript",
            json={"transcript": load_fixture_transcript()},
        )

        response.raise_for_status()
        payload = response.json()
        self.assertEqual(payload["transcript"]["id"], "transcript_interview_001")
        self.assertEqual(payload["question_bank_after"]["interview_number"], 2)
        self.assertEqual(
            payload["metrics"]["grounded_questions"],
            len(payload["question_bank_after"]["questions"]),
        )
        self.assertEqual(payload["memory"]["read"]["status"], "disabled")

    def test_run_transcript_persists_loop_payload_to_memory_store(self) -> None:
        memory = InMemoryResearchMemory()
        session_id = "test-session"
        with (
            warnings.catch_warnings(),
            patch("apps.api.app.main.get_memory_store", return_value=memory),
        ):
            warnings.filterwarnings("ignore", message="The 'app' shortcut", category=DeprecationWarning)
            client = TestClient(app)

            response = client.post(
                "/research/run-transcript",
                json={"session_id": session_id, "transcript": load_fixture_transcript()},
            )
            state = client.get(f"/research/sessions/{session_id}")

        response.raise_for_status()
        state.raise_for_status()
        payload = response.json()
        snapshot = state.json()
        self.assertEqual(payload["memory"]["read"]["status"], "miss")
        self.assertTrue(payload["memory"]["write"]["persisted"])
        self.assertTrue(payload["metrics"]["persisted"])
        self.assertEqual(payload["metrics"]["memory_writes"], 1)
        self.assertEqual(snapshot["latest_loop_result"]["id"], payload["loop_result"]["id"])
        self.assertEqual(
            snapshot["latest_insight_doc"]["id"],
            payload["insight_doc_after"]["id"],
        )
        self.assertEqual(snapshot["event_ids"], [payload["loop_result"]["id"]])

    def test_run_transcript_retrieves_prior_insight_doc_before_loop(self) -> None:
        memory = InMemoryResearchMemory()
        session_id = "seeded-session"
        contact, dossier, transcript, prior_doc, baseline_bank = load_demo_inputs(FIXTURES_DIR)
        seeded_result = run_adaptive_loop(
            transcript=transcript,
            prior_insight_doc=prior_doc,
            contact=contact,
            dossier=dossier,
        )
        memory.persist(
            session_id=session_id,
            loop_result=seeded_result,
            baseline_question_bank=baseline_bank,
        )

        with (
            warnings.catch_warnings(),
            patch("apps.api.app.main.get_memory_store", return_value=memory),
        ):
            warnings.filterwarnings("ignore", message="The 'app' shortcut", category=DeprecationWarning)
            client = TestClient(app)

            response = client.post(
                "/research/run-transcript",
                json={"session_id": session_id, "transcript": load_fixture_transcript()},
            )

        response.raise_for_status()
        payload = response.json()
        self.assertEqual(payload["memory"]["read"]["status"], "hit")
        self.assertGreater(payload["metrics"]["retrieved_context_items"], 0)
        self.assertEqual(
            payload["insight_doc_before"]["id"],
            seeded_result.updated_insight_doc.id,
        )

    def test_report_from_transcript_endpoints_accept_canonical_transcript(self) -> None:
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", message="The 'app' shortcut", category=DeprecationWarning)
            client = TestClient(app)
        body = {"transcript": load_fixture_transcript()}

        markdown = client.post("/report/from-transcript/markdown", json=body)
        pdf = client.post("/report/from-transcript.pdf", json=body)

        markdown.raise_for_status()
        pdf.raise_for_status()
        self.assertIn("Next AI Interview Plan", markdown.text)
        self.assertTrue(pdf.content.startswith(b"%PDF"))

    def test_report_from_loop_result_endpoint_reuses_existing_loop_payload(self) -> None:
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", message="The 'app' shortcut", category=DeprecationWarning)
            client = TestClient(app)

        loop = client.post(
            "/research/run-transcript",
            json={"transcript": load_fixture_transcript()},
        )
        loop.raise_for_status()

        pdf = client.post(
            "/report/from-loop-result.pdf",
            json={"loop_result": loop.json()["loop_result"]},
        )

        pdf.raise_for_status()
        self.assertEqual(pdf.headers["content-type"], "application/pdf")
        self.assertTrue(pdf.content.startswith(b"%PDF"))

    def test_demo_sequence_runs_two_interviews_and_uses_memory_between_them(self) -> None:
        memory = InMemoryResearchMemory()
        session_id = "sequence-test"
        with (
            warnings.catch_warnings(),
            patch("apps.api.app.main.get_memory_store", return_value=memory),
        ):
            warnings.filterwarnings("ignore", message="The 'app' shortcut", category=DeprecationWarning)
            client = TestClient(app)

            response = client.post(
                f"/demo/run-sequence?mode=deterministic&session_id={session_id}"
            )

        response.raise_for_status()
        payload = response.json()

        self.assertEqual(payload["session_id"], session_id)
        self.assertEqual(payload["metrics"]["interviews_run"], 2)
        self.assertEqual(len(payload["loops"]), 2)
        self.assertEqual(payload["loops"][0]["question_bank_after"]["interview_number"], 2)
        self.assertEqual(payload["loops"][0]["question_bank_after"]["for_interviewee"], "pm_002")
        self.assertEqual(payload["loops"][1]["question_bank_after"]["interview_number"], 3)
        self.assertEqual(payload["metrics"]["memory_read_statuses"], ["miss", "hit"])
        self.assertEqual(payload["metrics"]["memory_write_statuses"], ["persisted", "persisted"])
        self.assertGreaterEqual(payload["metrics"]["confirmed_findings"], 1)
        self.assertGreater(payload["metrics"]["retrieved_context_items"][1], 0)
        self.assertIn("Noah", payload["loops"][0]["question_bank_after"]["personalized_opening"])
        self.assertIn(
            "Generated after 2 Meridian-conducted interviews",
            payload["report_markdown"],
        )
        self.assertEqual(payload["memory_state"]["event_ids"], [
            "loop_after_interview_001",
            "loop_after_interview_002",
        ])

    def test_demo_sequence_report_pdf_returns_accumulated_pdf(self) -> None:
        memory = InMemoryResearchMemory()
        with (
            warnings.catch_warnings(),
            patch("apps.api.app.main.get_memory_store", return_value=memory),
        ):
            warnings.filterwarnings("ignore", message="The 'app' shortcut", category=DeprecationWarning)
            client = TestClient(app)

            response = client.post(
                "/demo/run-sequence/report.pdf?mode=deterministic&session_id=sequence-pdf-test"
            )

        response.raise_for_status()
        self.assertEqual(response.headers["content-type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF"))
        self.assertIn(
            "meridian-sequence-report.pdf",
            response.headers["content-disposition"],
        )

    def test_scripted_voice_session_emits_canonical_transcript_without_keys(self) -> None:
        with warnings.catch_warnings(), patch.dict("os.environ", {}, clear=True):
            warnings.filterwarnings("ignore", message="The 'app' shortcut", category=DeprecationWarning)
            client = TestClient(app)

            with client.websocket_connect("/voice/session?contact=maya_chen&scripted=true") as ws:
                self.assertEqual(ws.receive_json()["type"], "ready")
                opening = ws.receive_json()
                self.assertEqual(opening["type"], "agent_text")

                ws.send_json(
                    {
                        "type": "inject_text",
                        "text": "Synthesis takes too long, so our next interview rarely gets sharper.",
                    }
                )
                self.assertEqual(ws.receive_json()["type"], "transcript_final")
                follow_up = ws.receive_json()
                self.assertEqual(follow_up["type"], "agent_text")
                self.assertIn("What makes discovery research difficult", follow_up["text"])

                ws.send_json({"type": "end_session"})
                complete = ws.receive_json()

        self.assertEqual(complete["type"], "session_complete")
        transcript = complete["transcript"]
        self.assertEqual(transcript["source"], "fixture")
        self.assertEqual(transcript["interviewee_id"], "pm_001")
        self.assertGreaterEqual(len(transcript["turns"]), 3)


if __name__ == "__main__":
    unittest.main()

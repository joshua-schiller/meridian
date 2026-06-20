from pathlib import Path
import json
import unittest
import warnings
from unittest.mock import patch

from fastapi.testclient import TestClient

from apps.api.app.main import app


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

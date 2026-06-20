import unittest
import warnings
from unittest.mock import patch

from fastapi.testclient import TestClient

from apps.api.app.main import app


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


if __name__ == "__main__":
    unittest.main()

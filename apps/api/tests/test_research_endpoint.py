import unittest
import warnings

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


if __name__ == "__main__":
    unittest.main()

from pathlib import Path
import json
import unittest
from unittest.mock import patch

from research_core.claude_loop import (
    ClaudeLoopConfig,
    ClaudeLoopError,
    build_claude_loop_prompt,
    run_claude_adaptive_loop,
)
from research_core.fixture_io import load_demo_inputs
from research_core.loop import run_adaptive_loop
from research_core.pipeline import run_loop


FIXTURES_DIR = Path(__file__).resolve().parents[3] / "fixtures"


class StaticClaudeClient:
    def __init__(self, response: str) -> None:
        self.response = response
        self.last_prompt: str | None = None
        self.last_model: str | None = None

    def create_message(
        self,
        *,
        model: str,
        max_tokens: int,
        system: str,
        user_prompt: str,
    ) -> str:
        self.last_model = model
        self.last_prompt = user_prompt
        return self.response


class ClaudeLoopTests(unittest.TestCase):
    def test_claude_loop_validates_mocked_contract(self) -> None:
        contact, dossier, transcript, prior_doc, _ = load_demo_inputs(FIXTURES_DIR)
        deterministic = run_adaptive_loop(
            transcript=transcript,
            prior_insight_doc=prior_doc,
            contact=contact,
            dossier=dossier,
        )
        response = json.dumps(
            {
                "updated_insight_doc": deterministic.updated_insight_doc.model_dump(mode="json"),
                "next_question_bank": deterministic.next_question_bank.model_dump(mode="json"),
                "evidence": [item.model_dump(mode="json") for item in deterministic.evidence],
                "summary": "Claude regenerated a grounded question bank.",
            }
        )
        client = StaticClaudeClient(f"```json\n{response}\n```")

        result = run_claude_adaptive_loop(
            transcript=transcript,
            prior_insight_doc=prior_doc,
            contact=contact,
            dossier=dossier,
            client=client,
            config=ClaudeLoopConfig(api_key="test-key", model="claude-test", max_tokens=1024),
        )

        self.assertEqual(result.next_question_bank.interview_number, 2)
        self.assertTrue(all(question.grounding for question in result.next_question_bank.questions))
        self.assertEqual(client.last_model, "claude-test")
        self.assertIsNotNone(client.last_prompt)
        self.assertIn("required_response_shape", client.last_prompt or "")

    def test_claude_loop_rejects_ungrounded_question(self) -> None:
        contact, dossier, transcript, prior_doc, _ = load_demo_inputs(FIXTURES_DIR)
        deterministic = run_adaptive_loop(
            transcript=transcript,
            prior_insight_doc=prior_doc,
            contact=contact,
            dossier=dossier,
        )
        invalid_bank = deterministic.next_question_bank.model_copy(deep=True)
        invalid_bank.questions[0].grounding = []
        response = json.dumps(
            {
                "updated_insight_doc": deterministic.updated_insight_doc.model_dump(mode="json"),
                "next_question_bank": invalid_bank.model_dump(mode="json"),
                "evidence": [item.model_dump(mode="json") for item in deterministic.evidence],
                "summary": "Invalid ungrounded response.",
            }
        )

        with self.assertRaises(ClaudeLoopError):
            run_claude_adaptive_loop(
                transcript=transcript,
                prior_insight_doc=prior_doc,
                contact=contact,
                dossier=dossier,
                client=StaticClaudeClient(response),
                config=ClaudeLoopConfig(api_key="test-key"),
            )

    def test_auto_mode_uses_deterministic_without_key(self) -> None:
        contact, dossier, transcript, prior_doc, _ = load_demo_inputs(FIXTURES_DIR)

        with patch.dict("os.environ", {}, clear=True):
            result = run_loop(
                transcript=transcript,
                prior_insight_doc=prior_doc,
                contact=contact,
                dossier=dossier,
                mode="auto",
            )

        self.assertEqual(result.id, "loop_after_interview_001")

    def test_prompt_contains_transcript_and_prior_doc(self) -> None:
        contact, dossier, transcript, prior_doc, _ = load_demo_inputs(FIXTURES_DIR)

        prompt = build_claude_loop_prompt(
            transcript=transcript,
            prior_insight_doc=prior_doc,
            contact=contact,
            dossier=dossier,
            next_interviewee_id="pm_002_pending",
        )

        self.assertIn(transcript.id, prompt)
        self.assertIn(prior_doc.id, prompt)
        self.assertIn("QuestionBank JSON", prompt)


if __name__ == "__main__":
    unittest.main()

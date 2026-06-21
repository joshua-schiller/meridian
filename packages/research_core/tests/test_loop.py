from pathlib import Path
import tempfile
import unittest

from research_core import LivingInsightDocument, LoopResult, QuestionBank
from research_core.fixture_io import (
    load_demo_inputs,
    load_demo_sequence_inputs,
    write_loop_artifacts,
)
from research_core.loop import average_specificity, run_adaptive_loop


FIXTURES_DIR = Path(__file__).resolve().parents[3] / "fixtures"


class AdaptiveLoopTests(unittest.TestCase):
    def test_fixture_loop_generates_grounded_next_question_bank(self) -> None:
        contact, dossier, transcript, prior_doc, baseline_bank = load_demo_inputs(FIXTURES_DIR)

        result = run_adaptive_loop(
            transcript=transcript,
            prior_insight_doc=prior_doc,
            contact=contact,
            dossier=dossier,
        )

        self.assertIsInstance(result, LoopResult)
        self.assertEqual(result.next_question_bank.interview_number, 2)
        self.assertGreater(
            average_specificity(result.next_question_bank),
            average_specificity(baseline_bank),
        )
        self.assertGreaterEqual(len(result.updated_insight_doc.themes), 4)
        self.assertTrue(
            any("Show me what changed" in evidence.quote for evidence in result.evidence),
            "trust evidence from Interview 1 should be preserved",
        )
        self.assertTrue(
            all(question.grounding for question in result.next_question_bank.questions),
            "every generated question should cite Interview 1 grounding",
        )

    def test_artifacts_validate_against_contracts(self) -> None:
        contact, dossier, transcript, prior_doc, _ = load_demo_inputs(FIXTURES_DIR)
        result = run_adaptive_loop(
            transcript=transcript,
            prior_insight_doc=prior_doc,
            contact=contact,
            dossier=dossier,
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            written = write_loop_artifacts(Path(temp_dir), result)

            loop_result = LoopResult.model_validate_json((Path(temp_dir) / "loop_result.json").read_text())
            updated_doc = LivingInsightDocument.model_validate_json(
                (Path(temp_dir) / "updated_insight_doc.json").read_text()
            )
            question_bank = QuestionBank.model_validate_json(
                (Path(temp_dir) / "next_question_bank.json").read_text()
            )

        self.assertEqual(len(written), 3)
        self.assertEqual(loop_result.id, result.id)
        self.assertEqual(updated_doc.id, result.updated_insight_doc.id)
        self.assertEqual(question_bank.id, result.next_question_bank.id)

    def test_second_interview_confirms_existing_findings(self) -> None:
        contacts, dossiers, transcripts, prior_doc, _ = load_demo_sequence_inputs(FIXTURES_DIR)

        first_result = run_adaptive_loop(
            transcript=transcripts[0],
            prior_insight_doc=prior_doc,
            contact=contacts[0],
            dossier=dossiers[0],
            next_contact=contacts[1],
            next_dossier=dossiers[1],
            next_interviewee_id=contacts[1].id,
        )
        second_result = run_adaptive_loop(
            transcript=transcripts[1],
            prior_insight_doc=first_result.updated_insight_doc,
            contact=contacts[1],
            dossier=dossiers[1],
            next_interviewee_id="pm_003_pending",
        )

        findings = {
            finding.id: finding
            for theme in second_result.updated_insight_doc.themes
            for finding in theme.findings
        }
        synthesis_finding = findings["synthesis_not_scheduling"]

        self.assertEqual(synthesis_finding.status, "confirmed")
        self.assertEqual(synthesis_finding.confidence, "high")
        self.assertEqual(
            {quote.interviewee for quote in synthesis_finding.supporting_quotes},
            {"pm_001", "pm_002"},
        )
        self.assertEqual(second_result.next_question_bank.interview_number, 3)
        self.assertEqual(first_result.next_question_bank.for_interviewee, contacts[1].id)
        self.assertIn("Noah", first_result.next_question_bank.personalized_opening)
        self.assertIn(
            "Recently led a sprint review",
            first_result.next_question_bank.personalized_opening,
        )


if __name__ == "__main__":
    unittest.main()

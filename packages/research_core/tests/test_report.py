from pathlib import Path
import unittest

from research_core.fixture_io import load_demo_inputs, load_demo_sequence_inputs
from research_core.loop import run_adaptive_loop
from research_core.report import (
    build_sequence_report,
    build_stakeholder_report,
    render_report_pdf,
    report_to_markdown,
)


FIXTURES_DIR = Path(__file__).resolve().parents[3] / "fixtures"


class ReportTests(unittest.TestCase):
    def test_report_markdown_frames_ai_interviewer_plan(self) -> None:
        contact, dossier, transcript, prior_doc, baseline_bank = load_demo_inputs(FIXTURES_DIR)
        result = run_adaptive_loop(
            transcript=transcript,
            prior_insight_doc=prior_doc,
            contact=contact,
            dossier=dossier,
        )

        report = build_stakeholder_report(
            loop_result=result,
            contact=contact,
            dossier=dossier,
            baseline_question_bank=baseline_bank,
        )
        markdown = report_to_markdown(report)

        self.assertIn("Meridian Discovery Report", markdown)
        self.assertIn("Next AI Interview Plan", markdown)
        self.assertIn("AI interviewer's next-call plan", markdown)
        self.assertIn("Synthesis, not scheduling", markdown)
        self.assertIn(result.next_question_bank.questions[0].primary, markdown)

    def test_report_pdf_renders_valid_pdf_bytes(self) -> None:
        contact, dossier, transcript, prior_doc, baseline_bank = load_demo_inputs(FIXTURES_DIR)
        result = run_adaptive_loop(
            transcript=transcript,
            prior_insight_doc=prior_doc,
            contact=contact,
            dossier=dossier,
        )
        report = build_stakeholder_report(
            loop_result=result,
            contact=contact,
            dossier=dossier,
            baseline_question_bank=baseline_bank,
        )

        pdf_bytes = render_report_pdf(report)

        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        self.assertGreater(len(pdf_bytes), 5000)

    def test_sequence_report_accumulates_multiple_interviews(self) -> None:
        contacts, dossiers, transcripts, prior_doc, baseline_bank = load_demo_sequence_inputs(
            FIXTURES_DIR
        )
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

        report = build_sequence_report(
            loop_results=[first_result, second_result],
            contacts=contacts,
            baseline_question_bank=baseline_bank,
        )
        markdown = report_to_markdown(report)
        pdf_bytes = render_report_pdf(report)

        self.assertIn("Generated after 2 Meridian-conducted interviews", markdown)
        self.assertIn("Interview 1", markdown)
        self.assertIn("Interview 2", markdown)
        self.assertIn("confirmed", markdown)
        self.assertIn("Interview 3", markdown)
        self.assertIn("The question bank is Meridian's next AI interview plan", markdown)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        self.assertGreater(len(pdf_bytes), 5000)


if __name__ == "__main__":
    unittest.main()

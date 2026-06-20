from pathlib import Path
import unittest

from research_core.fixture_io import load_demo_inputs
from research_core.loop import run_adaptive_loop
from research_core.report import build_stakeholder_report, render_report_pdf, report_to_markdown


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


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

from pathlib import Path
import argparse

from .fixture_io import load_demo_inputs, write_loop_artifacts
from .loop import average_specificity, run_adaptive_loop


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run the Meridian fixture adaptive loop.")
    parser.add_argument("fixtures_dir", nargs="?", default="fixtures", help="Path to fixture root.")
    parser.add_argument(
        "--output-dir",
        default="artifacts/demo_run",
        help="Directory for loop_result.json, updated_insight_doc.json, and next_question_bank.json.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    fixtures_dir = Path(args.fixtures_dir)
    output_dir = Path(args.output_dir)

    contact, dossier, transcript, prior_insight_doc, baseline_question_bank = load_demo_inputs(fixtures_dir)
    result = run_adaptive_loop(
        transcript=transcript,
        prior_insight_doc=prior_insight_doc,
        contact=contact,
        dossier=dossier,
    )
    written = write_loop_artifacts(output_dir, result)

    baseline_score = average_specificity(baseline_question_bank)
    next_score = average_specificity(result.next_question_bank)
    print(result.summary)
    print(f"specificity: {baseline_score:.2f} -> {next_score:.2f}")
    for path in written:
        print(f"wrote {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

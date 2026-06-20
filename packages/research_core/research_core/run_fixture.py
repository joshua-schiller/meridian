from __future__ import annotations

from pathlib import Path
import argparse
import sys

from .claude_loop import ClaudeLoopError
from .fixture_io import load_demo_inputs, write_loop_artifacts
from .loop import average_specificity
from .pipeline import LoopMode, run_loop


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run the Meridian fixture adaptive loop.")
    parser.add_argument("fixtures_dir", nargs="?", default="fixtures", help="Path to fixture root.")
    parser.add_argument(
        "--output-dir",
        default="artifacts/demo_run",
        help="Directory for loop_result.json, updated_insight_doc.json, and next_question_bank.json.",
    )
    parser.add_argument(
        "--mode",
        choices=["deterministic", "claude", "auto"],
        default="deterministic",
        help="Loop generator. `auto` uses Claude only when ANTHROPIC_API_KEY is set.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    fixtures_dir = Path(args.fixtures_dir)
    output_dir = Path(args.output_dir)

    contact, dossier, transcript, prior_insight_doc, baseline_question_bank = load_demo_inputs(fixtures_dir)
    mode: LoopMode = args.mode
    try:
        result = run_loop(
            transcript=transcript,
            prior_insight_doc=prior_insight_doc,
            contact=contact,
            dossier=dossier,
            mode=mode,
        )
    except ClaudeLoopError as exc:
        print(f"Claude loop failed: {exc}", file=sys.stderr)
        return 1
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

from pathlib import Path
import json
import sys

from .models import Contact, Dossier, LivingInsightDocument, QuestionBank, Transcript


FIXTURE_MODELS = {
    "contacts/maya_chen.json": Contact,
    "contacts/noah_singh.json": Contact,
    "dossiers/maya_chen.json": Dossier,
    "dossiers/noah_singh.json": Dossier,
    "transcripts/interview_1_maya_chen.json": Transcript,
    "transcripts/interview_2_noah_singh.json": Transcript,
    "question_banks/interview_1_broad.json": QuestionBank,
    "question_banks/interview_2_expected.json": QuestionBank,
    "insights/initial.json": LivingInsightDocument,
    "insights/after_interview_1.json": LivingInsightDocument,
}


def validate_fixture(fixtures_dir: Path, relative_path: str) -> str:
    model = FIXTURE_MODELS[relative_path]
    data = json.loads((fixtures_dir / relative_path).read_text())
    model.model_validate(data)
    return relative_path


def main() -> int:
    fixtures_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("fixtures")
    missing = [path for path in FIXTURE_MODELS if not (fixtures_dir / path).exists()]
    if missing:
        for path in missing:
            print(f"missing fixture: {path}", file=sys.stderr)
        return 1

    for relative_path in FIXTURE_MODELS:
        print(f"validated {validate_fixture(fixtures_dir, relative_path)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

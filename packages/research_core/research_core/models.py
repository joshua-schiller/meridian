from typing import Literal

from pydantic import BaseModel, Field


InsightStatus = Literal["confirmed", "challenged", "nuanced", "open"]
Confidence = Literal["high", "medium", "low"]
TranscriptSource = Literal["fixture", "deepgram", "uploaded"]
Speaker = Literal["agent", "interviewee"]


class Contact(BaseModel):
    id: str
    name: str
    role: str
    company: str
    background: str


class Dossier(BaseModel):
    id: str
    contact_id: str
    summary: str
    personalization_hooks: list[str] = Field(default_factory=list)
    likely_pain_points: list[str] = Field(default_factory=list)


class TranscriptTurn(BaseModel):
    id: str
    speaker: Speaker
    text: str
    timestamp_seconds: int = Field(ge=0)


class Transcript(BaseModel):
    id: str
    research_goal: str
    interview_number: int = Field(ge=1)
    interviewee_id: str
    source: TranscriptSource
    turns: list[TranscriptTurn]
    summary: str


class Question(BaseModel):
    id: str
    primary: str
    rationale_gap: str
    probes: list[str] = Field(default_factory=list)
    specificity_score: float = Field(ge=0.0, le=1.0)
    grounding: list[str] = Field(default_factory=list)


class QuestionBank(BaseModel):
    id: str
    research_goal: str
    interview_number: int = Field(ge=1)
    for_interviewee: str
    personalized_opening: str
    questions: list[Question]


class SupportingQuote(BaseModel):
    interviewee: str
    quote: str


class Finding(BaseModel):
    id: str
    text: str
    status: InsightStatus
    confidence: Confidence
    supporting_quotes: list[SupportingQuote] = Field(default_factory=list)


class InsightTheme(BaseModel):
    id: str
    label: str
    findings: list[Finding] = Field(default_factory=list)


class Contradiction(BaseModel):
    between: list[str]
    description: str


class LivingInsightDocument(BaseModel):
    id: str
    research_goal: str
    themes: list[InsightTheme] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)
    contradictions: list[Contradiction] = Field(default_factory=list)

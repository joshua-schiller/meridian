"use client";

import { FormEvent, useState } from "react";

import type { Campaign } from "@/lib/campaigns";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type CampaignChatProps = {
  campaign: Campaign;
};

function createMessageId(role: ChatMessage["role"]) {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function answerCampaignQuestion(campaign: Campaign, prompt: string) {
  const normalizedPrompt = prompt.toLowerCase();
  const completedInterviews = campaign.interviews.filter(
    (interview) => interview.status === "completed",
  );
  const nextInterview = campaign.interviews.find((interview) => interview.status === "scheduled");

  if (normalizedPrompt.includes("goal")) {
    return campaign.oneLineGoal;
  }

  if (normalizedPrompt.includes("finding") || normalizedPrompt.includes("learn")) {
    return campaign.highLevelFindings;
  }

  if (normalizedPrompt.includes("interview") || normalizedPrompt.includes("participant")) {
    const completedSummary =
      completedInterviews.length > 0
        ? completedInterviews
            .map(
              (interview) =>
                `Interview ${interview.interviewNumber}: ${interview.participant}, ${interview.role} at ${interview.company}. ${interview.summary}`,
            )
            .join("\n")
        : "No interviews have been completed yet.";

    const nextSummary = nextInterview
      ? `\n\nNext up: Interview ${nextInterview.interviewNumber} with ${nextInterview.participant}. ${nextInterview.summary}`
      : "";

    return `${completedSummary}${nextSummary}`;
  }

  if (
    normalizedPrompt.includes("recommend") ||
    normalizedPrompt.includes("next") ||
    normalizedPrompt.includes("action")
  ) {
    return formatList(campaign.report.recommendedNextSteps);
  }

  if (normalizedPrompt.includes("risk") || normalizedPrompt.includes("contradiction")) {
    return formatList(campaign.report.contradictions);
  }

  return `${campaign.highLevelFindings}\n\nRecommended next steps:\n${formatList(
    campaign.report.recommendedNextSteps,
  )}`;
}

export default function CampaignChat({ campaign }: CampaignChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-assistant-message",
      role: "assistant",
      content: `Campaign context loaded for ${campaign.title}.`,
    },
  ]);
  const [prompt, setPrompt] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    const userMessage: ChatMessage = {
      id: createMessageId("user"),
      role: "user",
      content: trimmedPrompt,
    };
    const assistantMessage: ChatMessage = {
      id: createMessageId("assistant"),
      role: "assistant",
      content: answerCampaignQuestion(campaign, trimmedPrompt),
    };

    setMessages((currentMessages) => [...currentMessages, userMessage, assistantMessage]);
    setPrompt("");
  }

  return (
    <section className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--panel)]">
      <div className="border-b border-[var(--line)] px-4 py-3 md:px-5">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Campaign Chat</h2>
      </div>

      <div className="flex max-h-[24rem] flex-col gap-4 overflow-y-auto px-4 py-5 md:px-5">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[44rem] whitespace-pre-line rounded-lg px-4 py-3 text-sm leading-6 ${
              message.role === "user"
                ? "ml-auto bg-[var(--accent)] text-white"
                : "mr-auto border border-[var(--line)] bg-[var(--panel-strong)] text-[var(--foreground)]"
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 border-t border-[var(--line)] px-4 py-4 md:flex-row md:px-5"
      >
        <label className="sr-only" htmlFor="campaign-chat-prompt">
          Ask about this campaign
        </label>
        <input
          id="campaign-chat-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask about findings, interviews, risks, or next steps"
          className="min-h-11 flex-1 rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-wash)]"
        />
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--panel)]"
        >
          Send
        </button>
      </form>
    </section>
  );
}

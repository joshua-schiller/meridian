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
  isPopover?: boolean;
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

export default function CampaignChat({ campaign, isPopover = false }: CampaignChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-assistant-message",
      role: "assistant",
      content: `Campaign context loaded for "${campaign.title}". Ask me anything about the goals, findings, participants, or next steps.`,
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
    <section className={`${isPopover ? "" : "mt-8 border border-slate-200 rounded-2xl shadow-sm"} bg-white overflow-hidden`}>
      {!isPopover && (
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">
            Campaign Co-Pilot Chat
          </h2>
        </div>
      )}

      <div className={`flex flex-col gap-4 overflow-y-auto px-6 py-6 bg-slate-50/20 ${isPopover ? "h-64" : "max-h-[24rem]"}`}>
        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              className={`flex flex-col max-w-[85%] ${isUser ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1 px-1.5">
                {isUser ? "You" : "Meridian AI"}
              </span>
              <div
                className={`whitespace-pre-line px-5 py-3.5 text-sm leading-relaxed shadow-[0_2px_12px_rgba(0,0,0,0.02)] ${
                  isUser
                    ? "rounded-2xl rounded-tr-none bg-[var(--accent)] text-white"
                    : "rounded-2xl rounded-tl-none border border-slate-200 bg-white text-[var(--foreground)]"
                }`}
              >
                {message.content}
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 md:flex-row bg-white"
      >
        <label className="sr-only" htmlFor="campaign-chat-prompt">
          Ask about this campaign
        </label>
        <input
          id="campaign-chat-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask about findings, interviews..."
          className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-blue-100/70"
        />
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent)] hover:bg-[#0855a1] px-5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(10,102,194,0.15)] hover:shadow-[0_4px_16px_rgba(10,102,194,0.25)] transition active:scale-95"
        >
          Send
        </button>
      </form>
    </section>
  );
}

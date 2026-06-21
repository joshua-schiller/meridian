"use client";

import { useEffect, useState } from "react";

import type { CampaignReportFinding } from "@/lib/campaigns";

export const PULSE_CAMPAIGN_SYNC_EVENT = "meridian:pulse-campaign-sync";

// Sync stage: 0 = base (8 interviews), 1 = +Lucia (9), 2 = +Derek (10).
function usePulseCampaignSync(enabled: boolean) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    function handleSync(event: Event) {
      const detail = (event as CustomEvent<{ stage?: number }>).detail;
      if (detail && typeof detail.stage === "number") {
        setStage(detail.stage);
      } else {
        setStage((prev) => prev + 1);
      }
    }

    window.addEventListener(PULSE_CAMPAIGN_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(PULSE_CAMPAIGN_SYNC_EVENT, handleSync);
  }, [enabled]);

  return stage;
}

export function CampaignHighLevelFindingsText({
  campaignId,
  initialText,
  syncedText,
  synced2Text,
}: {
  campaignId: string;
  initialText: string;
  syncedText?: string;
  synced2Text?: string;
}) {
  const stage = usePulseCampaignSync(campaignId === "pulse-adoption" && Boolean(syncedText));
  const text =
    stage >= 2 && synced2Text ? synced2Text : stage >= 1 && syncedText ? syncedText : initialText;

  return <p className="text-sm leading-relaxed text-[var(--muted)]">{text}</p>;
}

export function FindingConfirmationBadge({
  campaignId,
  finding,
  completedCount,
  syncedCompletedCount,
  synced2CompletedCount,
  fallbackRatio,
}: {
  campaignId: string;
  finding: CampaignReportFinding;
  completedCount: number;
  syncedCompletedCount?: number;
  synced2CompletedCount?: number;
  fallbackRatio: string;
}) {
  const stage = usePulseCampaignSync(
    campaignId === "pulse-adoption" &&
      syncedCompletedCount != null &&
      finding.syncedSupportCount != null,
  );

  let denominator = completedCount;
  let supportCount = finding.supportCount;
  if (stage >= 2 && synced2CompletedCount != null && finding.synced2SupportCount != null) {
    denominator = synced2CompletedCount;
    supportCount = finding.synced2SupportCount;
  } else if (stage >= 1 && syncedCompletedCount != null && finding.syncedSupportCount != null) {
    denominator = syncedCompletedCount;
    supportCount = finding.syncedSupportCount;
  }

  const confirmed = supportCount != null ? `${supportCount}/${denominator}` : fallbackRatio;

  return (
    <span className="text-xs font-mono text-[var(--muted)] bg-slate-100/80 px-2 py-0.5 border border-slate-200/40 transition-colors">
      {confirmed} Confirmed
    </span>
  );
}

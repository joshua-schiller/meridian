"use client";

import { useEffect, useState } from "react";

import type { CampaignReportFinding } from "@/lib/campaigns";

export const PULSE_CAMPAIGN_SYNC_EVENT = "meridian:pulse-campaign-sync";

function usePulseCampaignSync(isPulseCampaign: boolean) {
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    if (!isPulseCampaign) return;

    function handleSync() {
      setIsSynced(true);
    }

    window.addEventListener(PULSE_CAMPAIGN_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(PULSE_CAMPAIGN_SYNC_EVENT, handleSync);
  }, [isPulseCampaign]);

  return isSynced;
}

export function CampaignHighLevelFindingsText({
  campaignId,
  initialText,
  syncedText,
}: {
  campaignId: string;
  initialText: string;
  syncedText?: string;
}) {
  const isSynced = usePulseCampaignSync(campaignId === "pulse-adoption" && Boolean(syncedText));

  return (
    <p className="text-sm leading-relaxed text-[var(--muted)]">
      {isSynced && syncedText ? syncedText : initialText}
    </p>
  );
}

export function FindingConfirmationBadge({
  campaignId,
  finding,
  completedCount,
  syncedCompletedCount,
  fallbackRatio,
}: {
  campaignId: string;
  finding: CampaignReportFinding;
  completedCount: number;
  syncedCompletedCount?: number;
  fallbackRatio: string;
}) {
  const isSynced = usePulseCampaignSync(
    campaignId === "pulse-adoption" &&
      syncedCompletedCount != null &&
      finding.syncedSupportCount != null,
  );
  const denominator = isSynced && syncedCompletedCount != null ? syncedCompletedCount : completedCount;
  const supportCount = isSynced && finding.syncedSupportCount != null
    ? finding.syncedSupportCount
    : finding.supportCount;
  const confirmed = supportCount != null ? `${supportCount}/${denominator}` : fallbackRatio;

  return (
    <span className="text-xs font-mono text-[var(--muted)] bg-slate-100/80 px-2 py-0.5 border border-slate-200/40">
      {confirmed} Confirmed
    </span>
  );
}

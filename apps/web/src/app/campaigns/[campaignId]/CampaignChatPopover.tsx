"use client";

import { useState } from "react";
import CampaignChat from "./CampaignChat";
import type { Campaign } from "@/lib/campaigns";

type CampaignChatPopoverProps = {
  campaign: Campaign;
};

export default function CampaignChatPopover({ campaign }: CampaignChatPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[var(--accent)] hover:bg-[#0855a1] text-white px-5 py-3 shadow-[0_8px_30px_rgba(10,102,194,0.25)] hover:shadow-[0_8px_30px_rgba(10,102,194,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer font-bold text-xs uppercase tracking-wider"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        {isOpen ? "Close Co-Pilot" : "Co-Pilot Chat"}
      </button>

      {/* Floating popover chat console */}
      {isOpen && (
        <div className="fixed bottom-22 right-6 z-50 w-96 animate-step-in shadow-2xl rounded-2xl overflow-hidden border border-slate-200">
          <div className="flex justify-between items-center px-4 py-2 bg-slate-50 border-b border-slate-100">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">AI Co-Pilot</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-[10px] font-bold transition"
            >
              ✕
            </button>
          </div>
          {/* Render the chat component without the outer card styles */}
          <div className="bg-white">
            <CampaignChat campaign={campaign} isPopover={true} />
          </div>
        </div>
      )}
    </>
  );
}

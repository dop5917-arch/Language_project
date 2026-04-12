"use client";

import DecksHeaderCreateButton from "@/components/DecksHeaderCreateButton";

export default function DecksHeaderActions() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DecksHeaderCreateButton />
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("open-help-drawer"))}
        aria-label="Справка"
        title="Справка"
        className="inline-flex items-center rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-medium text-[#111111] hover:bg-[#F5F5F5]"
      >
        Справка
      </button>
    </div>
  );
}

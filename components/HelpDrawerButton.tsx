"use client";

export default function HelpDrawerButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("open-help-drawer"))}
      aria-label="Справка"
      title="Справка"
      className="inline-flex items-center rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-medium text-[#111111] transition hover:bg-[#F5F5F5]"
    >
      Справка
    </button>
  );
}

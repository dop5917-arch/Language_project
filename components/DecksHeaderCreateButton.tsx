"use client";

export default function DecksHeaderCreateButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("open-create-deck-modal"))}
      aria-label="Добавить колоду"
      title="Добавить колоду"
      className="inline-flex items-center rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-medium text-[#059669] hover:bg-[#F5F5F5]"
    >
      Добавить колоду
    </button>
  );
}

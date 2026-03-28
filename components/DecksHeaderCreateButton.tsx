"use client";

export default function DecksHeaderCreateButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("open-create-deck-modal"))}
      aria-label="Создать колоду"
      title="Создать колоду"
      className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#059669] text-sm font-bold leading-none text-white shadow-sm hover:bg-[#047857]"
    >
      +
    </button>
  );
}

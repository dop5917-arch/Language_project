"use client";

export default function DecksHeaderCreateButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("open-create-deck-modal"))}
      aria-label="Создать колоду"
      title="Создать колоду"
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-sm font-bold leading-none text-emerald-700 hover:bg-emerald-100"
    >
      +
    </button>
  );
}

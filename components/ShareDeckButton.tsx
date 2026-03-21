"use client";

import { useState } from "react";

type Props = {
  deckId: string;
  className?: string;
  label?: string;
  copiedLabel?: string;
};

export default function ShareDeckButton({
  deckId,
  className,
  label = "Поделиться",
  copiedLabel = "Скопировано"
}: Props) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/decks/${deckId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore clipboard errors silently
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      className={className ?? "w-full rounded border px-3 py-2 text-sm"}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}

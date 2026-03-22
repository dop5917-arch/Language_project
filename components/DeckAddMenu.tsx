"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Props = {
  deckId: string;
};

export default function DeckAddMenu({ deckId }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Open add menu"
        className="rounded border px-3 py-2 text-sm font-semibold"
      >
        +
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-64 space-y-2 rounded-lg border bg-white p-3 shadow-lg">
          <Link
            href={`/decks/${deckId}/add`}
            onClick={() => setOpen(false)}
            className="block rounded border px-3 py-2 text-sm"
          >
            Add
          </Link>
          <Link
            href={`/decks/${deckId}/add-smart`}
            onClick={() => setOpen(false)}
            className="block rounded border px-3 py-2 text-sm"
          >
            Smart Add
          </Link>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import ShareDeckButton from "@/components/ShareDeckButton";

type Props = {
  deckId: string;
  initialName: string;
  cardsCount: number;
  rememberedCount: number;
  remainingCount: number;
  progressPercent: number;
};

export default function DeckCard({
  deckId,
  initialName,
  cardsCount,
  rememberedCount,
  remainingCount,
  progressPercent
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [committedName, setCommittedName] = useState(initialName);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function updateMenuPosition() {
      const rect = menuButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPos({
        top: rect.bottom + 8,
        left: Math.max(12, rect.right - 288)
      });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [menuOpen]);

  async function saveRename() {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(committedName);
      setEditing(false);
      return;
    }
    if (trimmed === committedName) {
      setEditing(false);
      return;
    }

    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed })
      });
      if (!res.ok) throw new Error("Rename failed");
      setCommittedName(trimmed);
      setName(trimmed);
      setEditing(false);
      startTransition(() => router.refresh());
    } catch {
      setName(committedName);
      setEditing(false);
    }
  }

  async function deleteDeck() {
    if (!window.confirm("Delete this deck?")) return;
    try {
      const res = await fetch(`/api/decks/${deckId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      startTransition(() => router.refresh());
    } catch {
      // no-op
    }
  }

  return (
    <div
      ref={cardRef}
      className={`group relative rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm transition hover:border-emerald-300 hover:shadow ${
        menuOpen ? "z-[120]" : "z-0"
      }`}
    >
      <Link href={`/decks/${deckId}`} aria-label={`Open deck ${committedName}`} className="absolute inset-0 rounded-lg" />

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <div className="relative z-10 flex min-w-0 items-center gap-3">
            {editing ? (
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveRename();
                  }
                  if (e.key === "Escape") {
                    setName(committedName);
                    setEditing(false);
                  }
                }}
                className="w-full max-w-[360px] rounded border px-2 py-1 text-base font-semibold"
                disabled={isPending}
              />
            ) : (
              <div className="truncate text-lg font-semibold text-slate-900">{committedName}</div>
            )}
            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
              {cardsCount} cards
            </span>
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <button
              ref={menuButtonRef}
              type="button"
              aria-label="Deck options"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded border px-3 py-2 text-sm"
            >
              ⚙
            </button>
            {menuOpen && menuPos && portalReady
              ? createPortal(
                  <>
                    <button
                      type="button"
                      aria-label="Close menu"
                      onClick={() => setMenuOpen(false)}
                      className="fixed inset-0 z-[9998] cursor-default bg-transparent"
                    />
                    <div
                      className="fixed z-[9999] w-72 space-y-3 rounded-lg border bg-white p-3 shadow-2xl"
                      style={{ top: menuPos.top, left: menuPos.left }}
                    >
                      <ShareDeckButton deckId={deckId} />
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setEditing(true);
                        }}
                        className="w-full rounded border px-3 py-2 text-sm"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={deleteDeck}
                        className="w-full rounded border border-red-300 px-3 py-2 text-sm text-red-700"
                      >
                        Delete Deck
                      </button>
                    </div>
                  </>,
                  document.body
                )
              : null}
          </div>
        </div>

        <div className="relative z-10 pr-14">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Remembered {rememberedCount}</span>
            <span>Remaining {remainingCount}</span>
          </div>
          <div className="pointer-events-none mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-emerald-600" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

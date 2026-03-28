"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function TopNavLinks() {
  const pathname = usePathname();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [stats, setStats] = useState<{
    totalCards: number;
    dueToday: number;
    learnedCards: number;
    difficultCards: number;
    retentionPercent: number;
    masteryPercent: number;
    dailyProgressPercent: number;
    reviewsToday: number;
    reviewsLast7: number;
    dailyGoal: number;
    streakDays: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    const openCreate = () => setCreateOpen(true);
    window.addEventListener("open-create-deck-modal", openCreate);
    return () => window.removeEventListener("open-create-deck-modal", openCreate);
  }, []);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-xl bg-[#111111] px-3 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
        >
          Создать колоду
        </button>
        <button
          type="button"
          onClick={async () => {
            setStatsOpen(true);
            if (stats || statsLoading) return;
            setStatsLoading(true);
            try {
              const res = await fetch("/api/stats/summary", { cache: "no-store" });
              const json = await res.json();
              setStats(json);
            } finally {
              setStatsLoading(false);
            }
          }}
          className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-[#111111] shadow-sm ring-1 ring-[#E5E7EB] hover:bg-[#F5F5F5]"
        >
          Статистика
        </button>
      </div>

      {createOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="fixed inset-0 z-[600] bg-black/30"
              />
              <div className="fixed inset-0 z-[610] flex items-center justify-center p-4">
                <div className="w-[92vw] max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold">Создать колоду</h3>
                    <button
                      type="button"
                      onClick={() => setCreateOpen(false)}
                      aria-label="Закрыть"
                      title="Закрыть"
                      className="inline-flex h-7 w-7 items-center justify-center rounded bg-red-50 text-sm font-semibold leading-none text-red-700 hover:bg-red-100"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Название колоды"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl bg-[#F5F5F5] px-3 py-2 text-sm text-[#111111] outline-none ring-1 ring-[#E5E7EB] focus:ring-2 focus:ring-[#111111]"
                    />
                    <button
                      type="button"
                      disabled={creating || !name.trim()}
                      onClick={async () => {
                        if (!name.trim()) return;
                        setCreating(true);
                        try {
                          const res = await fetch("/api/decks/create", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: name.trim() })
                          });
                          if (!res.ok) return;
                          const json = await res.json();
                          const deckId = json?.deck?.id as string | undefined;
                          setCreateOpen(false);
                          setName("");
                          if (deckId) {
                            router.push(`/decks/${deckId}`);
                          } else {
                            router.push("/decks");
                          }
                          router.refresh();
                        } finally {
                          setCreating(false);
                        }
                      }}
                      className="w-full rounded-xl bg-[#111111] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creating ? "Создаю..." : "Создать"}
                    </button>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )
        : null}

      {statsOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                onClick={() => setStatsOpen(false)}
                className="fixed inset-0 z-[600] bg-black/30"
              />
              <div className="fixed inset-0 z-[610] flex items-center justify-center p-4">
                <div className="w-[92vw] max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold">Статистика</h3>
                    <button
                      type="button"
                      onClick={() => setStatsOpen(false)}
                      aria-label="Закрыть"
                      title="Закрыть"
                      className="inline-flex h-7 w-7 items-center justify-center rounded bg-red-50 text-sm font-semibold leading-none text-red-700 hover:bg-red-100"
                    >
                      ✕
                    </button>
                  </div>
                  {statsLoading ? <p className="text-sm text-slate-600">Загрузка…</p> : null}
                  {!statsLoading && stats ? (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <Tile label="Серия" value={`${stats.streakDays}д`} />
                      <Tile label="7д повторов" value={stats.reviewsLast7} />
                      <Tile label="Нужно сегодня" value={stats.dueToday} />
                      <Tile label="Всего карт" value={stats.totalCards} />
                      <Tile label="Выучено" value={stats.learnedCards} />
                      <Tile label="Трудные" value={stats.difficultCards} />
                      <Tile label="Освоение" value={`${stats.masteryPercent}%`} />
                      <Tile label="Удержание" value={`${stats.retentionPercent}%`} />
                    </div>
                  ) : null}
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] p-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-600">{label}</div>
      <div className="mt-0.5 text-base font-semibold text-[#0F172A]">{value}</div>
    </div>
  );
}

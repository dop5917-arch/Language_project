"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import HelpDrawerButton from "@/components/HelpDrawerButton";
import { STARTER_CARDS, STARTER_DECK_NAME } from "@/lib/starter-deck";

const DEMO_PROGRESS_KEY = "review-progress:demo:public-review";

export default function PublicDemoDeckClient() {
  const cardsCount = STARTER_CARDS.length;
  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    function syncProgress() {
      try {
        const raw = window.localStorage.getItem(DEMO_PROGRESS_KEY);
        if (!raw) {
          setDoneCount(0);
          return;
        }

        const parsed = JSON.parse(raw) as { index?: number };
        const nextDone = typeof parsed.index === "number" ? Math.max(0, Math.min(cardsCount, parsed.index)) : 0;
        setDoneCount(nextDone);
      } catch {
        setDoneCount(0);
      }
    }

    syncProgress();
    window.addEventListener("focus", syncProgress);
    window.addEventListener("pageshow", syncProgress);
    window.addEventListener("review-progress-updated", syncProgress as EventListener);
    return () => {
      window.removeEventListener("focus", syncProgress);
      window.removeEventListener("pageshow", syncProgress);
      window.removeEventListener("review-progress-updated", syncProgress as EventListener);
    };
  }, [cardsCount]);

  const progressPercent = useMemo(
    () => (cardsCount > 0 ? Math.round((doneCount / cardsCount) * 100) : 0),
    [cardsCount, doneCount]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#111111]">{STARTER_DECK_NAME}</h1>
          <p className="text-sm text-slate-600">Карточек: {cardsCount}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/demo/review"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            Продолжить
          </Link>
          <Link
            href="/demo/review"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-slate-50"
          >
            Карточки на сегодня ({cardsCount})
          </Link>
          <Link
            href="/demo/review"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Учить новые ({cardsCount})
          </Link>
          <Link
            href="/demo/review"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Начать с начала
          </Link>
          <HelpDrawerButton />
          <Link
            href="/"
            className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-medium text-[#111111] hover:bg-[#F5F5F5]"
          >
            На главную
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-[#6B7280]">Выучено {progressPercent}%</div>
          <div className="text-[11px] text-slate-600">
            Карточек: {cardsCount} • Пройдено: {doneCount} • Выучено: {doneCount}
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
          <div className="h-full bg-[#059669] transition-[width] duration-200" style={{ width: `${progressPercent}%` }} />
        </div>
      </section>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <div className="space-y-3 p-3">
          {STARTER_CARDS.map((card, index) => {
            const word = card.word.trim();

            return (
              <article key={`${card.word}-${index}`} className="rounded-xl border bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Изучаемое слово</div>
                    <div className="text-2xl font-semibold text-emerald-700">{word || "—"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded border bg-slate-50 px-2 py-1 text-xs text-slate-700">
                      Карточка {index + 1}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  <div>
                    <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Контекст (front)</div>
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-800">
                      {highlightWord(shortText(card.frontText, 180), word)}
                    </p>
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Определение (back)</div>
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                      {highlightWord(shortText(card.backText, 180), word)}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function shortText(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 1).trimEnd()}…`;
}

function highlightWord(text: string, word: string) {
  if (!word) return text;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(re);

  return parts.map((part, index) =>
    part.toLowerCase() === word.toLowerCase() ? (
      <span key={`${part}-${index}`} className="font-semibold text-emerald-700">
        {part}
      </span>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

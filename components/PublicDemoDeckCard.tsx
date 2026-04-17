"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const DEMO_PROGRESS_KEY = "review-progress:demo:public-review";

type Props = {
  cardsCount: number;
};

export default function PublicDemoDeckCard({ cardsCount }: Props) {
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
    <article className="relative min-h-[132px] rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5">
      <div className="relative z-10 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            href="/demo/deck"
            className="min-w-0 break-words text-lg font-semibold leading-tight text-[#111111] sm:text-xl"
          >
            Демо-колода
          </Link>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F5F5] text-sm font-semibold text-[#059669] ring-1 ring-[#E5E7EB]">
            i
          </span>
        </div>

        <div className="flex items-center justify-between">
          <Link
            href="/demo/review"
            className="rounded-xl bg-[#059669] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#047857]"
          >
            Продолжить
          </Link>
          <div className="text-sm font-medium text-[#6B7280]">Выучено {progressPercent}%</div>
        </div>

        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
            <div className="h-full bg-[#059669] transition-[width] duration-200" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="text-[11px] text-slate-600">
            Карточек: {cardsCount} • Пройдено: {doneCount} • Выучено: {doneCount}
          </div>
        </div>
      </div>
    </article>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  readStudyTimerState,
  STUDY_TIMER_EVENT
} from "@/components/study-timer";
import {
  normalizeDueLimit,
  REVIEW_DUE_LIMIT_COOKIE
} from "@/lib/review-settings";

function formatLeft(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function HomeActionPanel({
  dueToday,
  className = ""
}: {
  dueToday: number;
  className?: string;
}) {
  const [currentDueToday, setCurrentDueToday] = useState(dueToday);
  const [dueLimitInput, setDueLimitInput] = useState(String(Math.max(1, dueToday || 1)));

  useEffect(() => {
    setCurrentDueToday(dueToday);
    const nextLimit = String(Math.max(1, dueToday || 1));
    setDueLimitInput(nextLimit);
    document.cookie = `${REVIEW_DUE_LIMIT_COOKIE}=${nextLimit}; path=/; max-age=31536000; samesite=lax`;
  }, [dueToday]);

  useEffect(() => {
    const sync = () => readStudyTimerState();
    sync();
    window.addEventListener(STUDY_TIMER_EVENT, sync);
    return () => window.removeEventListener(STUDY_TIMER_EVENT, sync);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refreshDueCount() {
      try {
        const res = await fetch("/api/review/reminder", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { dueTotal?: number };
        if (cancelled || typeof json.dueTotal !== "number") return;
        const nextLimit = String(Math.max(1, json.dueTotal || 1));
        setCurrentDueToday(json.dueTotal);
        setDueLimitInput(nextLimit);
        document.cookie = `${REVIEW_DUE_LIMIT_COOKIE}=${nextLimit}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        // keep the server-rendered count if refresh fails
      }
    }

    void refreshDueCount();
    window.addEventListener("focus", refreshDueCount);
    window.addEventListener("pageshow", refreshDueCount);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshDueCount);
      window.removeEventListener("pageshow", refreshDueCount);
    };
  }, []);

  function updateDueLimit(nextValue: string) {
    if (!/^\d{0,3}$/.test(nextValue)) return;
    setDueLimitInput(nextValue);
    const normalized = Math.min(Math.max(1, currentDueToday || 1), normalizeDueLimit(nextValue));
    document.cookie = `${REVIEW_DUE_LIMIT_COOKIE}=${normalized}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <section className={`bg-transparent px-0 py-0 ${className}`}>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="flex min-h-11 flex-col justify-center gap-2 rounded-xl bg-[#059669] px-3 py-3 text-white shadow-sm md:min-h-[76px]">
          <Link
            href={`/review/all?preset=due&dueLimit=${Math.min(
              Math.max(1, currentDueToday || 1),
              normalizeDueLimit(dueLimitInput)
            )}`}
            className="text-center font-semibold text-white hover:opacity-90"
          >
            <span className="text-sm">
              Пора повторить <span className="text-white">(интервальное повторение)</span>
              {currentDueToday > 0 ? ` • ${currentDueToday}` : ""}
            </span>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="whitespace-nowrap text-white/85">Лимит в день</span>
            <input
              type="number"
              min={1}
              max={Math.max(1, currentDueToday || 1)}
              value={dueLimitInput}
              onChange={(e) => updateDueLimit(e.target.value)}
              className="w-16 rounded-lg bg-white/15 px-2 py-1 text-center text-sm text-white outline-none placeholder:text-white/60"
              aria-label="Лимит повторений в день"
              inputMode="numeric"
            />
          </div>
        </div>
        <Link
          href="/review/all"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#E5E7EB] px-3 py-2 text-center font-semibold text-[#111111] shadow-sm hover:bg-[#D1D5DB] md:min-h-[76px]"
        >
          <span className="text-sm">Повторение всех колод</span>
        </Link>
      </div>
    </section>
  );
}

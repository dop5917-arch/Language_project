"use client";

import Link from "next/link";
import { useState } from "react";

export default function PublicDemoActionPanel({ dueToday }: { dueToday: number }) {
  const [dueLimitInput, setDueLimitInput] = useState(String(Math.max(1, dueToday || 1)));

  function updateDueLimit(nextValue: string) {
    if (!/^\d{0,3}$/.test(nextValue)) return;
    const normalized = nextValue === "" ? "" : String(Math.min(Math.max(1, Number(nextValue) || 1), Math.max(1, dueToday)));
    setDueLimitInput(normalized);
  }

  const dueLimit = Math.min(Math.max(1, dueToday || 1), Number(dueLimitInput) || Math.max(1, dueToday || 1));

  return (
    <section className="grid grid-cols-1 gap-2 md:grid-cols-2">
      <div className="flex min-h-11 flex-col justify-center gap-2 rounded-xl bg-[#059669] px-3 py-3 text-white shadow-sm md:min-h-[76px]">
        <Link
          href={`/demo/review?dueLimit=${dueLimit}`}
          className="text-center font-semibold text-white hover:opacity-95"
        >
          <span className="text-sm">
            Пора повторить <span className="text-white">(интервальное повторение)</span>
            {dueToday > 0 ? ` • ${dueToday}` : ""}
          </span>
        </Link>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="whitespace-nowrap text-white/85">Лимит в день</span>
          <input
            type="number"
            min={1}
            max={Math.max(1, dueToday || 1)}
            value={dueLimitInput}
            onChange={(e) => updateDueLimit(e.target.value)}
            className="w-16 rounded-lg bg-white/15 px-2 py-1 text-center text-sm text-white outline-none placeholder:text-white/60"
            aria-label="Лимит повторений в день"
            inputMode="numeric"
          />
        </div>
      </div>

      <Link
        href="/demo/review"
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#E5E7EB] px-3 py-2 text-center font-semibold text-[#111111] shadow-sm transition hover:bg-[#D1D5DB] md:min-h-[76px]"
      >
        <span className="text-sm">Повторение всех колод</span>
      </Link>
    </section>
  );
}

"use client";

import { useState } from "react";
import { writeStudyTimerState } from "@/components/study-timer";

const PRESETS = [15, 25, 45];

export default function StudyTimerControls() {
  const [minutes, setMinutes] = useState(25);

  function startTimer() {
    const durationMin = Math.max(1, Math.min(180, Number(minutes) || 25));
    const now = Date.now();
    writeStudyTimerState({
      durationMin,
      startedAt: now,
      endAt: now + durationMin * 60 * 1000
    });
  }

  return (
    <div className="h-full min-h-[182px] rounded-xl border bg-white p-4">
      <div className="flex h-full flex-col items-center justify-center text-center">
      <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
        Таймер
      </span>
      <p className="mt-2 max-w-[220px] truncate text-sm font-medium text-slate-800">Время на повторение</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {PRESETS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMinutes(value)}
            className={`rounded-lg border px-2.5 py-1.5 text-sm ${
              minutes === value ? "border-emerald-600 bg-emerald-50 text-emerald-700" : ""
            }`}
          >
            {value} мин
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <input
          type="number"
          min={1}
          max={180}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value) || 25)}
          className="w-20 rounded-lg border px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={startTimer}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Запустить
        </button>
      </div>
      </div>
    </div>
  );
}

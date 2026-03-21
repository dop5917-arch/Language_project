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
    <div className="h-full min-h-[182px] rounded-xl border bg-white p-3">
      <div className="text-sm font-semibold">Таймер повторения</div>
      <p className="mt-1 text-xs text-slate-600">Сколько времени ты готов потратить сейчас</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {PRESETS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMinutes(value)}
            className={`rounded border px-2 py-1 text-xs ${
              minutes === value ? "border-emerald-600 bg-emerald-50 text-emerald-700" : ""
            }`}
          >
            {value} мин
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={180}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value) || 25)}
          className="w-20 rounded border px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={startTimer}
          className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
        >
          Запустить
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

type Props = {
  streakDays: number;
  reviewsLast7: number;
  dueToday: number;
  totalCards: number;
  learnedCards: number;
  dailyProgressText: string;
  masteryPercent: number;
  retentionPercent: number;
  dailyGoalPercent: number;
};

function percentLabel(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${Math.max(0, Math.min(100, value))}%`;
}

export default function StatsModalButton(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded border px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
      >
        i Статистика
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Закрыть статистику"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[600] bg-black/30"
          />
          <div className="fixed left-1/2 top-1/2 z-[610] w-[94vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Статистика</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
                title="Закрыть"
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-300 bg-red-50 text-sm font-semibold leading-none text-red-700 hover:bg-red-100"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="Серия дней" value={`${props.streakDays}д`} />
              <Stat label="Повторов за 7д" value={props.reviewsLast7} />
              <Stat label="Нужно сегодня" value={props.dueToday} />
              <Stat label="Всего карточек" value={props.totalCards} />
              <Stat label="Выучено" value={props.learnedCards} />
              <Stat label="Сегодня" value={props.dailyProgressText} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Stat label="Освоение" value={percentLabel(props.masteryPercent)} />
              <Stat label="Удержание" value={percentLabel(props.retentionPercent)} />
              <Stat label="Цель дня" value={percentLabel(props.dailyGoalPercent)} />
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-base font-semibold">{value}</div>
    </div>
  );
}

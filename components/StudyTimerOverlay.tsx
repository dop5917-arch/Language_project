"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  readStudyTimerState,
  STUDY_TIMER_EVENT,
  type StudyTimerState,
  writeStudyTimerState
} from "@/components/study-timer";

function formatLeft(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function StudyTimerOverlay() {
  const [timer, setTimer] = useState<StudyTimerState | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [hiddenUntilFinish, setHiddenUntilFinish] = useState(false);
  const alertedRef = useRef(false);

  useEffect(() => {
    const sync = () => setTimer(readStudyTimerState());
    sync();
    window.addEventListener(STUDY_TIMER_EVENT, sync);
    return () => window.removeEventListener(STUDY_TIMER_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!timer) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timer]);

  const leftMs = useMemo(() => {
    if (!timer) return 0;
    return timer.endAt - now;
  }, [timer, now]);

  useEffect(() => {
    if (!timer) return;
    if (leftMs > 0) {
      alertedRef.current = false;
      return;
    }
    if (!alertedRef.current) {
      alertedRef.current = true;
      window.alert("Таймер завершен.");
    }
    setHiddenUntilFinish(false);
  }, [timer, leftMs]);

  if (!timer) return null;

  const isFinished = leftMs <= 0;

  function stopTimer() {
    writeStudyTimerState(null);
    setTimer(null);
    setHiddenUntilFinish(false);
  }

  function addTime(minutes: number) {
    if (!timer) return;
    const base = Math.max(timer.endAt, Date.now());
    const next: StudyTimerState = {
      startedAt: Date.now(),
      durationMin: minutes,
      endAt: base + minutes * 60 * 1000
    };
    writeStudyTimerState(next);
    setHiddenUntilFinish(false);
    alertedRef.current = false;
  }

  if (hiddenUntilFinish && !isFinished) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[400] rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 shadow-lg">
      <div className="text-[11px] text-slate-500">Таймер повторения</div>
      <div className="text-lg font-semibold text-slate-900">{isFinished ? "00:00" : formatLeft(leftMs)}</div>

      {!isFinished ? (
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => setHiddenUntilFinish(true)}
            className="rounded border px-2 py-1 text-[11px]"
          >
            Скрыть
          </button>
          <button type="button" onClick={stopTimer} className="rounded border px-2 py-1 text-[11px]">
            Стоп
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="text-[11px] text-slate-600">Добавить время:</div>
          <div className="flex gap-2">
            <button type="button" onClick={() => addTime(5)} className="rounded border px-2 py-1 text-[11px]">
              +5 мин
            </button>
            <button type="button" onClick={() => addTime(10)} className="rounded border px-2 py-1 text-[11px]">
              +10 мин
            </button>
            <button type="button" onClick={() => addTime(15)} className="rounded border px-2 py-1 text-[11px]">
              +15 мин
            </button>
          </div>
          <button type="button" onClick={stopTimer} className="rounded border px-2 py-1 text-[11px]">
            Завершить
          </button>
        </div>
      )}
    </div>
  );
}

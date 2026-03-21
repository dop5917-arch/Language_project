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
      window.alert("Таймер завершен. Сессия повторения закончилась.");
    }
    writeStudyTimerState(null);
    setTimer(null);
  }, [timer, leftMs]);

  if (!timer || leftMs <= 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[400] rounded-xl border border-emerald-300 bg-white px-3 py-2 shadow-lg">
      <div className="text-[11px] text-slate-500">Таймер повторения</div>
      <div className="text-lg font-semibold text-slate-900">{formatLeft(leftMs)}</div>
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={() => writeStudyTimerState(null)}
          className="rounded border px-2 py-1 text-[11px]"
        >
          Стоп
        </button>
      </div>
    </div>
  );
}


"use client";

import { useEffect, useRef, useState } from "react";
import {
  readStudyTimerState,
  STUDY_TIMER_EVENT,
  writeStudyTimerState,
  type StudyTimerState
} from "@/components/study-timer";

export default function StudyTimerFinishNotifier() {
  const [timer, setTimer] = useState<StudyTimerState | null>(null);
  const [now, setNow] = useState(Date.now());
  const alertedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const sync = () => setTimer(readStudyTimerState());
    sync();
    window.addEventListener(STUDY_TIMER_EVENT, sync);
    return () => window.removeEventListener(STUDY_TIMER_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!timer) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [timer]);

  useEffect(() => {
    if (!timer || timer.pausedAt) return;
    if (timer.endAt > now) return;
    if (alertedTimerRef.current === timer.startedAt) return;

    alertedTimerRef.current = timer.startedAt;
    window.alert("Время вышло.");
    writeStudyTimerState(null);
    setTimer(null);
  }, [timer, now]);

  return null;
}

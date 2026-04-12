export const STUDY_TIMER_KEY = "study-timer:v1";
export const STUDY_TIMER_EVENT = "study-timer:update";

export type StudyTimerState = {
  endAt: number;
  startedAt: number;
  durationMin: number;
  pausedAt?: number | null;
};

export function readStudyTimerState(): StudyTimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STUDY_TIMER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudyTimerState>;
    if (
      typeof parsed.endAt !== "number" ||
      typeof parsed.startedAt !== "number" ||
      typeof parsed.durationMin !== "number"
    ) {
      return null;
    }
    return {
      endAt: parsed.endAt,
      startedAt: parsed.startedAt,
      durationMin: parsed.durationMin,
      pausedAt: typeof parsed.pausedAt === "number" ? parsed.pausedAt : null
    };
  } catch {
    return null;
  }
}

export function writeStudyTimerState(state: StudyTimerState | null): void {
  if (typeof window === "undefined") return;
  if (!state) {
    window.localStorage.removeItem(STUDY_TIMER_KEY);
  } else {
    window.localStorage.setItem(STUDY_TIMER_KEY, JSON.stringify(state));
  }
  window.dispatchEvent(new Event(STUDY_TIMER_EVENT));
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function addDaysLocal(date: Date, days: number): Date {
  const base = startOfLocalDay(date);
  base.setDate(base.getDate() + days);
  return base;
}

export function formatLocalDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

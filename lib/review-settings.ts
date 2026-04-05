export const DEFAULT_DUE_LIMIT = 25;
export const REVIEW_DUE_LIMIT_COOKIE = "review_due_limit";

export function normalizeDueLimit(value: number | string | null | undefined): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return DEFAULT_DUE_LIMIT;
  }

  return Math.max(1, Math.min(200, Math.trunc(parsed)));
}

export function readDueLimitFromCookieString(cookieSource: string): number {
  const match = cookieSource.match(new RegExp(`(?:^|; )${REVIEW_DUE_LIMIT_COOKIE}=([^;]+)`));
  return normalizeDueLimit(match ? decodeURIComponent(match[1]) : undefined);
}

import Link from "next/link";
import DeckCard from "@/components/DeckCard";
import { createDeckAction } from "@/lib/actions";
import { startOfLocalDay } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const today = startOfLocalDay(new Date());
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const [decks, totalCards, reviewedCards, dueToday, logs] = await Promise.all([
    prisma.deck.findMany({
      include: {
        _count: {
          select: { cards: true }
        },
        cards: {
          select: {
            id: true,
            reviewLogs: {
              orderBy: { reviewedAt: "desc" },
              take: 1,
              select: { rating: true }
            }
          }
        }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.card.count(),
    prisma.reviewState.count(),
    prisma.reviewState.count({
      where: {
        dueDate: { lte: today }
      }
    }),
    prisma.reviewLog.findMany({
      orderBy: { reviewedAt: "desc" },
      select: { cardId: true, rating: true, reviewedAt: true }
    })
  ]);

  const latestByCard = new Map<string, string>();
  for (const log of logs) {
    if (!latestByCard.has(log.cardId)) {
      latestByCard.set(log.cardId, log.rating);
    }
  }
  const latestRatings = Array.from(latestByCard.values());
  const difficultCards = latestRatings.filter((r) => r === "Again" || r === "Hard").length;
  const learnedCards = latestRatings.filter((r) => r === "Easy").length;
  const retainedCards = latestRatings.filter((r) => r === "Good" || r === "Easy").length;
  const retentionPercent =
    latestRatings.length > 0 ? Math.round((retainedCards / latestRatings.length) * 100) : 0;
  const levelPercent = totalCards > 0 ? Math.round((learnedCards / totalCards) * 100) : 0;
  const reviewsToday = logs.filter((log) => log.reviewedAt >= today).length;
  const reviewsLast7 = logs.filter((log) => log.reviewedAt >= weekStart).length;
  const dailyGoal = Math.max(20, dueToday);
  const dailyProgressPercent = Math.min(100, Math.round((reviewsToday / Math.max(1, dailyGoal)) * 100));
  const difficultPercent = totalCards > 0 ? Math.round((difficultCards / totalCards) * 100) : 0;

  const reviewedDayKeys = new Set(logs.map((log) => dayKey(log.reviewedAt)));
  let streakDays = 0;
  const cursor = new Date(today);
  while (reviewedDayKeys.has(dayKey(cursor))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold">Global Review</h2>
            <p className="mt-1 text-sm text-slate-700">
              Repeat cards from all decks in one session. This mode is for full mixed practice across your entire
              vocabulary.
            </p>
          </div>
          <Link
            href="/review/all"
            className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Start Global Review
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="rounded-lg border bg-white p-4">
            <h1 className="text-xl font-semibold">Decks</h1>
            <form action={createDeckAction} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                name="name"
                placeholder="New deck name"
                className="flex-1 rounded border px-3 py-2"
                required
              />
              <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800">
                Create Deck
              </button>
            </form>
          </section>

          <section className="space-y-3">
            {decks.length === 0 ? (
              <p className="text-sm text-slate-600">No decks yet.</p>
            ) : (
              decks.map((deck) => {
                const rememberedCount = deck.cards.filter((card) => card.reviewLogs[0]?.rating === "Easy").length;
                const remainingCount = Math.max(0, deck._count.cards - rememberedCount);
                const progressPercent =
                  deck._count.cards > 0 ? Math.round((rememberedCount / deck._count.cards) * 100) : 0;

                return (
                  <DeckCard
                    key={deck.id}
                    deckId={deck.id}
                    initialName={deck.name}
                    cardsCount={deck._count.cards}
                    rememberedCount={rememberedCount}
                    remainingCount={remainingCount}
                    progressPercent={progressPercent}
                  />
                );
              })
            )}
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:h-fit">
          <section className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold">Progress</h2>
            <p className="mt-1 text-xs text-slate-600">Compact global stats</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <DonutStat label="Mastery" percent={levelPercent} color="emerald" />
              <DonutStat label="Retention" percent={retentionPercent} color="blue" />
              <DonutStat label="Daily Goal" percent={dailyProgressPercent} color="amber" />
              <DonutStat label="Difficult" percent={difficultPercent} color="red" />
            </div>
          </section>

          <section className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="Streak" value={`${streakDays}d`} tone="emerald" />
              <StatTile label="7d Reviews" value={reviewsLast7} tone="blue" />
              <StatTile label="Due Today" value={dueToday} tone="amber" />
              <StatTile label="Cards" value={totalCards} />
              <StatTile label="Learned" value={learnedCards} tone="emerald" />
              <StatTile label="Today" value={`${reviewsToday}/${dailyGoal}`} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function DonutStat({
  label,
  percent,
  color
}: {
  label: string;
  percent: number;
  color: "emerald" | "blue" | "amber" | "red";
}) {
  const size = 92;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, percent));
  const offset = circumference - (progress / 100) * circumference;
  const colorClass =
    color === "emerald"
      ? "stroke-emerald-600"
      : color === "blue"
        ? "stroke-blue-600"
        : color === "amber"
          ? "stroke-amber-500"
          : "stroke-red-500";

  return (
    <div className="rounded-lg border bg-slate-50 p-2 text-center">
      <div className="mx-auto h-[92px] w-[92px]">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            className="fill-none stroke-slate-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`fill-none ${colorClass}`}
          />
        </svg>
      </div>
      <div className="-mt-[58px] text-lg font-bold">{progress}%</div>
      <div className="mt-9 text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string | number;
  tone?: "default" | "emerald" | "blue" | "amber" | "red";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "blue"
        ? "border-blue-200 bg-blue-50"
        : tone === "amber"
          ? "border-amber-200 bg-amber-50"
          : tone === "red"
            ? "border-red-200 bg-red-50"
            : "border-slate-200 bg-slate-50";
  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

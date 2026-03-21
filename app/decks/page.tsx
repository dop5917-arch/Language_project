import Link from "next/link";
import CreateDeckInline from "@/components/CreateDeckInline";
import DeckCard from "@/components/DeckCard";
import DueNowPanel from "@/components/DueNowPanel";
import StudyTimerControls from "@/components/StudyTimerControls";
import { createDeckAction } from "@/lib/actions";
import { startOfLocalDay } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const today = startOfLocalDay(new Date());
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  let decks: any[] = [];
  let totalCards = 0;
  let reviewedCards = 0;
  let dueToday = 0;
  let logs: Array<{ cardId: string; rating: string; reviewedAt: Date }> = [];
  let logsWithDeck: Array<{ rating: string; reviewedAt: Date; card: { deckId: string } }> = [];
  let dbError: string | null = null;

  try {
    [decks, totalCards, reviewedCards, dueToday, logs, logsWithDeck] = await Promise.all([
      prisma.deck.findMany({
        include: {
          _count: {
            select: { cards: true }
          },
          cards: {
            select: {
              id: true,
              targetWord: true,
              frontText: true,
              reviewState: {
                select: { dueDate: true }
              },
              reviewLogs: {
                orderBy: { reviewedAt: "desc" },
                take: 1,
                select: { rating: true }
              }
            }
          }
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
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
      }),
      prisma.reviewLog.findMany({
        orderBy: { reviewedAt: "desc" },
        select: {
          rating: true,
          reviewedAt: true,
          card: {
            select: { deckId: true }
          }
        }
      })
    ]);
  } catch (error) {
    dbError = error instanceof Error ? error.message : "Database is unavailable";
  }

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

  const monthStart = new Date(today);
  monthStart.setDate(monthStart.getDate() - 30);
  const deckLastActivity = new Map<string, Date>();
  const deckAccuracy = new Map<string, { success: number; total: number }>();
  for (const log of logsWithDeck) {
    const deckId = log.card.deckId;
    if (!deckLastActivity.has(deckId)) {
      deckLastActivity.set(deckId, log.reviewedAt);
    }
    if (log.reviewedAt < monthStart) continue;
    const current = deckAccuracy.get(deckId) ?? { success: 0, total: 0 };
    current.total += 1;
    if (log.rating === "Good" || log.rating === "Easy") current.success += 1;
    deckAccuracy.set(deckId, current);
  }

  const dueDecks = decks
    .map((deck) => ({
      deckId: deck.id,
      deckName: deck.name,
      cards: deck.cards
        .filter((card: any) => card.reviewState?.dueDate && card.reviewState.dueDate <= today)
        .map((card: any) => ({
          id: card.id,
          targetWord: card.targetWord,
          frontText: card.frontText
        }))
    }))
    .filter((deck) => deck.cards.length > 0);

  return (
    <div className="space-y-6">
      {dbError ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          База данных временно недоступна. Проверь подключение к интернету и `DATABASE_URL` (Neon), затем обнови страницу.
        </section>
      ) : null}
      <section className="flex flex-wrap items-stretch gap-3">
        {!dbError ? (
          <div className="w-full max-w-[260px]">
            <DueNowPanel dueToday={dueToday} dueDecks={dueDecks} />
          </div>
        ) : null}
        <div className="w-full max-w-[260px] rounded-xl border bg-white p-3 shadow-sm min-h-[182px]">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Общее повторение</h2>
            <p className="text-xs text-slate-600">Карточки из всех колод</p>
            <Link
              href="/review/all"
              className="inline-flex rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Открыть
            </Link>
          </div>
        </div>
        <div className="w-full max-w-[260px]">
          <StudyTimerControls />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="rounded-lg border bg-white p-4">
            <h1 className="text-xl font-semibold">Decks</h1>
            <CreateDeckInline action={createDeckAction} />
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">
            {decks.length === 0 ? (
              <p className="text-sm text-slate-600">No decks yet.</p>
            ) : (
              decks.map((deck) => {
                const rememberedCount = deck.cards.filter((card: any) => card.reviewLogs[0]?.rating === "Easy").length;
                const passedCount = deck.cards.filter((card: any) => card.reviewLogs.length > 0).length;
                const dueCount = deck.cards.filter(
                  (card: any) => card.reviewState?.dueDate && card.reviewState.dueDate <= today
                ).length;
                const progressPercent =
                  deck._count.cards > 0 ? Math.round((rememberedCount / deck._count.cards) * 100) : 0;

                return (
                  <DeckCard
                    key={deck.id}
                    deckId={deck.id}
                    initialName={deck.name}
                    createdAt={deck.createdAt.toISOString()}
                    lastActivityAt={deckLastActivity.get(deck.id)?.toISOString() ?? null}
                    accuracyPercent={
                      (deckAccuracy.get(deck.id)?.total ?? 0) > 0
                        ? Math.round(
                            ((deckAccuracy.get(deck.id)?.success ?? 0) /
                              (deckAccuracy.get(deck.id)?.total ?? 1)) *
                              100
                          )
                        : null
                    }
                    cardsCount={deck._count.cards}
                    passedCount={passedCount}
                    rememberedCount={rememberedCount}
                    dueCount={dueCount}
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

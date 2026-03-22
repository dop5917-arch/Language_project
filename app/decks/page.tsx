import Link from "next/link";
import DecksHeaderCreateButton from "@/components/DecksHeaderCreateButton";
import DeckCard from "@/components/DeckCard";
import DueNowPanel from "@/components/DueNowPanel";
import StudyTimerControls from "@/components/StudyTimerControls";
import { startOfLocalDay } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const today = startOfLocalDay(new Date());
  let decks: any[] = [];
  let dueToday = 0;
  let logsWithDeck: Array<{ rating: string; reviewedAt: Date; card: { deckId: string } }> = [];
  let dbError: string | null = null;

  try {
    [decks, dueToday, logsWithDeck] = await Promise.all([
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
      prisma.reviewState.count({
        where: {
          dueDate: { lte: today }
        }
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
      <section className="flex flex-wrap items-stretch justify-center gap-3">
        {!dbError ? (
          <div className="w-full max-w-[260px]">
            <DueNowPanel dueToday={dueToday} dueDecks={dueDecks} />
          </div>
        ) : null}
        <div className="w-full max-w-[260px] min-h-[182px] rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Global
            </span>
            <p className="max-w-[220px] truncate text-sm font-medium text-slate-800">Повторение из всех колод</p>
            <Link
              href="/review/all"
              className="inline-flex rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Открыть
            </Link>
          </div>
        </div>
        <div className="w-full max-w-[260px]">
          <StudyTimerControls />
        </div>
      </section>

      <div className="space-y-4">
        <section className="px-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              Колоды
            </span>
            <DecksHeaderCreateButton />
          </div>
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
    </div>
  );
}

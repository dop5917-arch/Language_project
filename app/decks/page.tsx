import DecksHeaderCreateButton from "@/components/DecksHeaderCreateButton";
import DeckCard from "@/components/DeckCard";
import HomeActionPanel from "@/components/HomeActionPanel";
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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {dbError ? (
        <section className="rounded-xl border border-[#E5E7EB] bg-[#FEF2F2] p-4 text-sm text-[#EF4444]">
          База данных временно недоступна. Проверь подключение к интернету и `DATABASE_URL` (Neon), затем обнови страницу.
        </section>
      ) : null}
      {!dbError ? (
        <HomeActionPanel
          dueToday={dueToday}
          aiDeckOptions={decks.map((deck) => ({ id: deck.id, name: deck.name }))}
        />
      ) : null}

      <div className="space-y-4">
        <section className="px-1">
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#111111]">
              Колоды
            </span>
            <DecksHeaderCreateButton />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

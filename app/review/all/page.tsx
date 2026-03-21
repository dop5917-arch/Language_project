import Link from "next/link";
import ReviewClient from "@/components/ReviewClient";
import { prisma } from "@/lib/prisma";
import {
  filterQueueByLatestRating,
  getGlobalDueQueue,
  getGlobalFullQueue,
  getGlobalTodayQueue,
  type RatingFilter,
  type QueueItem
} from "@/lib/srs";
import { startOfLocalDay } from "@/lib/date";

type Props = {
  searchParams?: { newLimit?: string; preset?: string; include?: string };
};

export const dynamic = "force-dynamic";

export default async function GlobalReviewPage({ searchParams }: Props) {
  const newLimit = Math.max(1, Math.min(100, Number(searchParams?.newLimit ?? 20) || 20));
  const presetRaw = searchParams?.preset;
  const includeRaw = searchParams?.include ?? "";
  const includeSet =
    includeRaw.trim().length > 0
      ? new Set(
          includeRaw
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        )
      : null;
  const preset =
    presetRaw === "due" ||
    presetRaw === "daily" ||
    presetRaw === "unpassed" ||
    presetRaw === "difficult" ||
    presetRaw === "easy" ||
    presetRaw === "full"
      ? presetRaw
      : null;

  const today = startOfLocalDay(new Date());

  const [decks, dueCount, newCount, allCards, latestLogs] = await Promise.all([
    prisma.deck.findMany({ select: { id: true, name: true } }),
    prisma.reviewState.count({
      where: {
        dueDate: { lte: today }
      }
    }),
    prisma.card.count({
      where: {
        reviewState: { is: null }
      }
    }),
    prisma.card.count(),
    prisma.reviewLog.findMany({
      orderBy: { reviewedAt: "desc" },
      select: { cardId: true, rating: true }
    })
  ]);

  const latestByCard = new Map<string, string>();
  for (const log of latestLogs) {
    if (!latestByCard.has(log.cardId)) {
      latestByCard.set(log.cardId, log.rating);
    }
  }
  const latestRatings = Array.from(latestByCard.values());
  const difficultCount = latestRatings.filter((r) => r === "Again" || r === "Hard").length;
  const easyCount = latestRatings.filter((r) => r === "Easy").length;
  const unpassedCount = Math.max(0, allCards - latestRatings.length);

  if (!preset) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Global Review</h1>
          <p className="mt-1 text-sm text-slate-700">
            One session for cards from all decks. Choose what you want to review right now.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ModeCard
            title="All Cards"
            subtitle={`${allCards} cards`}
            description="Repeat all cards from all decks."
            href="/review/all?preset=full"
          />
          <ModeCard
            title="Not Passed"
            subtitle={`${unpassedCount} cards`}
            description="Cards you have not reviewed yet."
            href="/review/all?preset=unpassed"
          />
          <ModeCard
            title="Difficult"
            subtitle={`${difficultCount} cards`}
            description="Cards with last rating Again or Hard."
            href="/review/all?preset=difficult"
          />
          <ModeCard
            title="Easy"
            subtitle={`${easyCount} cards`}
            description="Cards with last rating Easy."
            href="/review/all?preset=easy"
          />
          <ModeCard
            title="Due Now"
            subtitle={`${dueCount} cards by schedule`}
            description="Only cards that are due right now."
            href="/review/all?preset=due"
          />
          <ModeCard
            title="Quick Daily Review"
            subtitle={`Due ${dueCount} • New ${Math.min(newCount, newLimit)} (limit ${newLimit})`}
            description="Review cards that should be repeated today from all decks."
            href={`/review/all?preset=daily&newLimit=${newLimit}`}
          />
        </div>
      </div>
    );
  }

  let baseQueue: QueueItem[] = [];
  let ratingFilter: RatingFilter = "all";
  let modeTitle = "Global Review";
  let modeDescription = "";

  if (preset === "due") {
    baseQueue = await getGlobalDueQueue(new Date());
    if (includeSet && includeSet.size > 0) {
      baseQueue = baseQueue.filter((item) => includeSet.has(item.card.id));
    }
    ratingFilter = "all";
    modeTitle = "Due Now";
    modeDescription = "Only cards that are due by schedule (no new cards).";
  }
  if (preset === "daily") {
    baseQueue = await getGlobalTodayQueue(new Date(), newLimit);
    ratingFilter = "all";
    modeTitle = "Quick Daily Review";
    modeDescription = "Cards due today + limited new cards from all decks.";
  }
  if (preset === "difficult") {
    baseQueue = await getGlobalFullQueue();
    ratingFilter = "Difficult";
    modeTitle = "Difficult";
    modeDescription = "Only difficult cards (last rating: Again or Hard).";
  }
  if (preset === "unpassed") {
    baseQueue = await getGlobalFullQueue();
    ratingFilter = "Unpassed";
    modeTitle = "Not Passed";
    modeDescription = "Cards that have not been reviewed yet.";
  }
  if (preset === "easy") {
    baseQueue = await getGlobalFullQueue();
    ratingFilter = "Learned";
    modeTitle = "Easy";
    modeDescription = "Cards with confident recall (last rating: Easy).";
  }
  if (preset === "full") {
    baseQueue = await getGlobalFullQueue();
    ratingFilter = "all";
    modeTitle = "Full Sweep";
    modeDescription = "All cards from all decks in one session.";
  }

  const queue = await filterQueueByLatestRating(baseQueue, ratingFilter);

  const deckNameById = new Map(decks.map((deck) => [deck.id, deck.name]));
  const serializedQueue = queue.map((item) => ({
    id: item.card.id,
    deckId: item.card.deckId,
    deckName: deckNameById.get(item.card.deckId) ?? "Unknown deck",
    targetWord: item.card.targetWord,
    phonetic: item.card.phonetic,
    audioUrl: item.card.audioUrl,
    frontText: item.card.frontText,
    backText: item.card.backText,
    imageUrl: item.card.imageUrl,
    tags: item.card.tags,
    level: item.card.level,
    isNew: item.isNew
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
        <div>
          <h1 className="text-xl font-semibold">{modeTitle}</h1>
          <p className="text-sm text-slate-600">{modeDescription}</p>
        </div>
        <Link href="/review/all" className="rounded border px-3 py-2 text-sm">
          Change Mode
        </Link>
      </div>

      {serializedQueue.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-sm text-slate-600">
          No cards found for this mode right now.
        </div>
      ) : (
        <ReviewClient
          deckId=""
          initialQueue={serializedQueue}
          returnHref="/review/all"
          returnLabel="Back to Modes"
        />
      )}
    </div>
  );
}

function ModeCard({
  title,
  subtitle,
  description,
  href
}: {
  title: string;
  subtitle: string;
  description: string;
  href: string;
}) {
  return (
    <article className="rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{subtitle}</p>
      <p className="mt-2 text-sm text-slate-700">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-block rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        Start
      </Link>
    </article>
  );
}

import Link from "next/link";
import ReviewClient from "@/components/ReviewClient";
import { prisma } from "@/lib/prisma";
import {
  filterQueueByLatestRating,
  getGlobalFullQueue,
  getGlobalTodayQueue,
  type RatingFilter,
  type QueueItem
} from "@/lib/srs";
import { startOfLocalDay } from "@/lib/date";

type Props = {
  searchParams?: { newLimit?: string; preset?: string };
};

export const dynamic = "force-dynamic";

export default async function GlobalReviewPage({ searchParams }: Props) {
  const newLimit = Math.max(1, Math.min(100, Number(searchParams?.newLimit ?? 20) || 20));
  const presetRaw = searchParams?.preset;
  const preset =
    presetRaw === "daily" || presetRaw === "difficult" || presetRaw === "full" ? presetRaw : null;

  const today = startOfLocalDay(new Date());

  const [decks, dueCount, newCount, allCards] = await Promise.all([
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
    prisma.card.count()
  ]);

  if (!preset) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Global Review</h1>
          <p className="mt-1 text-sm text-slate-700">
            One session for cards from all decks. Choose what you want to review right now.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ModeCard
            title="Quick Daily Review"
            subtitle={`Due ${dueCount} • New ${Math.min(newCount, newLimit)} (limit ${newLimit})`}
            description="Review cards that should be repeated today from all decks."
            href={`/review/all?preset=daily&newLimit=${newLimit}`}
          />
          <ModeCard
            title="Forgotten Focus"
            subtitle="Again + Hard cards"
            description="Focus only on difficult cards that were not remembered confidently."
            href="/review/all?preset=difficult"
          />
          <ModeCard
            title="Full Sweep"
            subtitle={`${allCards} cards total`}
            description="Go through all cards from all decks in one mixed session."
            href="/review/all?preset=full"
          />
        </div>
      </div>
    );
  }

  let baseQueue: QueueItem[] = [];
  let ratingFilter: RatingFilter = "all";
  let modeTitle = "Global Review";
  let modeDescription = "";

  if (preset === "daily") {
    baseQueue = await getGlobalTodayQueue(new Date(), newLimit);
    ratingFilter = "all";
    modeTitle = "Quick Daily Review";
    modeDescription = "Cards due today + limited new cards from all decks.";
  }
  if (preset === "difficult") {
    baseQueue = await getGlobalFullQueue();
    ratingFilter = "Difficult";
    modeTitle = "Forgotten Focus";
    modeDescription = "Only difficult cards (last rating: Again or Hard).";
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
      <Link href={href} className="mt-4 inline-block rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
        Start
      </Link>
    </article>
  );
}

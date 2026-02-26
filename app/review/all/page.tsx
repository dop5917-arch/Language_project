import Link from "next/link";
import ReviewClient from "@/components/ReviewClient";
import { prisma } from "@/lib/prisma";
import {
  filterQueueByLatestRating,
  getGlobalFullQueue,
  getGlobalTodayQueue,
  type RatingFilter
} from "@/lib/srs";
import { startOfLocalDay } from "@/lib/date";

type Props = {
  searchParams?: { newLimit?: string; mode?: string; rating?: string };
};

export const dynamic = "force-dynamic";

export default async function GlobalReviewPage({ searchParams }: Props) {
  const newLimit = Math.max(1, Math.min(100, Number(searchParams?.newLimit ?? 20) || 20));
  const mode = searchParams?.mode === "all" ? "all" : "today";
  const requestedRating = searchParams?.rating;
  const ratingFilter: RatingFilter =
    requestedRating === "Again" ||
    requestedRating === "Hard" ||
    requestedRating === "Good" ||
    requestedRating === "Easy" ||
    requestedRating === "Difficult" ||
    requestedRating === "Learned"
      ? requestedRating
      : "all";
  const today = startOfLocalDay(new Date());

  const [baseQueue, decks, dueCount, newCount] = await Promise.all([
    mode === "all" ? getGlobalFullQueue() : getGlobalTodayQueue(new Date(), newLimit),
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
    })
  ]);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Global Review</h1>
          <p className="text-sm text-slate-600">
            {mode === "all"
              ? "Повторение всех карточек из всех колод"
              : "Повторение карточек из всех колод, которым пора повторяться"}
          </p>
        </div>
        <div className="text-sm text-slate-600">
          {mode === "today" ? `Due: ${dueCount} • New: ${Math.min(newCount, newLimit)} (limit ${newLimit})` : `Cards: ${serializedQueue.length}`}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/decks" className="rounded border px-3 py-2">
          All Decks
        </Link>
        <Link
          href={`/review/all?newLimit=${newLimit}&mode=today${ratingFilter === "all" ? "" : `&rating=${ratingFilter}`}`}
          className={`rounded border px-3 py-2 ${mode === "today" ? "border-blue-600 bg-blue-50 text-blue-700" : ""}`}
        >
          Today Queue
        </Link>
        <Link
          href={`/review/all?mode=all${ratingFilter === "all" ? "" : `&rating=${ratingFilter}`}`}
          className={`rounded border px-3 py-2 ${mode === "all" ? "border-blue-600 bg-blue-50 text-blue-700" : ""}`}
        >
          All Cards (Anytime)
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {(["all", "Difficult", "Learned"] as const).map((value) => (
          <Link
            key={value}
            href={
              mode === "today"
                ? `/review/all?newLimit=${newLimit}&mode=today${value === "all" ? "" : `&rating=${value}`}`
                : `/review/all?mode=all${value === "all" ? "" : `&rating=${value}`}`
            }
            className={`rounded border px-3 py-2 ${
              ratingFilter === value ? "border-blue-600 bg-blue-50 text-blue-700" : ""
            }`}
          >
            {value === "all" ? "All ratings" : value}
          </Link>
        ))}
        <Link
          href={
            mode === "today"
              ? `/review/all?newLimit=${newLimit}&mode=today${ratingFilter === "all" ? "" : `&rating=${ratingFilter}`}`
              : `/review/all?mode=all${ratingFilter === "all" ? "" : `&rating=${ratingFilter}`}`
          }
          className="rounded border px-3 py-2"
        >
          Refresh Queue
        </Link>
      </div>

      {serializedQueue.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-sm text-slate-600">
          {ratingFilter === "all"
            ? mode === "all"
              ? "Нет карточек для общего повторения."
              : "На сейчас нет карточек для общего повторения."
            : `Нет карточек с последней оценкой ${ratingFilter}.`}
        </div>
      ) : (
        <ReviewClient
          deckId=""
          initialQueue={serializedQueue}
          returnHref={
            mode === "today"
              ? `/review/all?newLimit=${newLimit}&mode=today${ratingFilter === "all" ? "" : `&rating=${ratingFilter}`}`
              : `/review/all?mode=all${ratingFilter === "all" ? "" : `&rating=${ratingFilter}`}`
          }
          returnLabel="Back to Global Review"
        />
      )}
    </div>
  );
}

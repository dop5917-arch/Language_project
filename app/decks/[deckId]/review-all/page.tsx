import Link from "next/link";
import { notFound } from "next/navigation";
import ReviewClient from "@/components/ReviewClient";
import { prisma } from "@/lib/prisma";
import { filterQueueByLatestRating, getFullDeckQueue, type RatingFilter } from "@/lib/srs";

type Props = {
  params: { deckId: string };
  searchParams?: { rating?: string };
};

export const dynamic = "force-dynamic";

export default async function ReviewAllPage({ params, searchParams }: Props) {
  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } });
  if (!deck) notFound();

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

  const queue = await getFullDeckQueue(deck.id);
  const filteredQueue = await filterQueueByLatestRating(queue, ratingFilter);
  const serializedQueue = filteredQueue.map((item) => ({
    id: item.card.id,
    deckId: item.card.deckId,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Review All: {deck.name}</h1>
          <p className="text-sm text-slate-600">Повторение всех карточек в колоде подряд</p>
        </div>
        <Link href={`/decks/${deck.id}`} className="text-sm">
          Back to deck
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {(["all", "Difficult", "Learned"] as const).map((value) => (
          <Link
            key={value}
            href={
              value === "all"
                ? `/decks/${deck.id}/review-all`
                : `/decks/${deck.id}/review-all?rating=${value}`
            }
            className={`rounded border px-3 py-2 ${
              ratingFilter === value ? "border-blue-600 bg-blue-50 text-blue-700" : ""
            }`}
          >
            {value === "all" ? "All cards" : value}
          </Link>
        ))}
      </div>

      {serializedQueue.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-sm text-slate-600">
          {ratingFilter === "all"
            ? "В этой колоде пока нет карточек."
            : `Нет карточек с последней оценкой ${ratingFilter}.`}
        </div>
      ) : (
        <ReviewClient
          deckId={deck.id}
          initialQueue={serializedQueue}
          returnHref={
            ratingFilter === "all"
              ? `/decks/${deck.id}/review-all`
              : `/decks/${deck.id}/review-all?rating=${ratingFilter}`
          }
          returnLabel="Back to Review All"
        />
      )}
    </div>
  );
}

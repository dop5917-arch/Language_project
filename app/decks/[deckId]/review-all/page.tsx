import Link from "next/link";
import { notFound } from "next/navigation";
import ReviewClient from "@/components/ReviewClient";
import { prisma } from "@/lib/prisma";
import { filterQueueByLatestRating, getFullDeckQueue, type RatingFilter } from "@/lib/srs";

type Props = {
  params: { deckId: string };
  searchParams?: { rating?: string; resume?: string };
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
  const resume = searchParams?.resume === "1";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E5E7EB]">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Повторение: {deck.name}</h1>
          <p className="text-sm text-[#64748B]">Повторение всех карточек в колоде подряд</p>
        </div>
        <Link href={`/decks/${deck.id}`} className="text-sm text-[#059669] hover:text-[#047857]">
          Назад в колоду
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {(["Difficult", "Learned"] as const).map((value) => (
          <Link
            key={value}
            href={`/decks/${deck.id}/review-all?rating=${value}`}
            className={`rounded-xl px-3 py-2 ${
              ratingFilter === value
                ? "bg-[#ECFDF5] text-[#065F46]"
                : "bg-white text-[#0F172A] ring-1 ring-[#E5E7EB]"
            }`}
          >
            {value === "Difficult" ? "Трудные" : "Выученные"}
          </Link>
        ))}
        <Link
          href={`/decks/${deck.id}/review-all`}
          className={`rounded-xl px-3 py-2 ${
            ratingFilter === "all" ? "bg-[#ECFDF5] text-[#065F46]" : "bg-white text-[#0F172A] ring-1 ring-[#E5E7EB]"
          }`}
        >
          Все карточки
        </Link>
      </div>

      {serializedQueue.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-sm text-[#64748B] shadow-sm ring-1 ring-[#E5E7EB]">
          {ratingFilter === "all"
            ? "В этой колоде пока нет карточек."
            : `Нет карточек с последней оценкой ${ratingFilter}.`}
        </div>
      ) : (
        <ReviewClient
          deckId={deck.id}
          deckName={deck.name}
          modeLabel={ratingFilter === "all" ? "All cards" : ratingFilter}
          initialQueue={serializedQueue}
          enableResume={resume}
          sessionKey={`deck:${deck.id}:review-all:${ratingFilter}`}
          returnHref={
            ratingFilter === "all"
              ? `/decks/${deck.id}/review-all`
              : `/decks/${deck.id}/review-all?rating=${ratingFilter}`
          }
          returnLabel="Назад к режимам"
        />
      )}
    </div>
  );
}

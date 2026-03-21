import Link from "next/link";
import { notFound } from "next/navigation";
import ReviewClient from "@/components/ReviewClient";
import { prisma } from "@/lib/prisma";
import { getDueOnlyQueue, getTodayQueue } from "@/lib/srs";

type Props = {
  params: { deckId: string };
  searchParams?: { newLimit?: string; resume?: string; includeNew?: string };
};

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params, searchParams }: Props) {
  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } });
  if (!deck) notFound();

  const newLimit = Math.max(1, Math.min(100, Number(searchParams?.newLimit ?? 20) || 20));
  const includeNew = searchParams?.includeNew === "1";
  const queue = includeNew
    ? await getTodayQueue(deck.id, new Date(), newLimit)
    : await getDueOnlyQueue(deck.id, new Date());

  const serializedQueue = queue.map((item) => ({
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {includeNew ? "Review (Due + New)" : "Review (Due Only)"}: {deck.name}
        </h1>
        <Link href={`/decks/${deck.id}/today`} className="text-sm">
          Back to Today
        </Link>
      </div>
      <ReviewClient
        deckId={deck.id}
        initialQueue={serializedQueue}
        enableResume={resume}
        sessionKey={`deck:${deck.id}:review-today:${newLimit}`}
      />
    </div>
  );
}

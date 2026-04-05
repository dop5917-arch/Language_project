import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import ReviewClient from "@/components/ReviewClient";
import { prisma } from "@/lib/prisma";
import { getDueOnlyQueue, getTodayQueue } from "@/lib/srs";
import { normalizeDueLimit, REVIEW_DUE_LIMIT_COOKIE } from "@/lib/review-settings";

type Props = {
  params: { deckId: string };
  searchParams?: { newLimit?: string; dueLimit?: string; resume?: string; includeNew?: string };
};

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params, searchParams }: Props) {
  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } });
  if (!deck) notFound();

  const newLimit = Math.max(1, Math.min(100, Number(searchParams?.newLimit ?? 20) || 20));
  const dueLimit = normalizeDueLimit(
    searchParams?.dueLimit ?? cookies().get(REVIEW_DUE_LIMIT_COOKIE)?.value
  );
  const includeNew = searchParams?.includeNew === "1";
  const queue = includeNew
    ? await getTodayQueue(deck.id, new Date(), newLimit, dueLimit)
    : await getDueOnlyQueue(deck.id, new Date(), dueLimit);

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
      <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E5E7EB]">
        <h1 className="text-2xl font-semibold text-[#0F172A]">
          {includeNew ? "Review (Due + New)" : "Review (Due Only)"}
        </h1>
        <Link href={`/decks/${deck.id}/today`} className="text-sm text-[#059669] hover:text-[#047857]">
          Back to Today
        </Link>
      </div>
      <ReviewClient
        deckId={deck.id}
        deckName={deck.name}
        modeLabel={includeNew ? "Due + New" : "Due only"}
        initialQueue={serializedQueue}
        enableResume={resume}
        sessionKey={`deck:${deck.id}:review-today:${newLimit}`}
      />
    </div>
  );
}

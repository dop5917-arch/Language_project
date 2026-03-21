import Link from "next/link";
import { notFound } from "next/navigation";
import DeckAddMenu from "@/components/DeckAddMenu";
import { prisma } from "@/lib/prisma";

type Props = {
  params: { deckId: string };
};

export const dynamic = "force-dynamic";

export default async function DeckDetailPage({ params }: Props) {
  const deck = await prisma.deck.findUnique({
    where: { id: params.deckId },
    include: {
      cards: {
        include: { reviewState: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!deck) notFound();

  await prisma.deck.update({
    where: { id: params.deckId },
    data: { updatedAt: new Date() }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{deck.name}</h1>
          <p className="text-sm text-slate-600">{deck.cards.length} cards</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/decks/${deck.id}/today`} className="rounded border px-3 py-2 text-sm">
            Today
          </Link>
          <Link href={`/decks/${deck.id}/review-all`} className="rounded border px-3 py-2 text-sm">
            Anytime (All)
          </Link>
          <Link
            href={`/decks/${deck.id}/review-all?rating=Difficult`}
            className="rounded border px-3 py-2 text-sm"
          >
            Difficult
          </Link>
          <Link
            href={`/decks/${deck.id}/review-all?rating=Learned`}
            className="rounded border px-3 py-2 text-sm"
          >
            Learned
          </Link>
          <DeckAddMenu deckId={deck.id} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Front</th>
              <th className="px-3 py-2">Back</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deck.cards.map((card) => (
              <tr key={card.id} className="border-t align-top">
                <td className="px-3 py-2">{card.frontText}</td>
                <td className="px-3 py-2 text-slate-700">{card.backText}</td>
                <td className="px-3 py-2">
                  <Link href={`/decks/${deck.id}/cards/${card.id}/edit`} className="rounded border px-2 py-1 text-xs">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {deck.cards.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-600" colSpan={3}>
                  No cards yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

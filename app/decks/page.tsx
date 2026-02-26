import Link from "next/link";
import { createDeckAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const decks = await prisma.deck.findMany({
    include: {
      _count: {
        select: { cards: true }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  return (
    <div className="space-y-8">
      <section className="rounded-lg border bg-white p-4">
        <h1 className="text-xl font-semibold">Decks</h1>
        <form action={createDeckAction} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            name="name"
            placeholder="New deck name"
            className="flex-1 rounded border px-3 py-2"
            required
          />
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
            Create Deck
          </button>
        </form>
      </section>

      <section className="space-y-3">
        {decks.length === 0 ? (
          <p className="text-sm text-slate-600">No decks yet.</p>
        ) : (
          decks.map((deck) => (
            <div key={deck.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Link href={`/decks/${deck.id}`} className="text-lg font-medium text-slate-900">
                    {deck.name}
                  </Link>
                  <p className="text-sm text-slate-600">{deck._count.cards} cards</p>
                </div>
                <Link
                  href={`/decks/${deck.id}/today`}
                  className="rounded border px-3 py-2 text-sm font-medium"
                >
                  Study Today
                </Link>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

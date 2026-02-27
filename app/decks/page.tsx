import Link from "next/link";
import { createDeckAction, deleteDeckAction, renameDeckAction } from "@/lib/actions";
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
          <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800">
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
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Link href={`/decks/${deck.id}`} className="text-lg font-medium text-slate-900">
                    {deck.name}
                  </Link>
                  <p className="text-sm text-slate-600">{deck._count.cards} cards</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/decks/${deck.id}/today`}
                    className="rounded border px-3 py-2 text-sm font-medium"
                  >
                    Study Today
                  </Link>
                  <details className="relative">
                    <summary className="cursor-pointer list-none rounded border px-3 py-2 text-sm">
                      ⋯
                    </summary>
                    <div className="absolute right-0 z-10 mt-2 w-72 space-y-3 rounded-lg border bg-white p-3 shadow-lg">
                      <div>
                        <p className="mb-1 text-xs font-medium text-slate-500">Share Deck Link</p>
                        <input
                          readOnly
                          value={`/decks/${deck.id}`}
                          className="w-full rounded border bg-slate-50 px-2 py-1 text-xs"
                        />
                        <p className="mt-1 text-xs text-slate-500">Use this path on your site domain.</p>
                      </div>

                      <form action={renameDeckAction.bind(null, deck.id)} className="space-y-2">
                        <label className="block text-xs font-medium text-slate-500">Rename Deck</label>
                        <input
                          type="text"
                          name="name"
                          defaultValue={deck.name}
                          className="w-full rounded border px-2 py-1 text-sm"
                          required
                        />
                        <button type="submit" className="w-full rounded border px-3 py-2 text-sm">
                          Save New Name
                        </button>
                      </form>

                      <form action={deleteDeckAction.bind(null, deck.id)}>
                        <button
                          type="submit"
                          className="w-full rounded border border-red-300 px-3 py-2 text-sm text-red-700"
                        >
                          Delete Deck
                        </button>
                      </form>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

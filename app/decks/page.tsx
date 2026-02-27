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
            <div
              key={deck.id}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm transition hover:border-emerald-300 hover:shadow"
            >
              <Link
                href={`/decks/${deck.id}`}
                aria-label={`Open deck ${deck.name}`}
                className="absolute inset-0 rounded-lg"
              />
              <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                <div className="relative z-10 flex min-w-0 items-center gap-3">
                  <div className="truncate text-lg font-semibold text-slate-900">{deck.name}</div>
                  <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                    {deck._count.cards} cards
                  </span>
                </div>
                <div className="relative z-10 flex items-center gap-2">
                  <span className="text-sm text-slate-400 transition group-hover:text-emerald-700">→</span>
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

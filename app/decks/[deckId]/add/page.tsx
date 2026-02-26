import Link from "next/link";
import { notFound } from "next/navigation";
import { createCardAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

type Props = {
  params: { deckId: string };
};

export default async function AddCardPage({ params }: Props) {
  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } });
  if (!deck) notFound();

  const action = createCardAction.bind(null, deck.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Add Card: {deck.name}</h1>
        <Link href={`/decks/${deck.id}`} className="text-sm">
          Back to deck
        </Link>
      </div>

      <form action={action} className="space-y-4 rounded-lg border bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Target word (optional)</label>
          <input name="targetWord" type="text" className="w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Front phrase</label>
          <textarea name="frontText" className="w-full rounded border px-3 py-2" rows={2} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Back definition</label>
          <textarea name="backText" className="w-full rounded border px-3 py-2" rows={3} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Phonetic (optional)</label>
            <input name="phonetic" type="text" className="w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Audio URL (optional)</label>
            <input name="audioUrl" type="url" className="w-full rounded border px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Image URL</label>
          <input name="imageUrl" type="url" className="w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Tags (comma-separated)</label>
          <input name="tags" type="text" className="w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Level (1-10)</label>
          <input name="level" type="number" min={1} max={10} className="w-full rounded border px-3 py-2" />
        </div>
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Save Card
        </button>
      </form>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = {
  params: { deckId: string };
  searchParams?: { error?: string; imported?: string };
};

export default async function ImportPage({ params, searchParams }: Props) {
  const userId = await getCurrentUserId();
  const deck = await prisma.deck.findFirst({ where: { id: params.deckId, userId } });
  if (!deck) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Импорт CSV: {deck.name}</h1>
        <Link href={`/decks/${deck.id}`} className="text-sm">
          Назад в колоду
        </Link>
      </div>

      <div className="rounded-lg border bg-white p-4 text-sm text-slate-700">
        <p className="font-medium">Колонки CSV</p>
        <p className="mt-1">
          <code>front_text,back_text,image_url,tags,level</code>
        </p>
      </div>

      {searchParams?.error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {searchParams.error}
        </p>
      ) : null}
      {searchParams?.imported ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Импортировано карточек: {searchParams.imported}.
        </p>
      ) : null}

      <form
        action={`/api/decks/${deck.id}/import`}
        method="post"
        encType="multipart/form-data"
        className="space-y-4 rounded-lg border bg-white p-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">Загрузить CSV-файл</label>
          <input name="file" type="file" accept=".csv,text/csv" className="block w-full text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Или вставить текст CSV</label>
          <textarea
            name="csvText"
            rows={10}
            className="w-full rounded border px-3 py-2 font-mono text-sm"
            placeholder="front_text,back_text,image_url,tags,level"
          />
        </div>
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Импортировать
        </button>
      </form>
    </div>
  );
}

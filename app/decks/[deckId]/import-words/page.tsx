import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = {
  params: { deckId: string };
  searchParams?: {
    imported?: string;
    skipped?: string;
    errors?: string;
    column?: string;
    imported_examples?: string;
    skipped_examples?: string;
    error_examples?: string;
    error?: string;
  };
};

export default async function ImportWordsPage({ params, searchParams }: Props) {
  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } });
  if (!deck) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Import CSV from Google Sheets</h1>
          <p className="text-sm text-slate-600">
            Загрузи CSV как есть. Система автоматически найдет колонку с английскими словами (обычно C) и создаст карточки через Smart Add.
          </p>
        </div>
        <Link href={`/decks/${deck.id}`} className="text-sm">
          Back to deck
        </Link>
      </div>

      {searchParams?.error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {searchParams.error}
        </p>
      ) : null}

      {searchParams?.imported ? (
        <div className="space-y-2 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <p>
            Imported: {searchParams.imported}
            {searchParams.skipped ? ` • Skipped: ${searchParams.skipped}` : ""}
            {searchParams.errors ? ` • Errors: ${searchParams.errors}` : ""}
            {searchParams.column ? ` • Detected column: ${searchParams.column}` : ""}
          </p>
          {searchParams.imported_examples ? (
            <p className="text-green-800">
              Imported examples: {searchParams.imported_examples.split(" | ").join(", ")}
            </p>
          ) : null}
          {searchParams.skipped_examples ? (
            <p className="text-green-800">
              Skipped examples: {searchParams.skipped_examples.split(" | ").join(", ")}
            </p>
          ) : null}
          {searchParams.error_examples ? (
            <p className="text-green-800">
              Error examples: {searchParams.error_examples.split(" | ").join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border bg-white p-4 text-sm text-slate-700">
        <p className="font-medium">Как это работает</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Автоматически ищем колонку с английскими словами (обычно это C)</li>
          <li>Заменяем “умные” апострофы: can’t -&gt; can&apos;t</li>
          <li>Пустые строки пропускаем</li>
          <li>Неанглийские значения и повторы пропускаем</li>
          <li>Для каждого слова создаем карточку через Smart Add</li>
        </ul>
      </div>

      <form
        action={`/api/decks/${deck.id}/import-words`}
        method="post"
        encType="multipart/form-data"
        className="space-y-4 rounded-lg border bg-white p-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">CSV file</label>
          <input name="file" type="file" accept=".csv,text/csv" required className="block w-full text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Limit (optional)</label>
          <input
            name="limit"
            type="number"
            min={1}
            max={200}
            defaultValue={50}
            className="w-full rounded border px-3 py-2 sm:w-48"
          />
        </div>
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Auto Import Words
        </button>
      </form>
    </div>
  );
}

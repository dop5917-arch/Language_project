import Link from "next/link";
import { notFound } from "next/navigation";
import { updateCardAction } from "@/lib/actions";
import { getCurrentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = {
  params: { deckId: string; cardId: string };
};

export default async function EditCardPage({ params }: Props) {
  const userId = await getCurrentUserId();
  const deck = await prisma.deck.findFirst({ where: { id: params.deckId, userId } });
  if (!deck) notFound();

  const card = await prisma.card.findFirst({
    where: { id: params.cardId, deckId: params.deckId, deck: { userId } }
  });
  if (!card) notFound();

  const action = updateCardAction.bind(null, params.deckId, params.cardId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Редактировать карточку: {deck.name}</h1>
        <Link href={`/decks/${deck.id}`} className="text-sm">
          Назад в колоду
        </Link>
      </div>

      <form action={action} className="space-y-4 rounded-lg border bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Изучаемое слово (опционально)</label>
          <input
            name="targetWord"
            type="text"
            defaultValue={card.targetWord ?? ""}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Лицевая сторона</label>
          <textarea
            name="frontText"
            defaultValue={card.frontText}
            className="w-full rounded border px-3 py-2"
            rows={2}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Обратная сторона</label>
          <textarea
            name="backText"
            defaultValue={card.backText}
            className="w-full rounded border px-3 py-2"
            rows={3}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Транскрипция (опционально)</label>
            <input
              name="phonetic"
              type="text"
              defaultValue={card.phonetic ?? ""}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Ссылка на аудио (опционально)</label>
            <input
              name="audioUrl"
              type="url"
              defaultValue={card.audioUrl ?? ""}
              className="w-full rounded border px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Ссылка на картинку (опционально)</label>
          <input
            name="imageUrl"
            type="url"
            defaultValue={card.imageUrl ?? ""}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Теги (через запятую)</label>
          <input name="tags" type="text" defaultValue={card.tags ?? ""} className="w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Уровень (1-10)</label>
          <input
            name="level"
            type="number"
            min={1}
            max={10}
            defaultValue={card.level ?? ""}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
            Сохранить
          </button>
          <Link href={`/decks/${deck.id}`} className="rounded border px-4 py-2">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}

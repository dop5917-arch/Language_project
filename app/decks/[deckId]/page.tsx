import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { startOfLocalDay } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { normalizeDueLimit, REVIEW_DUE_LIMIT_COOKIE } from "@/lib/review-settings";

type Props = {
  params: { deckId: string };
};

export const dynamic = "force-dynamic";

export default async function DeckDetailPage({ params }: Props) {
  const today = startOfLocalDay(new Date());
  const dueLimit = normalizeDueLimit(cookies().get(REVIEW_DUE_LIMIT_COOKIE)?.value);
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

  const dueTodayCount = deck.cards.filter(
    (card) => card.reviewState && card.reviewState.dueDate <= today
  ).length;
  const newCardsCount = deck.cards.filter((card) => !card.reviewState).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{deck.name}</h1>
          <p className="text-sm text-slate-600">Карточек: {deck.cards.length}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {deck.cards.length > 0 ? (
            <>
              <Link
                href={`/decks/${deck.id}/review-all?resume=1`}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Продолжить
              </Link>
              <Link
                href={`/decks/${deck.id}/review-all`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Начать с начала
              </Link>
            </>
          ) : (
            <Link
              href={`/decks/${deck.id}/add-smart`}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Сначала создать карточку
            </Link>
          )}
          {dueTodayCount > 0 ? (
            <Link
              href={`/decks/${deck.id}/review?dueLimit=${dueLimit}`}
              className="rounded border px-3 py-2 text-sm"
            >
              Карточки на сегодня ({dueTodayCount})
            </Link>
          ) : (
            <span className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Карточки на сегодня (0)
            </span>
          )}
          {newCardsCount > 0 ? (
            <Link
              href={`/decks/${deck.id}/review?onlyNew=1`}
              className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
            >
              Учить новые ({newCardsCount})
            </Link>
          ) : null}
          <Link
            href={`/decks/${deck.id}/add-smart`}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            Добавить карточку с AI
          </Link>
          <Link
            href={`/decks/${deck.id}/add`}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Добавить карточку вручную
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <div className="space-y-3 p-3">
          {deck.cards.map((card) => {
            const word = (card.targetWord ?? "").trim();
            const status = !card.reviewState
              ? "Новая"
              : card.reviewState.dueDate <= today
                ? "К повтору"
                : "Изучается";
            return (
              <article key={card.id} className="rounded-xl border bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Изучаемое слово</div>
                    <div className="text-2xl font-semibold text-emerald-700">
                      {word || "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded border bg-slate-50 px-2 py-1 text-xs text-slate-700">{status}</span>
                    <Link
                      href={`/decks/${deck.id}/cards/${card.id}/edit`}
                      className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      Редактировать
                    </Link>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  <div>
                    <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Контекст (front)</div>
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-800">
                      {highlightWord(shortText(card.frontText, 180), word)}
                    </p>
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Определение (back)</div>
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                      {highlightWord(shortText(card.backText, 180), word)}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
          {deck.cards.length === 0 ? (
            <div className="rounded-xl border bg-slate-50 px-3 py-4 text-sm text-slate-600">
              Пока нет карточек.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function shortText(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 1).trimEnd()}…`;
}

function highlightWord(text: string, word: string) {
  if (!word) return text;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(re);

  return parts.map((part, index) =>
    part.toLowerCase() === word.toLowerCase() ? (
      <span key={`${part}-${index}`} className="font-semibold text-emerald-700">
        {part}
      </span>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

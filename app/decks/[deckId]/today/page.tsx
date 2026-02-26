import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatLocalDate, startOfLocalDay } from "@/lib/date";

type Props = {
  params: { deckId: string };
  searchParams?: { newLimit?: string };
};

export const dynamic = "force-dynamic";

export default async function TodayPage({ params, searchParams }: Props) {
  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } });
  if (!deck) notFound();

  const today = startOfLocalDay(new Date());
  const newLimit = Math.max(1, Math.min(100, Number(searchParams?.newLimit ?? 20) || 20));

  const [dueCount, newCount, nextDueReview] = await Promise.all([
    prisma.reviewState.count({
      where: {
        card: { deckId: deck.id },
        dueDate: { lte: today }
      }
    }),
    prisma.card.count({
      where: {
        deckId: deck.id,
        reviewState: { is: null }
      }
    }),
    prisma.reviewState.findFirst({
      where: {
        card: { deckId: deck.id },
        dueDate: { gt: today }
      },
      orderBy: { dueDate: "asc" },
      select: { dueDate: true }
    })
  ]);
  const todayTotal = dueCount + Math.min(newCount, newLimit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{deck.name} - Повторение по расписанию</h1>
          <p className="text-sm text-slate-600">
            Здесь показываются карточки, которым пора повторяться сегодня, плюс новые карточки.
          </p>
        </div>
        <Link href={`/decks/${deck.id}`} className="text-sm whitespace-nowrap">
          Back to deck
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-500">По расписанию (Due)</div>
          <div className="text-2xl font-semibold">{dueCount}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-500">Новые</div>
          <div className="text-2xl font-semibold">{Math.min(newCount, newLimit)}</div>
          <div className="text-xs text-slate-500">лимит {newLimit}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-500">Всего сейчас</div>
          <div className="text-2xl font-semibold">{todayTotal}</div>
        </div>
      </div>

      {todayTotal > 0 ? (
        <Link
          href={`/decks/${deck.id}/review?newLimit=${newLimit}`}
          className="inline-block rounded bg-blue-600 px-5 py-3 font-medium text-white"
        >
          Start (По расписанию)
        </Link>
      ) : (
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-700">На сегодня карточек по расписанию нет.</p>
          <p className="mt-1 text-sm text-slate-600">
            Это нормально: значит ты уже повторил все нужное на сегодня.
          </p>
          {nextDueReview ? (
            <p className="mt-1 text-sm text-slate-600">
              Следующее повторение ожидается: {formatLocalDate(nextDueReview.dueDate)}
            </p>
          ) : null}
        </div>
      )}

      <div className="rounded-lg border bg-slate-50 p-4">
        <div className="mb-2 text-sm font-medium text-slate-800">Хочешь повторить в любое время?</div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/decks/${deck.id}/review-all`} className="rounded border bg-white px-3 py-2 text-sm">
            Review All (вся колода)
          </Link>
          <Link href="/review/all?mode=all" className="rounded border bg-white px-3 py-2 text-sm">
            Global Review (все колоды)
          </Link>
          <Link href="/review/all?mode=today" className="rounded border bg-white px-3 py-2 text-sm">
            Global Review (по расписанию)
          </Link>
        </div>
      </div>
    </div>
  );
}

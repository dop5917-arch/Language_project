import Link from "next/link";
import { cookies } from "next/headers";
import ReviewClient from "@/components/ReviewClient";
import { prisma } from "@/lib/prisma";
import {
  filterQueueByLatestRating,
  getGlobalDueQueue,
  getGlobalFullQueue,
  getGlobalTodayQueue,
  type RatingFilter,
  type QueueItem
} from "@/lib/srs";
import { startOfLocalDay } from "@/lib/date";
import { normalizeDueLimit, REVIEW_DUE_LIMIT_COOKIE } from "@/lib/review-settings";

type Props = {
  searchParams?: { newLimit?: string; dueLimit?: string; preset?: string; include?: string };
};

export const dynamic = "force-dynamic";

export default async function GlobalReviewPage({ searchParams }: Props) {
  const newLimit = Math.max(1, Math.min(100, Number(searchParams?.newLimit ?? 20) || 20));
  const cookieStore = cookies();
  const dueLimit = normalizeDueLimit(
    searchParams?.dueLimit ?? cookieStore.get(REVIEW_DUE_LIMIT_COOKIE)?.value
  );
  const presetRaw = searchParams?.preset;
  const includeRaw = searchParams?.include ?? "";
  const includeSet =
    includeRaw.trim().length > 0
      ? new Set(
          includeRaw
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        )
      : null;
  const preset =
    presetRaw === "due" ||
    presetRaw === "daily" ||
    presetRaw === "unpassed" ||
    presetRaw === "difficult" ||
    presetRaw === "easy" ||
    presetRaw === "full"
      ? presetRaw
      : null;

  const today = startOfLocalDay(new Date());

  const [decks, dueCount, newCount, allCards, latestLogs] = await Promise.all([
    prisma.deck.findMany({ select: { id: true, name: true } }),
    prisma.reviewState.count({
      where: {
        dueDate: { lte: today }
      }
    }),
    prisma.card.count({
      where: {
        reviewState: { is: null }
      }
    }),
    prisma.card.count(),
    prisma.reviewLog.findMany({
      orderBy: { reviewedAt: "desc" },
      select: { cardId: true, rating: true }
    })
  ]);

  const latestByCard = new Map<string, string>();
  for (const log of latestLogs) {
    if (!latestByCard.has(log.cardId)) {
      latestByCard.set(log.cardId, log.rating);
    }
  }
  const latestRatings = Array.from(latestByCard.values());
  const difficultCount = latestRatings.filter((r) => r === "Again" || r === "Hard").length;
  const easyCount = latestRatings.filter((r) => r === "Easy").length;
  const unpassedCount = Math.max(0, allCards - latestRatings.length);

  if (!preset) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-semibold text-[#0F172A]">Общее повторение</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Одна сессия для карточек из всех колод. Выбери режим повторения.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ModeCard
            title="Все карточки"
            subtitle={`${allCards} шт.`}
            description="Повторить все карточки из всех колод."
            href="/review/all?preset=full"
          />
          <ModeCard
            title="Не пройдены"
            subtitle={`${unpassedCount} шт.`}
            description="Карточки, которые ещё не проходились."
            href="/review/all?preset=unpassed"
          />
          <ModeCard
            title="Трудные"
            subtitle={`${difficultCount} шт.`}
            description="Последняя оценка: Again или Hard."
            href="/review/all?preset=difficult"
          />
          <ModeCard
            title="Легкие"
            subtitle={`${easyCount} шт.`}
            description="Последняя оценка: Easy."
            href="/review/all?preset=easy"
          />
          <ModeCard
            title="По расписанию"
            subtitle={`${dueCount} шт. сейчас`}
            description={`Только карточки, которые пора повторить. За сессию не больше ${dueLimit}.`}
            href={`/review/all?preset=due&dueLimit=${dueLimit}`}
          />
          <ModeCard
            title="Быстрый день"
            subtitle={`К повтору ${dueCount} • Новые ${Math.min(newCount, newLimit)} (лимит ${newLimit})`}
            description={`Карточки на сегодня из всех колод. Повторов не больше ${dueLimit}.`}
            href={`/review/all?preset=daily&newLimit=${newLimit}&dueLimit=${dueLimit}`}
          />
        </div>
      </div>
    );
  }

  let baseQueue: QueueItem[] = [];
  let ratingFilter: RatingFilter = "all";
  let modeTitle = "Общее повторение";
  let modeDescription = "";

  if (preset === "due") {
    baseQueue = await getGlobalDueQueue(new Date(), dueLimit);
    if (includeSet && includeSet.size > 0) {
      baseQueue = baseQueue.filter((item) => includeSet.has(item.card.id));
    }
    ratingFilter = "all";
    modeTitle = "По расписанию";
    modeDescription = `Только карточки по расписанию (без новых). Лимит на сессию: ${dueLimit}.`;
  }
  if (preset === "daily") {
    baseQueue = await getGlobalTodayQueue(new Date(), newLimit, dueLimit);
    ratingFilter = "all";
    modeTitle = "Быстрый день";
    modeDescription = `Карточки на сегодня + ограниченное число новых. Повторов: до ${dueLimit}.`;
  }
  if (preset === "difficult") {
    baseQueue = await getGlobalFullQueue();
    ratingFilter = "Difficult";
    modeTitle = "Трудные";
    modeDescription = "Только трудные карточки (Again/Hard).";
  }
  if (preset === "unpassed") {
    baseQueue = await getGlobalFullQueue();
    ratingFilter = "Unpassed";
    modeTitle = "Не пройдены";
    modeDescription = "Карточки, которые ещё не проходились.";
  }
  if (preset === "easy") {
    baseQueue = await getGlobalFullQueue();
    ratingFilter = "Learned";
    modeTitle = "Легкие";
    modeDescription = "Карточки с уверенным вспоминанием (Easy).";
  }
  if (preset === "full") {
    baseQueue = await getGlobalFullQueue();
    ratingFilter = "all";
    modeTitle = "Все карточки";
    modeDescription = "Все карточки из всех колод в одной сессии.";
  }

  const queue = await filterQueueByLatestRating(baseQueue, ratingFilter);

  const deckNameById = new Map(decks.map((deck) => [deck.id, deck.name]));
  const serializedQueue = queue.map((item) => ({
    id: item.card.id,
    deckId: item.card.deckId,
    deckName: deckNameById.get(item.card.deckId) ?? "Unknown deck",
    targetWord: item.card.targetWord,
    phonetic: item.card.phonetic,
    audioUrl: item.card.audioUrl,
    frontText: item.card.frontText,
    backText: item.card.backText,
    imageUrl: item.card.imageUrl,
    tags: item.card.tags,
    level: item.card.level,
    isNew: item.isNew
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E5E7EB]">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A]">{modeTitle}</h1>
          <p className="text-sm text-[#64748B]">{modeDescription}</p>
        </div>
        <Link href="/review/all" className="rounded-xl bg-white px-3 py-2 text-sm text-[#0F172A] ring-1 ring-[#E5E7EB]">
          Сменить режим
        </Link>
      </div>

      {serializedQueue.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-sm text-[#64748B] shadow-sm ring-1 ring-[#E5E7EB]">
          Сейчас нет карточек для этого режима.
        </div>
      ) : (
        <ReviewClient
          deckId=""
          deckName="Global Review"
          modeLabel={modeTitle}
          initialQueue={serializedQueue}
          returnHref="/review/all"
          returnLabel="Назад к режимам"
        />
      )}
    </div>
  );
}

function ModeCard({
  title,
  subtitle,
  description,
  href
}: {
  title: string;
  subtitle: string;
  description: string;
  href: string;
}) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E5E7EB]">
      <h2 className="text-lg font-semibold text-[#0F172A]">{title}</h2>
      <p className="mt-1 text-xs uppercase tracking-wide text-[#64748B]">{subtitle}</p>
      <p className="mt-2 text-sm text-[#64748B]">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-block rounded-xl bg-[#059669] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#047857]"
      >
        Начать
      </Link>
    </article>
  );
}

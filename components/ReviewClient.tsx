"use client";

import { useEffect, useMemo, useState } from "react";

type Rating = "Again" | "Hard" | "Good" | "Easy";

type QueueCard = {
  id: string;
  deckId: string;
  deckName?: string;
  targetWord?: string | null;
  phonetic?: string | null;
  frontText: string;
  backText: string;
  imageUrl: string | null;
  tags: string | null;
  level: number | null;
  isNew: boolean;
};

type SessionResultItem = {
  cardId: string;
  card: QueueCard;
  rating: Rating;
};

type AgainHelpState = {
  card: QueueCard;
  examples: string[];
  definitions: string[];
  imageOptions: string[];
  exampleIndex: number;
  definitionIndex: number;
  imageIndex: number;
};

type FrontHintState = {
  cardId: string;
  examples: string[];
  index: number;
};

type Props = {
  deckId: string;
  initialQueue: QueueCard[];
  returnHref?: string;
  returnLabel?: string;
  sessionKey?: string;
  enableResume?: boolean;
  deckName?: string;
  modeLabel?: string;
};

type WordMeaningItem = {
  partOfSpeech: string;
  definitionEn: string;
  exampleEn?: string;
};

type WordMeaningResponse = {
  word: string;
  phonetic?: string;
  ruVariants?: string[];
  ruDictionary?: Array<{ partOfSpeech: string; terms: string[] }>;
  meanings: WordMeaningItem[];
};

const ratingControls: Array<{ label: string; hint: string; rating: Rating; className: string }> = [
  {
    label: "Не знаю",
    hint: "Показать позже снова",
    rating: "Again",
    className: "bg-[#FFFFFF] text-[#111111] ring-1 ring-[#E5E7EB] hover:bg-[#F5F5F5]"
  },
  {
    label: "Знаю",
    hint: "Перейти дальше",
    rating: "Easy",
    className: "bg-[#059669] text-white hover:bg-[#047857]"
  }
];

export default function ReviewClient({
  deckId,
  initialQueue,
  returnHref,
  returnLabel,
  sessionKey,
  enableResume = false,
  deckName,
  modeLabel
}: Props) {
  const cardTextClass =
    "font-card text-[clamp(1.2rem,2.2vw,1.9rem)] font-semibold leading-snug break-words [overflow-wrap:anywhere]";
  const [queue, setQueue] = useState(initialQueue);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionResults, setSessionResults] = useState<SessionResultItem[]>([]);
  const [againHelp, setAgainHelp] = useState<AgainHelpState | null>(null);
  const [frontHint, setFrontHint] = useState<FrontHintState | null>(null);
  const [meaningModalOpen, setMeaningModalOpen] = useState(false);
  const [meaningLoading, setMeaningLoading] = useState(false);
  const [meaningError, setMeaningError] = useState<string | null>(null);
  const [meaningData, setMeaningData] = useState<WordMeaningResponse | null>(null);
  const [meaningCache, setMeaningCache] = useState<Record<string, WordMeaningResponse>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;
      if (submitting) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setFlipped(false);
        setAgainHelp(null);
        setFrontHint(null);
        setMeaningModalOpen(false);
        setIndex((value) => Math.max(0, value - 1));
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setFlipped(false);
        setAgainHelp(null);
        setFrontHint(null);
        setMeaningModalOpen(false);
        setIndex((value) => Math.min(queue.length, value + 1));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [queue.length, submitting]);

  const current = queue[index] ?? null;
  const backDetails = useMemo(
    () => (current ? parseCardBackDetails(current) : null),
    [current]
  );
  const frontDetails = useMemo(
    () => (current ? parseCardFrontDetails(current) : null),
    [current]
  );
  const remaining = useMemo(() => Math.max(0, queue.length - index), [queue.length, index]);
  const position = Math.min(index + 1, queue.length);
  const finalHref = returnHref ?? `/decks/${deckId}/today`;
  const finalLabel = returnLabel ?? "На главную";
  const isAgainHelpOpenForCurrent = Boolean(againHelp && current && againHelp.card.id === current.id);
  const progressStorageKey = `review-progress:${sessionKey ?? deckId}`;

  useEffect(() => {
    if (!enableResume || !mounted) return;
    if (queue.length === 0) return;
    try {
      const raw = window.localStorage.getItem(progressStorageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { index?: number; queueIds?: string[] };
      if (!Array.isArray(saved.queueIds)) return;
      const currentIds = queue.map((item) => item.id);
      if (saved.queueIds.join("|") !== currentIds.join("|")) return;
      const savedIndex = typeof saved.index === "number" ? saved.index : 0;
      if (savedIndex > 0 && savedIndex < queue.length) {
        setIndex(savedIndex);
      }
    } catch {
      // ignore restore errors
    }
    // restore only once on mount/queue load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableResume, mounted, queue.length, progressStorageKey]);

  useEffect(() => {
    if (!enableResume || !mounted) return;
    try {
      if (index >= queue.length) {
        window.localStorage.removeItem(progressStorageKey);
        return;
      }
      window.localStorage.setItem(
        progressStorageKey,
        JSON.stringify({
          index,
          queueIds: queue.map((item) => item.id)
        })
      );
    } catch {
      // ignore persist errors
    }
  }, [enableResume, mounted, index, queue, progressStorageKey]);

  if (!mounted) {
    return <div className="rounded-lg border bg-white p-6 text-sm">Загрузка повторения...</div>;
  }

  async function rate(rating: Rating) {
    if (!current || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/review-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: current.id,
          rating
        })
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to rate card");
      }

      setDone((value) => value + 1);
      setFlipped(false);
      setSessionResults((prev) => [
        ...prev,
        {
          cardId: current.id,
          card: current,
          rating
        }
      ]);

      setIndex((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  function continueAfterAgainHelp() {
    setAgainHelp(null);
    setIndex((value) => value + 1);
  }

  function goPrev() {
    setFlipped(false);
    setAgainHelp(null);
    setFrontHint(null);
    setMeaningModalOpen(false);
    setIndex((value) => Math.max(0, value - 1));
  }

  function goNext() {
    setFlipped(false);
    setAgainHelp(null);
    setFrontHint(null);
    setMeaningModalOpen(false);
    setIndex((value) => Math.min(queue.length, value + 1));
  }

  function openFrontHint() {
    if (!current) return;
    const front = parseCardFrontDetails(current);
    const examples = front.hint ? [front.hint] : [];
    if (examples.length === 0) return;
    setFrontHint((prev) => {
      if (prev && prev.cardId === current.id) {
        return { ...prev, index: (prev.index + 1) % prev.examples.length };
      }
      return { cardId: current.id, examples, index: 0 };
    });
  }

  async function openWordMeaning() {
    if (!current) return;
    const word = resolveStudyWord(current);
    if (!word) return;

    setMeaningModalOpen(true);
    setMeaningError(null);
    const fromCard = parseCardBackDetails(current);
    if (fromCard.ruMeanings.length > 0) {
      const fromAiCard: WordMeaningResponse = {
        word: fromCard.word || word,
        ruVariants: fromCard.ruMeanings,
        ruDictionary: [{ partOfSpeech: "from-card", terms: fromCard.ruMeanings }],
        meanings: fromCard.definitionEn
          ? [
              {
                partOfSpeech: "meaning",
                definitionEn: fromCard.definitionEn
              }
            ]
          : []
      };
      setMeaningData(fromAiCard);
      setMeaningCache((prev) => ({ ...prev, [word]: fromAiCard }));
      return;
    }

    if (meaningCache[word]) {
      setMeaningData(meaningCache[word]);
      return;
    }

    setMeaningLoading(true);
    try {
      const res = await fetch(`/api/word-meaning?word=${encodeURIComponent(word)}`);
      const data = (await res.json()) as WordMeaningResponse & { error?: string };
      if (!res.ok || !data.meanings) {
        throw new Error(data.error ?? "Failed to load word meanings");
      }
      setMeaningCache((prev) => ({ ...prev, [word]: data }));
      setMeaningData(data);
    } catch (err) {
      setMeaningError(err instanceof Error ? err.message : "Failed to load word meanings");
    } finally {
      setMeaningLoading(false);
    }
  }

  if (!current) {
    if (queue.length === 0 && done === 0) {
      return (
        <div className="space-y-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-[#E5E7EB]">
          <h2 className="text-2xl font-semibold text-[#0F172A]">Сейчас карточек нет</h2>
          <p className="text-[15px] text-[#64748B]">В этой сессии сейчас нет карточек. Добавь карточки или выбери другой режим повторения.</p>
          <a
            href={finalHref}
            className="inline-flex rounded-xl bg-[#059669] px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#047857]"
          >
            {finalLabel}
          </a>
        </div>
      );
    }

    const uniqueLatestResults = Array.from(
      new Map(sessionResults.map((item) => [item.cardId, item])).values()
    );
    const ratedCardIds = new Set(uniqueLatestResults.map((item) => item.cardId));
    const notRemembered = uniqueLatestResults.filter((item) => item.rating === "Again");
    const remembered = uniqueLatestResults.filter(
      (item) => item.rating === "Good" || item.rating === "Easy"
    );
    const skipped = queue
      .filter((item) => !ratedCardIds.has(item.id))
      .map((item) => ({ cardId: item.id, card: item, rating: "Again" as Rating }));
    const percent =
      uniqueLatestResults.length > 0
        ? Math.round((remembered.length / uniqueLatestResults.length) * 100)
        : 0;

    function startRetrySession(target: "Again") {
      const subset = uniqueLatestResults
        .filter((item) => item.rating === target)
        .map((item) => ({ ...item.card, isNew: false }));

      if (subset.length === 0) return;

      setQueue(subset);
      setIndex(0);
      setDone(0);
      setFlipped(false);
      setError(null);
      setSessionResults([]);
      setAgainHelp(null);
    }

    function startRetryAllSession() {
      const subset = [
        ...uniqueLatestResults.map((item) => ({ ...item.card, isNew: false })),
        ...skipped.map((item) => ({ ...item.card, isNew: false }))
      ];
      if (subset.length === 0) return;

      setQueue(subset);
      setIndex(0);
      setDone(0);
      setFlipped(false);
      setError(null);
      setSessionResults([]);
      setAgainHelp(null);
    }

    function startRetrySkippedSession() {
      const subset = skipped.map((item) => ({ ...item.card, isNew: false }));
      if (subset.length === 0) return;

      setQueue(subset);
      setIndex(0);
      setDone(0);
      setFlipped(false);
      setError(null);
      setSessionResults([]);
      setAgainHelp(null);
    }

    return (
      <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#E5E7EB]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-[#0F172A]">Результат сессии</h2>
            <p className="text-sm text-[#64748B]">Карточек пройдено: {done}</p>
          </div>
          <div className="rounded-xl bg-[#F1F5F9] px-4 py-3 text-center ring-1 ring-[#E5E7EB]">
            <div className="text-xs uppercase tracking-wide text-[#64748B]">Запоминание</div>
            <div className="text-2xl font-semibold text-[#0F172A]">{percent}%</div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <CollapsibleResultList title="Не вспомнил" items={notRemembered} />
          <CollapsibleResultList title="Пропустил" items={skipped} />
          <CollapsibleResultList title="Вспомнил" items={remembered} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => startRetrySession("Again")}
            disabled={notRemembered.length === 0}
            className="rounded-xl bg-[#059669] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#047857] disabled:opacity-50"
          >
            Повторить только "Не вспомнил"
          </button>
          <button
            type="button"
            onClick={startRetrySkippedSession}
            disabled={skipped.length === 0}
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#0F172A] ring-1 ring-[#E5E7EB] transition-colors duration-200 hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            Повторить "Пропустил"
          </button>
          <button
            type="button"
            onClick={startRetryAllSession}
            disabled={uniqueLatestResults.length === 0}
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#0F172A] ring-1 ring-[#E5E7EB] transition-colors duration-200 hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            Повторить все
          </button>
        </div>

        <a
          href={finalHref}
          className="inline-flex rounded-xl bg-[#059669] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#047857]"
        >
          {finalLabel}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-0 rounded-2xl bg-[#FAFAFA] md:p-0">
      <div className="w-full">
        <section className="mx-auto w-full max-w-[1400px] px-3 py-8 sm:px-4 lg:px-6">
          <div className="space-y-8">
            <header className="space-y-2">
              <h1 className="text-[30px] font-semibold leading-tight text-[#111111]">
                {deckName || current.deckName || "Карточки"}
              </h1>
              <p className="text-[14px] text-[#6B7280]">
                {modeLabel || "Сессия повторения"}
              </p>
              <p className="text-[14px] text-[#6B7280]">
                {position} / {queue.length}
              </p>
            </header>

            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] sm:p-8">

            {current.phonetic ? (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-[#F1F5F9] px-3 py-2 text-sm text-[#0F172A]">
                <span className="font-medium">Транскрипция:</span>
                <span className="text-[#64748B]">{current.phonetic}</span>
              </div>
            ) : null}

            <div className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_150px] md:items-stretch">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setFlipped((prev) => !prev)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFlipped((prev) => !prev);
                  }
                }}
                className="relative min-h-[420px] w-full cursor-pointer text-left md:min-h-[520px]"
              >
                <div
                  aria-hidden={flipped}
                  className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-5 text-center shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:-translate-y-0.5 motion-reduce:transition-none sm:p-8 ${
                    flipped ? "pointer-events-none translate-y-1 opacity-0" : "pointer-events-auto translate-y-0 opacity-100"
                  }`}
                >
                  {(current.phonetic || backDetails?.transcription) ? (
                    <div className="absolute left-4 top-4 z-20 rounded-xl bg-[#F5F5F5] px-3 py-2 text-sm text-[#64748B]">
                      {current.phonetic || backDetails?.transcription}
                    </div>
                  ) : null}
                  {frontDetails?.hint ? (
                    <button
                      type="button"
                      aria-label="Подсказка"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openFrontHint();
                      }}
                      title="Подсказка"
                      className="absolute bottom-4 left-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#111111] shadow-sm ring-1 ring-[#E5E7EB] transition-colors duration-150 hover:bg-[#F8FAFC] sm:bottom-6 sm:left-6"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4.5 w-4.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 18h6" />
                        <path d="M10 21h4" />
                        <path d="M8.2 14.4A6.5 6.5 0 1 1 15.8 14.4c-.7.62-1.16 1.45-1.32 2.35l-.05.25h-4.86l-.05-.25c-.16-.9-.62-1.73-1.32-2.35Z" />
                      </svg>
                    </button>
                  ) : null}
                  <div className="space-y-4">
                    <p className={cardTextClass}>
                      {renderHighlightedText(frontDetails?.sentence || current.frontText, resolveStudyWord(current))}
                    </p>
                  </div>
                  {frontHint && frontHint.cardId === current.id ? (
                    <div className="absolute inset-x-4 bottom-4 text-sm text-[#6B7280] sm:inset-x-6 sm:bottom-6">
                      {renderHighlightedText(frontHint.examples[frontHint.index], resolveStudyWord(current))}
                    </div>
                  ) : null}
                </div>

                <div
                  aria-hidden={!flipped}
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-5 text-center shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:-translate-y-0.5 motion-reduce:transition-none sm:p-8 ${
                    flipped ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
                  }`}
                >
                <div className="w-full max-w-4xl space-y-6">
                  <p className={cardTextClass}>
                    {renderHighlightedText(
                      `${backDetails?.word || resolveStudyWord(current)} — ${
                        backDetails?.definitionEn || "основное значение"
                        }`,
                        resolveStudyWord(current),
                        { interactive: true, onWordClick: openWordMeaning }
                      )}
                    </p>
                  <p className="text-[clamp(1rem,2vw,1.125rem)] leading-relaxed break-words text-[#6B7280]">
                    {renderHighlightedText(backDetails?.example || buildBackContextExample(current), resolveStudyWord(current))}
                  </p>
                  {backDetails?.synonyms?.length ||
                  backDetails?.emojiCue?.length ||
                  backDetails?.frequency ||
                  backDetails?.usageDomain?.length ? (
                    <div className="mx-auto w-full max-w-3xl space-y-2 text-left">
                      {backDetails?.synonyms && backDetails.synonyms.length > 0 ? (
                        <div className="flex items-start gap-3 rounded-xl bg-[#F5F5F5] px-4 py-3 text-sm text-[#111111]">
                          <span className="min-w-24 text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
                            Синонимы
                          </span>
                          <span className="break-words">{backDetails.synonyms.join(" • ")}</span>
                        </div>
                      ) : null}
                      {backDetails?.emojiCue && backDetails.emojiCue.length > 0 ? (
                        <div className="flex items-start gap-3 rounded-xl bg-[#F5F5F5] px-4 py-3 text-sm text-[#111111]">
                          <span className="min-w-24 text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
                            Эмодзи
                          </span>
                          <span className="text-2xl leading-none">{backDetails.emojiCue.join(" ")}</span>
                        </div>
                      ) : null}
                      {backDetails?.frequency
                        ? (() => {
                            const frequency = backDetails.frequency;
                            return (
                              <div className="flex items-start gap-3 rounded-xl bg-[#F5F5F5] px-4 py-3 text-sm text-[#111111]">
                                <span className="min-w-24 text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
                                  Популярность
                                </span>
                                <span className="flex items-center gap-1.5">
                                  {Array.from({ length: 5 }, (_, index) => (
                                    <span
                                      key={`freq-dot-${index}`}
                                      className={`h-2.5 w-2.5 rounded-full ${
                                        index < frequency ? "bg-[#059669]" : "bg-[#D1D5DB]"
                                      }`}
                                    />
                                  ))}
                                </span>
                              </div>
                            );
                          })()
                        : null}
                      {backDetails?.usageDomain && backDetails.usageDomain.length > 0 ? (
                        <div className="flex items-start gap-3 rounded-xl bg-[#F5F5F5] px-4 py-3 text-sm text-[#111111]">
                          <span className="min-w-24 text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
                            Сфера
                          </span>
                          <span className="break-words">{backDetails.usageDomain.join(" • ")}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-1 md:gap-2 md:py-0.5">
                {ratingControls.map((control) => (
                  <button
                    key={flipped ? control.label : `front-${control.label}`}
                    type="button"
                    disabled={submitting || (flipped && isAgainHelpOpenForCurrent)}
                    onClick={() => rate(control.rating)}
                    className={`h-full min-h-[48px] rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold transition-all duration-150 ease-out disabled:opacity-50 ${control.className}`}
                  >
                    <div>{control.label}</div>
                    <div className="text-[12px] font-normal opacity-80">{control.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 h-[6px] overflow-hidden rounded-full bg-[#E5E7EB]">
              <div
                className="h-full bg-[#111111]"
                style={{ width: `${Math.round((done / Math.max(1, queue.length)) * 100)}%` }}
              />
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={index <= 0 || submitting}
                className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-medium text-[#111111] hover:bg-[#F5F5F5] disabled:opacity-50"
              >
                ← Назад
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={submitting || index >= queue.length - 1}
                className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-medium text-[#111111] hover:bg-[#F5F5F5] disabled:opacity-50"
              >
                Вперед →
              </button>
            </div>
            </div>

            {current.imageUrl && flipped ? (
              <img src={current.imageUrl} alt="" className="mt-5 max-h-64 w-full rounded-xl object-cover ring-1 ring-[#E5E7EB]" />
            ) : null}

            {againHelp && againHelp.card.id === current.id ? (
              <div className="mt-5 rounded-2xl bg-[#F1F5F9] p-4 ring-1 ring-[#E5E7EB]">
                <div className="mb-2 text-sm font-semibold text-[#0F172A]">Нужна ещё подсказка?</div>
                <div className="space-y-3">
                  <div className="rounded-xl bg-white p-3 ring-1 ring-[#E5E7EB]">
                    <div className="mb-1 text-xs uppercase tracking-wide text-[#64748B]">Пример</div>
                    <p className="text-sm">{againHelp.examples[againHelp.exampleIndex]}</p>
                  </div>
                  <div className="rounded-xl bg-white p-3 ring-1 ring-[#E5E7EB]">
                    <div className="mb-1 text-xs uppercase tracking-wide text-[#64748B]">Простое объяснение</div>
                    <p className="text-sm">{againHelp.definitions[againHelp.definitionIndex]}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={continueAfterAgainHelp}
                    className="rounded-xl bg-[#059669] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#047857]"
                  >
                    Продолжить
                  </button>
                  <button
                    type="button"
                    onClick={continueAfterAgainHelp}
                    className="rounded-xl bg-white px-4 py-2 text-sm text-[#0F172A] ring-1 ring-[#E5E7EB] transition-colors duration-200 hover:bg-[#F8FAFC]"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          {error ? <p className="text-sm text-[#EF4444]">{error}</p> : null}
        </section>

      </div>

      {meaningModalOpen ? (
        <>
          <button
            type="button"
            aria-label="Закрыть словарь"
            onClick={() => setMeaningModalOpen(false)}
            className="fixed inset-0 z-[300] bg-black/30"
          />
          <div className="fixed left-1/2 top-1/2 z-[310] w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-[#E5E7EB]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#0F172A]">
                  {meaningData?.word ?? resolveStudyWord(current)}
                  {meaningData?.phonetic ? <span className="ml-2 text-sm text-slate-600">{meaningData.phonetic}</span> : null}
                </h3>
                <p className="text-xs text-[#64748B]">Русские значения</p>
              </div>
              <button
                type="button"
                onClick={() => setMeaningModalOpen(false)}
                className="rounded-xl bg-white px-3 py-1 text-sm text-[#0F172A] ring-1 ring-[#E5E7EB]"
              >
                Закрыть
              </button>
            </div>

            {meaningLoading ? <p className="text-sm text-slate-600">Загрузка...</p> : null}
            {meaningError ? <p className="text-sm text-red-600">{meaningError}</p> : null}
            {!meaningLoading && !meaningError && meaningData ? (
              <div className="max-h-[56vh] space-y-3 overflow-auto pr-1">
                <div className="rounded-xl bg-[#F1F5F9] p-3">
                  <div className="text-xs uppercase tracking-wide text-[#64748B]">Русские значения</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {getRuMeaningsList(meaningData).length > 0 ? (
                      getRuMeaningsList(meaningData).map((term) => (
                        <span key={term} className="rounded-lg bg-white px-2 py-1 text-sm text-slate-900 ring-1 ring-[#E5E7EB]">
                          {term}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-900">перевод временно недоступен</span>
                    )}
                  </div>
                </div>
                {getRuMeaningsList(meaningData).length === 0 ? (
                  <div className="rounded-xl bg-[#F1F5F9] p-3 text-sm text-[#64748B]">
                    Русские варианты перевода пока не найдены для этого слова.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function resolveStudyWord(card: QueueCard): string {
  return (card.targetWord?.trim() || guessStudyWord(card)).toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildWordForms(word: string): string[] {
  const base = word.trim().toLowerCase();
  if (!base || /\s|-/.test(base)) {
    return [base].filter(Boolean);
  }

  const forms = new Set<string>([base, `${base}s`, `${base}ed`, `${base}ing`]);
  if (base.endsWith("e")) {
    forms.add(`${base}d`);
    forms.add(`${base.slice(0, -1)}ing`);
  }
  if (/[sxz]$/.test(base) || /(ch|sh)$/.test(base)) {
    forms.add(`${base}es`);
  }
  if (base.endsWith("y") && base.length > 1 && !/[aeiou]y$/.test(base)) {
    forms.add(`${base.slice(0, -1)}ies`);
    forms.add(`${base.slice(0, -1)}ied`);
  }
  return Array.from(forms).filter(Boolean);
}

function renderHighlightedText(
  text: string,
  word: string,
  options?: { interactive?: boolean; onWordClick?: () => void }
) {
  const normalized = word.trim();
  if (!normalized) return text;

  const wordForms = buildWordForms(normalized);
  const formSet = new Set(wordForms.map((item) => item.toLowerCase()));
  const forms = wordForms
    .sort((a, b) => b.length - a.length)
    .map((item) => escapeRegExp(item));
  const regex = new RegExp(`\\b(${forms.join("|")})\\b`, "gi");
  const parts = text.split(regex);
  if (parts.length === 1) return text;

  return parts.map((part, index) => {
    if (formSet.has(part.toLowerCase())) {
      if (options?.interactive && options.onWordClick) {
        return (
          <button
            key={`hl-btn-${index}`}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              options.onWordClick?.();
            }}
            className="font-semibold text-[#059669] underline decoration-dotted underline-offset-4"
          >
            {part}
          </button>
        );
      }
      return (
        <span key={`hl-${index}`} className="font-semibold text-[#059669]">
          {part}
        </span>
      );
    }
    return <span key={`tx-${index}`}>{part}</span>;
  });
}

function guessStudyWord(card: QueueCard): string {
  const tagWord = card.tags
    ?.split(",")
    .map((t) => t.trim())
    .find((t) => t && t !== "smart-add" && t !== "vocab");
  if (tagWord) return tagWord.toLowerCase();

  const words = card.frontText.match(/[A-Za-z']+/g) ?? [];
  const filtered = words.filter((w) => w.length > 3);
  return (filtered[0] ?? words[0] ?? "word").toLowerCase();
}

function parseCardBackDetails(card: QueueCard): {
  word: string;
  definitionEn?: string;
  transcription?: string;
  example?: string;
  whyThisWordHere?: string;
  ruMeanings: string[];
  synonyms: string[];
  emojiCue: string[];
  frequency?: number;
  usageDomain: string[];
} {
  const lines = card.backText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const findValue = (prefix: string): string | undefined =>
    lines.find((line) => line.toLowerCase().startsWith(prefix.toLowerCase()))?.slice(prefix.length).trim();

  const word = findValue("Word:") || resolveStudyWord(card);
  const definitionEn = findValue("Definition (EN):");
  const transcription = findValue("Transcription:");
  const ruLine = findValue("RU meanings:") || findValue("RU:");
  const example = findValue("Example:");
  const whyThisWordHere = findValue("Why this word here:");
  const synonymsLine = findValue("Synonyms:");
  const emojiLine = findValue("Emoji cue:");
  const frequencyLine = findValue("Frequency:");
  const usageDomainLine = findValue("Usage domain:");
  const ruMeanings = Array.from(
    new Set(
      (ruLine ?? "")
        .split(/[|;,]/g)
        .map((term) => term.trim())
        .filter((term) => term.length > 0)
    )
  ).slice(0, 8);
  const synonyms = Array.from(
    new Set(
      (synonymsLine ?? "")
        .split(/[|,;]/g)
        .map((term) => term.trim())
        .filter((term) => term.length > 0)
    )
  ).slice(0, 6);
  const emojiCue = Array.from(
    new Set(
      (emojiLine ?? "")
        .split(/\s+/g)
        .map((term) => term.trim())
        .filter((term) => term.length > 0)
    )
  ).slice(0, 3);
  const usageDomain = Array.from(
    new Set(
      (usageDomainLine ?? "")
        .split(/[|,;]/g)
        .map((term) => term.trim())
        .filter((term) => term.length > 0)
    )
  ).slice(0, 4);
  const frequencyMatch = (frequencyLine ?? "").match(/[1-5]/);
  const frequency = frequencyMatch ? Number.parseInt(frequencyMatch[0], 10) : undefined;

  return {
    word,
    definitionEn,
    transcription,
    example,
    whyThisWordHere,
    ruMeanings,
    synonyms,
    emojiCue,
    frequency,
    usageDomain
  };
}

function parseCardFrontDetails(card: QueueCard): {
  sentence: string;
  hint?: string;
} {
  const raw = card.frontText ?? "";
  const parts = raw.split(/\n\s*\n/);
  const sentence = parts[0]?.trim() || raw.trim();
  const hintLine = parts.slice(1).join(" ").trim();
  const hint = hintLine.replace(/^(hint|подсказка):\s*/i, "").trim();
  return {
    sentence,
    hint: hint || undefined
  };
}

function getRuMeaningsList(data: WordMeaningResponse): string[] {
  const fromDictionary =
    data.ruDictionary?.flatMap((entry) => entry.terms ?? []).map((term) => term.trim()) ?? [];
  const fromVariants = data.ruVariants?.map((term) => term.trim()) ?? [];
  return Array.from(new Set([...fromDictionary, ...fromVariants].filter((term) => term.length > 0))).slice(0, 8);
}

function buildAgainHelp(card: QueueCard): AgainHelpState {
  const word = guessStudyWord(card);
  const examples = [
    card.frontText,
    `I saw ${word} in a real-life situation today.`,
    `Try to make your own sentence with "${word}" right now.`
  ];

  const simpleBack = card.backText
    .replace(/^[^-—:]+[—:-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  const definitions = [
    simpleBack || card.backText,
    `${word} — simple meaning: ${simpleBack || "a useful English word to learn"}`,
    `Think of ${word} in one clear situation and repeat it aloud 3 times.`
  ];

  const imageOptions = [
    card.imageUrl,
    `https://loremflickr.com/640/360/${encodeURIComponent(word)}?lock=11`,
    `https://loremflickr.com/640/360/${encodeURIComponent(`${word},object`)}?lock=12`,
    `https://loremflickr.com/640/360/${encodeURIComponent(`${word},concept`)}?lock=13`,
    `https://loremflickr.com/640/360/${encodeURIComponent(`${word},illustration`)}?lock=14`
  ].filter((v): v is string => Boolean(v));

  return {
    card,
    examples,
    definitions,
    imageOptions: imageOptions.length > 0 ? imageOptions : ["https://picsum.photos/seed/help/640/360"],
    exampleIndex: 0,
    definitionIndex: 0,
    imageIndex: 0
  };
}

function buildBackContextExample(card: QueueCard): string {
  const word = resolveStudyWord(card);
  const source = card.frontText.trim().toLowerCase();
  const variants = [
    `People often use ${word} in everyday conversations.`,
    `You can hear ${word} in movies, podcasts, and daily speech.`,
    `Try saying ${word} in your own sentence right now.`
  ].filter((line) => line.trim().toLowerCase() !== source);

  return variants[0] ?? `Use ${word} in a short sentence about your day.`;
}

function CollapsibleResultList({
  title,
  items
}: {
  title: string;
  items: SessionResultItem[];
}) {
  const [open, setOpen] = useState(false);
  const styleMap: Record<string, string> = {
    "Вспомнил": "border-[#BBF7D0] bg-[#ECFDF5] text-[#166534]",
    "Не вспомнил": "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]",
    "Пропустил": "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
  };
  const panelClass = styleMap[title] ?? "border-[#E5E7EB] bg-white text-[#111111]";

  return (
    <details
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
      className={`rounded-xl border p-3 ${panelClass}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
        <span className="inline-flex items-center gap-2">
          <span>
            {title} ({items.length})
          </span>
        </span>
        <span className={`text-base leading-none transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </summary>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-[#64748B]">Пусто</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {items.map((item) => (
            <li key={`${title}-${item.cardId}`} className="px-1 py-0.5 text-[#374151]">
              {item.card.targetWord || guessStudyWord(item.card)}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

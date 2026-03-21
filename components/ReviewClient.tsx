"use client";

import { useEffect, useMemo, useState } from "react";

type Rating = "Again" | "Hard" | "Good" | "Easy";

type QueueCard = {
  id: string;
  deckId: string;
  deckName?: string;
  targetWord?: string | null;
  phonetic?: string | null;
  audioUrl?: string | null;
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
    label: "Didn't remember",
    hint: "Show more often",
    rating: "Again",
    className: "border-red-300 bg-red-50 hover:bg-red-100"
  },
  {
    label: "Hard to recall",
    hint: "Repeat soon",
    rating: "Hard",
    className: "border-amber-300 bg-amber-50 hover:bg-amber-100"
  },
  {
    label: "Easy recall",
    hint: "Repeat later",
    rating: "Easy",
    className: "border-blue-300 bg-blue-50 hover:bg-blue-100"
  }
];

export default function ReviewClient({
  deckId,
  initialQueue,
  returnHref,
  returnLabel,
  sessionKey,
  enableResume = false
}: Props) {
  const cardTextClass = "font-card text-5xl font-semibold leading-tight sm:text-6xl";
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
  const finalLabel = returnLabel ?? "Back to Today";
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
    return <div className="rounded-lg border bg-white p-6 text-sm">Loading review...</div>;
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
    const examples = buildFrontHintExamples(current);
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
    const uniqueLatestResults = Array.from(
      new Map(sessionResults.map((item) => [item.cardId, item])).values()
    );
    const notRemembered = uniqueLatestResults.filter((item) => item.rating === "Again");
    const hardRemembered = uniqueLatestResults.filter((item) => item.rating === "Hard");
    const remembered = uniqueLatestResults.filter(
      (item) => item.rating === "Good" || item.rating === "Easy"
    );
    const percent =
      uniqueLatestResults.length > 0
        ? Math.round((remembered.length / uniqueLatestResults.length) * 100)
        : 0;

    function startRetrySession(target: "Again" | "Hard") {
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
      const subset = uniqueLatestResults.map((item) => ({ ...item.card, isNew: false }));
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
      <div className="space-y-4 rounded-lg border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Результат сессии</h2>
            <p className="text-sm text-slate-600">Пройдено карточек: {done}</p>
          </div>
          <div className="rounded-lg border bg-slate-50 px-4 py-3 text-center">
            <div className="text-xs uppercase tracking-wide text-slate-500">Процент запоминания</div>
            <div className="text-2xl font-semibold">{percent}%</div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded border border-red-200 bg-red-50 p-3">
            <div className="text-sm font-semibold text-red-700">Не вспомнил</div>
            <div className="text-2xl font-semibold text-red-800">{notRemembered.length}</div>
          </div>
          <div className="rounded border border-amber-200 bg-amber-50 p-3">
            <div className="text-sm font-semibold text-amber-700">Трудно</div>
            <div className="text-2xl font-semibold text-amber-800">{hardRemembered.length}</div>
          </div>
          <div className="rounded border border-green-200 bg-green-50 p-3">
            <div className="text-sm font-semibold text-green-700">Вспомнил</div>
            <div className="text-2xl font-semibold text-green-800">{remembered.length}</div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ResultList title="Не вспомнил" items={notRemembered} />
          <ResultList title="Трудно" items={hardRemembered} />
          <ResultList title="Вспомнил" items={remembered} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startRetryAllSession}
            disabled={uniqueLatestResults.length === 0}
            className="rounded border px-4 py-2 disabled:opacity-50"
          >
            Repeat all
          </button>
          <button
            type="button"
            onClick={() => startRetrySession("Again")}
            disabled={notRemembered.length === 0}
            className="rounded border px-4 py-2 disabled:opacity-50"
          >
            Повторить только "Не вспомнил"
          </button>
          <button
            type="button"
            onClick={() => startRetrySession("Hard")}
            disabled={hardRemembered.length === 0}
            className="rounded border px-4 py-2 disabled:opacity-50"
          >
            Повторить "Трудно"
          </button>
        </div>

        <a href={finalHref} className="inline-block rounded bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800">
          {finalLabel}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <span>Done: {done}</span>
        <span>Remaining: {remaining}</span>
        <span>
          Card {position}/{queue.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={index <= 0 || submitting}
            className="rounded border px-3 py-1.5 disabled:opacity-50"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={submitting}
            className="rounded border px-3 py-1.5 disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-7 shadow-sm">
        <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
          {current.isNew ? "New" : "Review"}
          {current.level ? ` • Level ${current.level}` : ""}
          {current.deckName ? ` • ${current.deckName}` : ""}
        </div>
        {(current.targetWord || current.phonetic || current.audioUrl) ? (
          <PronunciationBar
            targetWord={current.targetWord ?? undefined}
            phonetic={current.phonetic ?? undefined}
            audioUrl={current.audioUrl ?? undefined}
          />
        ) : null}
        <div className="mt-3 text-center text-xs uppercase tracking-wide text-slate-500">
          {flipped ? "Answer" : "Question"}
        </div>
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
          className="relative mt-3 min-h-[340px] w-full cursor-pointer text-left"
        >
          <div
            aria-hidden={flipped}
            className={`absolute inset-0 flex items-center justify-center rounded-lg border bg-white p-8 text-center transition-all duration-300 motion-reduce:transition-none ${
              flipped
                ? "pointer-events-none translate-y-1 opacity-0"
                : "pointer-events-auto translate-y-0 opacity-100"
            }`}
          >
            <button
              type="button"
              aria-label="Hint"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openFrontHint();
              }}
              className="absolute right-3 top-3 z-20 rounded-full border-2 border-emerald-400 bg-emerald-100 px-3 py-2 text-xl shadow-md hover:bg-emerald-200"
            >
              💡
            </button>
            <div className="space-y-3">
              <p className={cardTextClass}>
                {renderHighlightedText(frontDetails?.sentence || current.frontText, resolveStudyWord(current))}
              </p>
            </div>
            {frontHint && frontHint.cardId === current.id ? (
              <div className="absolute inset-x-4 bottom-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm">
                {renderHighlightedText(frontHint.examples[frontHint.index], resolveStudyWord(current))}
              </div>
            ) : null}
          </div>
          <div
            aria-hidden={!flipped}
            className={`absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-lg border bg-white p-8 text-center transition-all duration-300 motion-reduce:transition-none ${
              flipped
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-1 opacity-0"
            }`}
          >
            <div className="w-full max-w-4xl space-y-5">
              <p className={cardTextClass}>
                {renderHighlightedText(
                  `${backDetails?.word || resolveStudyWord(current)} — ${
                    backDetails?.definitionEn || "common everyday meaning"
                  }`,
                  resolveStudyWord(current),
                  {
                    interactive: true,
                    onWordClick: openWordMeaning
                  }
                )}
              </p>
              <p className="text-2xl leading-relaxed sm:text-3xl">
                Example:{" "}
                {renderHighlightedText(
                  backDetails?.example || buildBackContextExample(current),
                  resolveStudyWord(current)
                )}
              </p>
            </div>
          </div>
        </div>
        {!flipped ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-500">Tap card to see answer, or rate now</p>
            <div className="grid grid-cols-3 gap-2">
              {ratingControls.map((control) => (
                <button
                  key={`front-${control.label}`}
                  type="button"
                  disabled={submitting}
                  onClick={() => rate(control.rating)}
                  className={`rounded border px-4 py-3 text-left disabled:opacity-50 ${control.className}`}
                >
                  <div className="text-sm font-semibold">{control.label}</div>
                  <div className="text-xs text-slate-600">{control.hint}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4 border-t pt-4">
            <div className="grid grid-cols-3 gap-2">
              {ratingControls.map((control) => (
                <button
                  key={control.label}
                  type="button"
                  disabled={submitting || isAgainHelpOpenForCurrent}
                  onClick={() => rate(control.rating)}
                  className={`rounded border px-4 py-3 text-left disabled:opacity-50 ${control.className}`}
                >
                  <div className="text-sm font-semibold">{control.label}</div>
                  <div className="text-xs text-slate-600">{control.hint}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Cards marked as <span className="font-medium">Didn&apos;t remember</span> are saved for a later session
              and are not repeated immediately.
            </p>

            {current.imageUrl ? (
              <img
                src={current.imageUrl}
                alt=""
                className="max-h-60 w-full rounded border object-cover"
              />
            ) : null}

            {againHelp && againHelp.card.id === current.id ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="mb-2 text-sm font-semibold text-blue-900">Помочь запомнить?</div>
                <p className="mb-3 text-xs text-blue-800">
                  Не страшно. Попробуем запомнить слово по-другому перед переходом дальше.
                </p>

                <div className="space-y-3">
                  <div className="rounded border bg-white p-3">
                    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Другой пример
                    </div>
                    <p className="text-sm">{againHelp.examples[againHelp.exampleIndex]}</p>
                    <button
                      type="button"
                      onClick={() =>
                        setAgainHelp((prev) =>
                          prev
                            ? {
                                ...prev,
                                exampleIndex: (prev.exampleIndex + 1) % prev.examples.length
                              }
                            : prev
                        )
                      }
                      className="mt-2 rounded border px-3 py-1 text-xs"
                    >
                      Другой пример
                    </button>
                  </div>

                  <div className="rounded border bg-white p-3">
                    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Проще объяснение
                    </div>
                    <p className="text-sm">{againHelp.definitions[againHelp.definitionIndex]}</p>
                    <button
                      type="button"
                      onClick={() =>
                        setAgainHelp((prev) =>
                          prev
                            ? {
                                ...prev,
                                definitionIndex:
                                  (prev.definitionIndex + 1) % prev.definitions.length
                              }
                            : prev
                        )
                      }
                      className="mt-2 rounded border px-3 py-1 text-xs"
                    >
                      Другой вариант объяснения
                    </button>
                  </div>

                  <div className="rounded border bg-white p-3">
                    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Другая картинка
                    </div>
                    <img
                      src={againHelp.imageOptions[againHelp.imageIndex]}
                      alt=""
                      className="h-36 w-full rounded border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAgainHelp((prev) =>
                          prev
                            ? {
                                ...prev,
                                imageIndex: (prev.imageIndex + 1) % prev.imageOptions.length
                              }
                            : prev
                        )
                      }
                      className="mt-2 rounded border px-3 py-1 text-xs"
                    >
                      Показать другую картинку
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={continueAfterAgainHelp}
                    className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
                  >
                    Продолжить
                  </button>
                  <button
                    type="button"
                    onClick={continueAfterAgainHelp}
                    className="rounded border px-4 py-2 text-sm"
                  >
                    Скрыть блок
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {meaningModalOpen ? (
        <>
          <button
            type="button"
            aria-label="Close dictionary"
            onClick={() => setMeaningModalOpen(false)}
            className="fixed inset-0 z-[300] bg-black/30"
          />
          <div className="fixed left-1/2 top-1/2 z-[310] w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">
                  {meaningData?.word ?? resolveStudyWord(current)}
                  {meaningData?.phonetic ? <span className="ml-2 text-sm text-slate-600">{meaningData.phonetic}</span> : null}
                </h3>
                <p className="text-xs text-slate-500">Russian meanings and examples</p>
              </div>
              <button
                type="button"
                onClick={() => setMeaningModalOpen(false)}
                className="rounded border px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            {meaningLoading ? <p className="text-sm text-slate-600">Loading...</p> : null}
            {meaningError ? <p className="text-sm text-red-600">{meaningError}</p> : null}
            {!meaningLoading && !meaningError && meaningData ? (
              <div className="max-h-[56vh] space-y-3 overflow-auto pr-1">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Russian meanings</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {getRuMeaningsList(meaningData).length > 0 ? (
                      getRuMeaningsList(meaningData).map((term) => (
                        <span key={term} className="rounded border bg-white px-2 py-1 text-sm text-slate-900">
                          {term}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-900">перевод временно недоступен</span>
                    )}
                  </div>
                </div>
                {getRuMeaningsList(meaningData).length === 0 ? (
                  <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
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

function PronunciationBar({
  targetWord,
  phonetic,
  audioUrl
}: {
  targetWord?: string;
  phonetic?: string;
  audioUrl?: string;
}) {
  async function speakFallback() {
    if (typeof window === "undefined" || !targetWord) return;
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(targetWord);
    utterance.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded border bg-slate-50 px-3 py-2 text-sm">
      {targetWord ? <span className="font-medium">Word: {targetWord}</span> : null}
      {phonetic ? <span className="text-slate-600">{phonetic}</span> : null}
      {audioUrl ? (
        <audio controls preload="none" src={audioUrl} className="h-8" />
      ) : (
        targetWord ? (
          <button type="button" onClick={speakFallback} className="rounded border px-2 py-1 text-xs">
            ▶ Pronounce
          </button>
        ) : null
      )}
    </div>
  );
}

function resolveStudyWord(card: QueueCard): string {
  return (card.targetWord?.trim() || guessStudyWord(card)).toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedText(
  text: string,
  word: string,
  options?: { interactive?: boolean; onWordClick?: () => void }
) {
  const normalized = word.trim();
  if (!normalized) return text;

  const regex = new RegExp(`\\b(${escapeRegExp(normalized)})\\b`, "gi");
  const parts = text.split(regex);
  if (parts.length === 1) return text;

  return parts.map((part, index) => {
    if (part.toLowerCase() === normalized.toLowerCase()) {
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
            className="font-extrabold text-green-600 underline decoration-dotted underline-offset-4"
          >
            {part}
          </button>
        );
      }
      return (
        <span key={`hl-${index}`} className="font-extrabold text-green-600">
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
  example?: string;
  whyThisWordHere?: string;
} {
  const lines = card.backText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const findValue = (prefix: string): string | undefined =>
    lines.find((line) => line.toLowerCase().startsWith(prefix.toLowerCase()))?.slice(prefix.length).trim();

  const word = findValue("Word:") || resolveStudyWord(card);
  const definitionEn = findValue("Definition (EN):");
  const example = findValue("Example:");
  const whyThisWordHere = findValue("Why this word here:");

  return {
    word,
    definitionEn,
    example,
    whyThisWordHere
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
  const hint = hintLine.replace(/^hint:\s*/i, "").trim();
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

function buildFrontHintExamples(card: QueueCard): string[] {
  const word = resolveStudyWord(card);
  const back = parseCardBackDetails(card);
  const front = parseCardFrontDetails(card);
  const definition = (back.definitionEn ?? "")
    .replace(/^[a-z]+:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const shortDefinition = definition.split(" ").slice(0, 10).join(" ");
  const source = front.sentence.trim().toLowerCase();
  const base = [
    front.hint ?? "",
    shortDefinition
      ? `In this sentence, "${word}" means: ${shortDefinition}.`
      : `Focus on what "${word}" is doing in this situation.`,
    `Think about the situation first, then infer "${word}" from context.`,
    `Use nearby words in the sentence to guess "${word}" naturally.`,
    `Imagine this exact scene and match "${word}" to the action or idea.`
  ];
  return Array.from(
    new Set(
      base
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .filter((line) => line.toLowerCase() !== source)
    )
  );
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

function ResultList({
  title,
  items
}: {
  title: string;
  items: SessionResultItem[];
}) {
  return (
    <div className="rounded border p-3">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-slate-500">Пусто</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.cardId} className="rounded bg-slate-50 px-2 py-1">
              <div className="font-medium">{item.card.frontText}</div>
              {item.card.deckName ? (
                <div className="text-xs text-slate-500">{item.card.deckName}</div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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

type Props = {
  deckId: string;
  initialQueue: QueueCard[];
  returnHref?: string;
  returnLabel?: string;
};

export default function ReviewClient({
  deckId,
  initialQueue,
  returnHref,
  returnLabel
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = queue[index] ?? null;
  const remaining = useMemo(() => Math.max(0, queue.length - index), [queue.length, index]);
  const finalHref = returnHref ?? `/decks/${deckId}/today`;
  const finalLabel = returnLabel ?? "Back to Today";
  const isAgainHelpOpenForCurrent = Boolean(againHelp && current && againHelp.card.id === current.id);

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

      if (rating === "Again") {
        setQueue((prev) => [...prev, { ...current, isNew: false }]);
        setAgainHelp(buildAgainHelp(current));
        return;
      }

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
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Done: {done}</span>
        <span>Remaining: {remaining}</span>
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
        <div className="relative mt-3 min-h-[340px]">
          <div
            aria-hidden={flipped}
            className={`absolute inset-0 flex items-center justify-center rounded-lg border bg-white p-8 text-center transition-all duration-300 motion-reduce:transition-none ${
              flipped ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
            }`}
          >
            <p className={cardTextClass}>{current.frontText}</p>
          </div>
          <div
            aria-hidden={!flipped}
            className={`absolute inset-0 flex items-center justify-center rounded-lg border bg-white p-8 text-center transition-all duration-300 motion-reduce:transition-none ${
              flipped ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            }`}
          >
            <p className={cardTextClass}>{current.backText}</p>
          </div>
        </div>
        {!flipped ? (
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className="mt-6 rounded bg-emerald-700 px-6 py-3 text-lg font-semibold text-white hover:bg-emerald-800"
          >
            Show Answer
          </button>
        ) : (
          <div className="mt-6 space-y-4 border-t pt-4">
            <button
              type="button"
              onClick={() => setFlipped(false)}
              className="rounded border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Back to Question
            </button>
            {current.imageUrl ? (
              <img
                src={current.imageUrl}
                alt=""
                className="max-h-60 w-full rounded border object-cover"
              />
            ) : null}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["Again", "Hard", "Good", "Easy"] as Rating[]).map((rating) => (
                <button
                  key={rating}
                  type="button"
                  disabled={submitting || isAgainHelpOpenForCurrent}
                  onClick={() => rate(rating)}
                  className="rounded border px-4 py-3 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  {rating}
                </button>
              ))}
            </div>

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

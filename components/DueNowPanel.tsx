"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DueCardItem = {
  id: string;
  targetWord: string | null;
  frontText: string;
};

type DueDeckGroup = {
  deckId: string;
  deckName: string;
  cards: DueCardItem[];
};

export default function DueNowPanel({
  dueToday,
  dueDecks
}: {
  dueToday: number;
  dueDecks: DueDeckGroup[];
}) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(dueDecks.flatMap((deck) => deck.cards.map((card) => card.id)))
  );
  const [expandedDeckIds, setExpandedDeckIds] = useState<Set<string>>(new Set());

  const selectedCount = selectedIds.size;
  const dueCountFromData = dueDecks.reduce((sum, deck) => sum + deck.cards.length, 0) || dueToday;
  const allCardIds = useMemo(
    () => dueDecks.flatMap((deck) => deck.cards.map((card) => card.id)),
    [dueDecks]
  );

  function toggleCard(cardId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function toggleDeck(deck: DueDeckGroup) {
    const deckIds = deck.cards.map((card) => card.id);
    setSelectedIds((prev) => {
      const allSelected = deckIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        deckIds.forEach((id) => next.delete(id));
      } else {
        deckIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleDeckExpanded(deckId: string) {
    setExpandedDeckIds((prev) => {
      const next = new Set(prev);
      if (next.has(deckId)) next.delete(deckId);
      else next.add(deckId);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(allCardIds));
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  function startSelectedReview() {
    if (selectedIds.size === 0) return;
    const include = Array.from(selectedIds).join(",");
    setPickerOpen(false);
    router.push(`/review/all?preset=due&include=${encodeURIComponent(include)}`);
  }

  return (
    <section className="h-full min-h-[182px] rounded-xl border bg-white p-3 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Пора повторять</h2>
        <p className="text-xs text-slate-600">
          {dueToday > 0 ? (
            <>
              По расписанию: <span className="font-semibold">{dueCountFromData}</span>
            </>
          ) : (
            <>Сейчас нет карточек</>
          )}
        </p>
        {dueToday > 0 ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex rounded bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Открыть
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/review/all?preset=due")}
            className="inline-flex rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            Перейти
          </button>
        )}
      </div>

      {pickerOpen && dueToday > 0 ? (
        <>
          <button
            type="button"
            aria-label="Close due picker"
            onClick={() => setPickerOpen(false)}
            className="fixed inset-0 z-[600] bg-black/30"
          />
          <div className="fixed left-1/2 top-1/2 z-[610] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Повторить карточки по расписанию</h3>
                <p className="text-sm text-slate-600">Отметь колоды или отдельные карточки.</p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded border px-3 py-1 text-sm"
              >
                Закрыть
              </button>
            </div>

            {dueDecks.length === 0 ? (
              <p className="text-sm text-slate-600">Карточки по расписанию не найдены.</p>
            ) : null}

            {dueDecks.length > 0 ? (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    Выбрано: <span className="font-semibold">{selectedCount}</span>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={selectAll} className="rounded border px-2 py-1">
                      Все
                    </button>
                    <button type="button" onClick={clearAll} className="rounded border px-2 py-1">
                      Снять все
                    </button>
                  </div>
                </div>

                <div className="max-h-[52vh] space-y-3 overflow-auto pr-1">
                  {dueDecks.map((deck) => {
                    const deckSelected = deck.cards.filter((card) => selectedIds.has(card.id)).length;
                    const allDeckSelected = deck.cards.length > 0 && deckSelected === deck.cards.length;
                    const isDeckExpanded = expandedDeckIds.has(deck.deckId);
                    return (
                      <div key={deck.deckId} className="rounded border border-slate-200 p-2">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                            <input
                              type="checkbox"
                              checked={allDeckSelected}
                              onChange={() => toggleDeck(deck)}
                            />
                            <span>{deck.deckName}</span>
                            <span className="text-xs text-slate-500">
                              ({deckSelected}/{deck.cards.length})
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => toggleDeckExpanded(deck.deckId)}
                            className="rounded border px-2 py-1 text-xs"
                          >
                            {isDeckExpanded ? "Скрыть" : "Раскрыть"}
                          </button>
                        </div>

                        {isDeckExpanded ? (
                          <div className="space-y-1 pl-6">
                            {deck.cards.map((card) => (
                              <label key={card.id} className="flex cursor-pointer items-start gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(card.id)}
                                  onChange={() => toggleCard(card.id)}
                                  className="mt-0.5"
                                />
                                <span className="truncate">{card.targetWord?.trim() || card.frontText}</span>
                              </label>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={startSelectedReview}
                    disabled={selectedCount === 0}
                    className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Начать повторение ({selectedCount})
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

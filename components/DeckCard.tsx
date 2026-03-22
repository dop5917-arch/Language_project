"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import ShareDeckButton from "@/components/ShareDeckButton";

type Props = {
  deckId: string;
  initialName: string;
  createdAt: string;
  lastActivityAt: string | null;
  accuracyPercent: number | null;
  cardsCount: number;
  passedCount: number;
  rememberedCount: number;
  dueCount: number;
  progressPercent: number;
};

export default function DeckCard({
  deckId,
  initialName,
  createdAt,
  lastActivityAt,
  accuracyPercent,
  cardsCount,
  passedCount,
  rememberedCount,
  dueCount,
  progressPercent
}: Props) {
  const router = useRouter();
  const [portalReady, setPortalReady] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(initialName);
  const [nameCommitted, setNameCommitted] = useState(initialName);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const hasCards = cardsCount > 0;
  const learnedPercent = hasCards ? Math.max(0, Math.min(100, progressPercent)) : null;
  const passedPercent = hasCards ? Math.round((passedCount / cardsCount) * 100) : null;
  const remainingPercent = hasCards && learnedPercent !== null ? Math.max(0, 100 - learnedPercent) : null;

  const createdDate = new Date(createdAt);
  const createdLabel = Number.isNaN(createdDate.getTime())
    ? "—"
    : new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(createdDate);
  const lastActivityLabel = lastActivityAt
    ? new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(lastActivityAt))
    : "нет";

  function touchDeck() {
    fetch(`/api/decks/${deckId}/touch`, { method: "POST", keepalive: true }).catch(() => {
      // ignore
    });
  }

  function openDeck() {
    touchDeck();
    router.push(`/decks/${deckId}`);
  }

  function isInteractiveTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("a,button,input,textarea,select,label,[role='button']"));
  }

  async function saveRename() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === nameCommitted) {
      setNameDraft(nameCommitted);
      setRenameOpen(false);
      return;
    }
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed })
      });
      if (!res.ok) throw new Error("Rename failed");
      setNameCommitted(trimmed);
      setNameDraft(trimmed);
      setRenameOpen(false);
      startTransition(() => router.refresh());
    } catch {
      setNameDraft(nameCommitted);
      setRenameOpen(false);
    }
  }

  async function deleteDeck() {
    if (!window.confirm("Удалить колоду?")) return;
    try {
      const res = await fetch(`/api/decks/${deckId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setDetailsOpen(false);
      startTransition(() => router.refresh());
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="group relative min-h-[148px] cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow"
      onClick={(e) => {
        if (isInteractiveTarget(e.target)) return;
        openDeck();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        if (isInteractiveTarget(e.target)) return;
        e.preventDefault();
        openDeck();
      }}
      role="link"
      tabIndex={0}
      aria-label={`Открыть колоду ${nameCommitted}`}
    >

      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 break-words text-xl font-semibold leading-tight text-slate-900 sm:text-2xl">
            {nameCommitted}
          </div>
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
            aria-label="Открыть детали колоды"
          >
            i
          </button>
        </div>

        <div className="flex items-center justify-between">
          <Link
            href={`/decks/${deckId}/review-all?resume=1`}
            onClick={touchDeck}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-slate-50"
          >
            Продолжить
          </Link>
          <div className="text-sm font-medium text-emerald-700">
            Выучено {learnedPercent === null ? "—" : `${learnedPercent}%`}
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-emerald-600/85" style={{ width: `${learnedPercent ?? 0}%` }} />
          </div>
          <div className="text-[11px] text-slate-500">
            Карточек: {cardsCount} • Пройдено: {passedCount} • Выучено: {rememberedCount}
          </div>
        </div>
      </div>

      {detailsOpen && portalReady
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Закрыть детали"
                onClick={() => {
                  setDetailsOpen(false);
                  setRenameOpen(false);
                  setNameDraft(nameCommitted);
                }}
                className="fixed inset-0 z-[9998] bg-black/35"
              />
              <div className="fixed left-1/2 top-1/2 z-[9999] w-[94vw] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{nameCommitted}</h3>
                    <p className="text-xs text-slate-600">Свойства колоды</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailsOpen(false);
                      setRenameOpen(false);
                      setNameDraft(nameCommitted);
                    }}
                    aria-label="Закрыть"
                    title="Закрыть"
                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-300 bg-red-50 text-sm font-semibold leading-none text-red-700 hover:bg-red-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 px-5 py-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <MetricCell label="Дата создания" value={createdLabel} tone="slate" />
                    <MetricCell label="Последняя активность" value={lastActivityLabel} tone="slate" />
                    <MetricCell label="Точность" value={accuracyPercent === null ? "—" : `${accuracyPercent}%`} tone="blue" />
                    <MetricCell label="Всего карточек" value={cardsCount} tone="slate" />
                    <MetricCell label="Нужно повторить" value={dueCount} tone="amber" />
                    <MetricCell
                      label="Выучено / Осталось"
                      value={
                        learnedPercent === null || remainingPercent === null
                          ? "— / —"
                          : `${learnedPercent}% / ${remainingPercent}%`
                      }
                      tone="emerald"
                    />
                  </div>

                  {renameOpen ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 text-xs font-medium text-slate-600">Новое название</div>
                      <input
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveRename();
                          }
                          if (e.key === "Escape") {
                            setRenameOpen(false);
                            setNameDraft(nameCommitted);
                          }
                        }}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        disabled={isPending}
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void saveRename()}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenameOpen(false);
                            setNameDraft(nameCommitted);
                          }}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-white"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <ShareDeckButton
                      deckId={deckId}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                      label="Поделиться"
                      copiedLabel="Скопировано"
                    />
                    <button
                      type="button"
                      onClick={() => setRenameOpen((v) => !v)}
                      className="rounded-xl border border-blue-300 bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                    >
                      Переименовать
                    </button>
                    <button
                      type="button"
                      onClick={deleteDeck}
                      className="rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </div>
  );
}

function MetricCell({
  label,
  value,
  tone
}: {
  label: string;
  value: string | number;
  tone: "slate" | "amber" | "blue" | "emerald";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : tone === "blue"
        ? "border-blue-200 bg-blue-50"
        : tone === "emerald"
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-slate-50";
  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

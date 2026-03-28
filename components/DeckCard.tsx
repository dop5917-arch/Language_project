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
      className="group relative min-h-[132px] cursor-pointer rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(0,0,0,0.06)]"
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

      <div className="relative z-10 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 break-words text-lg font-semibold leading-tight text-[#111111] sm:text-xl">
            {nameCommitted}
          </div>
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F5F5] text-sm font-semibold text-[#059669] ring-1 ring-[#E5E7EB] transition hover:bg-white hover:ring-[#A7F3D0]"
            aria-label="Открыть детали колоды"
          >
            i
          </button>
        </div>

        <div className="flex items-center justify-between">
          <Link
            href={`/decks/${deckId}/review-all?resume=1`}
            onClick={touchDeck}
            className="rounded-xl bg-[#111111] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90"
            aria-label="Продолжить повторение"
            title="Продолжить повторение"
          >
            Продолжить
          </Link>
          <div className="text-sm font-medium text-[#6B7280]">
            Выучено {learnedPercent === null ? "—" : `${learnedPercent}%`}
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
            <div className="h-full bg-[#059669]" style={{ width: `${learnedPercent ?? 0}%` }} />
          </div>
          <div className="text-[11px] text-slate-600">
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
              <div className="fixed left-1/2 top-1/2 z-[9999] w-[94vw] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
                <div className="flex items-center justify-between gap-3 bg-[#F5F5F5] px-5 py-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#111111]">{nameCommitted}</h3>
                    <p className="text-xs text-[#6B7280]">Свойства колоды</p>
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
                      className="inline-flex h-7 w-7 items-center justify-center rounded bg-red-50 text-sm font-semibold leading-none text-red-700 hover:bg-red-100"
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
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] p-3">
                      <div className="mb-2 text-xs font-medium text-[#6B7280]">Новое название</div>
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
                        className="w-full rounded-xl bg-white px-3 py-2 text-sm text-[#111111] outline-none ring-1 ring-[#E5E7EB] focus:ring-2 focus:ring-[#111111]"
                        disabled={isPending}
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void saveRename()}
                          className="rounded-xl bg-[#111111] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenameOpen(false);
                            setNameDraft(nameCommitted);
                          }}
                          className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs text-[#111111] hover:bg-[#F5F5F5]"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <ShareDeckButton
                      deckId={deckId}
                      className="rounded-xl bg-[#111111] px-3 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                      label="Поделиться"
                      copiedLabel="Скопировано"
                    />
                    <button
                      type="button"
                      onClick={() => setRenameOpen((v) => !v)}
                      className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm font-medium text-[#111111] transition hover:bg-[#F5F5F5]"
                    >
                      Переименовать
                    </button>
                    <button
                      type="button"
                      onClick={deleteDeck}
                      className="rounded-md bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
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
      ? "bg-[#F5F5F5] border border-[#E5E7EB]"
      : tone === "blue"
        ? "bg-[#F5F5F5] border border-[#E5E7EB]"
        : tone === "emerald"
          ? "bg-[#F5F5F5] border border-[#E5E7EB]"
          : "bg-[#F5F5F5] border border-[#E5E7EB]";
  return (
    <div className={`rounded-xl px-3 py-2 ${toneClass}`}>
      <div className="text-[11px] uppercase tracking-wide text-[#6B7280]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#111111]">{value}</div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { writeStudyTimerState } from "@/components/study-timer";

export default function HomeActionPanel({
  dueToday,
  aiDeckOptions = [],
  className = ""
}: {
  dueToday: number;
  aiDeckOptions?: Array<{ id: string; name: string }>;
  className?: string;
}) {
  const [minutesInput, setMinutesInput] = useState("25");
  const [aiModalOpen, setAiModalOpen] = useState(false);

  function startTimer() {
    const parsed = Number.parseInt(minutesInput, 10);
    const durationMin = Math.max(1, Math.min(180, Number.isFinite(parsed) ? parsed : 25));
    const now = Date.now();
    writeStudyTimerState({
      durationMin,
      startedAt: now,
      endAt: now + durationMin * 60 * 1000
    });
  }

  function PlayIcon({ className = "" }: { className?: string }) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 5l11 7-11 7z" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <section className={`bg-transparent px-0 py-0 ${className}`}>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <Link
          href="/review/all?preset=due"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#059669] px-3 py-2 text-center font-semibold text-white shadow-sm hover:bg-[#047857] md:min-h-[76px]"
        >
          <span className="text-sm">
            Пора повторить (интервальное повторение){dueToday > 0 ? ` • ${dueToday}` : ""}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => {
            setAiModalOpen(true);
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-center font-semibold text-[#111111] shadow-sm hover:bg-[#F5F5F5] md:min-h-[76px]"
        >
          <span className="text-sm">Создать карточки с ИИ</span>
        </button>
        <div className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 shadow-sm md:min-h-[76px]">
          <span className="text-sm font-semibold text-[#111111]">Таймер</span>
          <input
            type="number"
            min={1}
            max={180}
            value={minutesInput}
            onChange={(e) => {
              const next = e.target.value;
              if (!/^\d{0,3}$/.test(next)) return;
              setMinutesInput(next);
            }}
            className="w-16 rounded-lg bg-[#F5F5F5] px-2 py-1 text-sm text-[#111111] outline-none"
            aria-label="Минуты таймера"
            placeholder="мин"
            inputMode="numeric"
          />
          <button
            type="button"
            onClick={startTimer}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#059669] text-base font-semibold text-white shadow-sm hover:bg-[#047857]"
            aria-label="Запустить таймер"
            title="Запустить таймер"
          >
            <PlayIcon className="h-4 w-4" />
          </button>
        </div>
        <Link
          href="/review/all"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#111111] px-3 py-2 text-center font-semibold text-white shadow-sm hover:opacity-90 md:min-h-[76px]"
        >
          <span className="text-sm">Повторение всех колод</span>
        </Link>
      </div>

      {aiModalOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="fixed inset-0 z-[600] bg-black/30"
                aria-label="Закрыть выбор колоды"
              />
              <div className="fixed inset-0 z-[610] flex items-center justify-center p-4">
                <div className="w-[92vw] max-w-lg rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-[#111111]">
                      Выберите колоду для добавления карточек с ИИ
                    </h3>
                    <button
                      type="button"
                      onClick={() => setAiModalOpen(false)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100"
                      aria-label="Закрыть"
                    >
                      ✕
                    </button>
                  </div>

                  {aiDeckOptions.length === 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-[#6B7280]">Сначала создай хотя бы одну колоду.</p>
                      <button
                        type="button"
                        onClick={() => setAiModalOpen(false)}
                        className="rounded-xl bg-[#111111] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                      >
                        Понятно
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {aiDeckOptions.map((deck) => (
                        <Link
                          key={`ai-deck-${deck.id}`}
                          href={`/decks/${deck.id}/add-smart`}
                          onClick={() => setAiModalOpen(false)}
                          className="block rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] px-3 py-2 text-sm font-medium text-[#111111] hover:bg-white"
                        >
                          {deck.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </section>
  );
}

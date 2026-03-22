"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ReminderResponse = {
  dueTotal: number;
  newTotal: number;
  perDeck: Array<{
    deckId: string;
    deckName: string;
    dueCount: number;
  }>;
};

export default function ReviewReminderPopup() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ReminderResponse | null>(null);
  const dismissKey = useMemo(() => "review-reminder:dismissed:session", []);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(dismissKey) === "1") return;
    } catch {
      // ignore storage errors
    }

    let active = true;
    fetch("/api/review/reminder", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: ReminderResponse) => {
        if (!active) return;
        setData(json);
        if (json.dueTotal > 0) {
          setOpen(true);
        }
      })
      .catch(() => {
        // ignore popup errors
      });

    return () => {
      active = false;
    };
  }, [dismissKey]);

  function close() {
    setOpen(false);
    try {
      window.sessionStorage.setItem(dismissKey, "1");
    } catch {
      // ignore storage errors
    }
  }

  if (!open || !data) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close reminder"
        onClick={close}
        className="fixed inset-0 z-[500] bg-black/30"
      />
      <div className="fixed left-1/2 top-1/2 z-[510] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Пора повторить карточки</h3>
            <p className="text-sm text-slate-600">
              По расписанию сейчас: <span className="font-semibold">{data.dueTotal}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Закрыть"
            title="Закрыть"
            className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-300 bg-red-50 text-sm font-semibold leading-none text-red-700 hover:bg-red-100"
          >
            ✕
          </button>
        </div>

        {data.perDeck.length > 0 ? (
          <div className="max-h-52 space-y-2 overflow-auto rounded border bg-slate-50 p-3 text-sm">
            {data.perDeck.map((item) => (
              <div key={item.deckId} className="flex items-center justify-between gap-2">
                <span className="truncate">{item.deckName}</span>
                <span className="rounded border bg-white px-2 py-0.5 text-xs">{item.dueCount}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/review/all?preset=due"
            onClick={close}
            className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Повторить сейчас
          </Link>
          <Link
            href="/decks"
            onClick={close}
            className="rounded border px-4 py-2 text-sm"
          >
            Выбрать в меню
          </Link>
        </div>
      </div>
    </>
  );
}

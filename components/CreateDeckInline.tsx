"use client";

import { useState } from "react";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  compact?: boolean;
};

export default function CreateDeckInline({ action, compact = false }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex h-8 w-8 items-center justify-center rounded border border-emerald-300 bg-emerald-50 text-base font-semibold leading-none text-emerald-700 hover:bg-emerald-100"
            : "mt-4 rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
        }
      >
        {compact ? "+" : "Create Deck"}
      </button>
    );
  }

  return (
    <form action={action} className={`${compact ? "flex flex-wrap items-center gap-2" : "mt-4 flex flex-col gap-2 sm:flex-row"}`}>
      <input
        type="text"
        name="name"
        placeholder="Название колоды"
        className={`${compact ? "w-44 rounded border px-2 py-1.5 text-sm" : "flex-1 rounded border px-3 py-2"}`}
        required
        autoFocus
      />
      <button
        type="submit"
        className={`${compact ? "rounded bg-emerald-700 px-3 py-1.5 text-sm text-white hover:bg-emerald-800" : "rounded bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800"}`}
      >
        Создать
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className={`${compact ? "rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50" : "rounded border px-4 py-2 text-slate-700 hover:bg-slate-50"}`}
      >
        Отмена
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
};

export default function CreateDeckInline({ action }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
      >
        Create Deck
      </button>
    );
  }

  return (
    <form action={action} className="mt-4 flex flex-col gap-2 sm:flex-row">
      <input
        type="text"
        name="name"
        placeholder="New deck name"
        className="flex-1 rounded border px-3 py-2"
        required
        autoFocus
      />
      <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800">
        Create
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded border px-4 py-2 text-slate-700 hover:bg-slate-50"
      >
        Cancel
      </button>
    </form>
  );
}


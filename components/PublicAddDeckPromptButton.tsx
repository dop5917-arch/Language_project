"use client";

import Link from "next/link";
import { useState } from "react";

export default function PublicAddDeckPromptButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-medium text-[#059669] transition hover:bg-[#F5F5F5]"
      >
        Добавить колоду
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl ring-1 ring-[#E5E7EB]">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-[#111111]">Нужен аккаунт</h2>
              <p className="text-sm leading-6 text-[#475569]">
                Чтобы добавить свою колоду, нужно войти в приложение или создать аккаунт.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium text-[#111111] hover:bg-[#F5F5F5]"
              >
                Позже
              </button>
              <Link
                href="/auth"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-[#059669] px-4 py-2 text-sm font-semibold text-white hover:bg-[#047857]"
              >
                Войти или создать аккаунт
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

import Link from "next/link";
import { STARTER_DECK_NAME, STARTER_CARDS } from "@/lib/starter-deck";

export default function PublicDemoDeckPage() {
  const cardsCount = STARTER_CARDS.length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E5E7EB]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#111111]">{STARTER_DECK_NAME}</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Публичная демо-колода. Здесь можно попробовать интерфейс без регистрации.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-xl bg-white px-3 py-2 text-sm text-[#111111] ring-1 ring-[#E5E7EB] hover:bg-[#F5F5F5]"
          >
            На главную
          </Link>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E5E7EB]">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/demo/review"
            className="rounded-xl bg-[#059669] px-4 py-2 text-sm font-semibold text-white hover:bg-[#047857]"
          >
            Продолжить
          </Link>
          <Link
            href="/demo/review"
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#059669] ring-1 ring-[#E5E7EB] hover:bg-[#F5F5F5]"
          >
            Карточки на сегодня ({cardsCount})
          </Link>
          <Link
            href="/demo/review"
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#111111] ring-1 ring-[#E5E7EB] hover:bg-[#F5F5F5]"
          >
            Учить новые ({cardsCount})
          </Link>
          <Link
            href="/demo/review"
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#111111] ring-1 ring-[#E5E7EB] hover:bg-[#F5F5F5]"
          >
            Начать с начала
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article className="relative min-h-[132px] rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <div className="relative z-10 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 break-words text-lg font-semibold leading-tight text-[#111111] sm:text-xl">
                  {STARTER_DECK_NAME}
                </div>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F5F5] text-sm font-semibold text-[#059669] ring-1 ring-[#E5E7EB]">
                  i
                </span>
              </div>

              <div className="flex items-center justify-between">
                <Link
                  href="/demo/review"
                  className="rounded-xl bg-[#059669] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#047857]"
                >
                  Продолжить
                </Link>
                <div className="text-sm font-medium text-[#6B7280]">Выучено 0%</div>
              </div>

              <div className="space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                  <div className="h-full w-[0%] bg-[#059669]" />
                </div>
                <div className="text-[11px] text-slate-600">
                  Карточек: {cardsCount} • Пройдено: 0 • Выучено: 0
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

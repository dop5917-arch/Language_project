import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-112px)] w-full max-w-5xl flex-col">
      <div className="flex-1 space-y-8">
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl font-semibold text-[#111111]">SmartCards</h1>
            <p className="text-base leading-7 text-[#475569]">
              Умные карточки для изучения слов через контекст, интервальное повторение и AI-подготовку.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href="/auth"
                className="rounded-xl bg-[#059669] px-4 py-2 text-sm font-semibold text-white hover:bg-[#047857]"
              >
                Войти или создать аккаунт
              </Link>
              <Link
                href="/decks"
                className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#111111] hover:bg-[#F5F5F5]"
              >
                Открыть приложение
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="flex min-h-11 flex-col justify-center gap-2 rounded-xl bg-[#059669] px-3 py-3 text-white shadow-sm md:min-h-[76px]">
            <div className="text-center font-semibold text-white">
              <span className="text-sm">Пора повторить (интервальное повторение) • 6</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="whitespace-nowrap text-white/85">Лимит в день</span>
              <span className="w-16 rounded-lg bg-white/15 px-2 py-1 text-center text-sm text-white">6</span>
            </div>
          </div>
          <div className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#E5E7EB] px-3 py-2 text-center font-semibold text-[#111111] shadow-sm md:min-h-[76px]">
            <span className="text-sm">Повторение всех колод</span>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center">
            <span className="inline-flex items-center rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-medium text-[#059669]">
              Добавить колоду
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative min-h-[132px] rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
              <div className="relative z-10 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 break-words text-lg font-semibold leading-tight text-[#111111] sm:text-xl">
                    Демо-колода
                  </div>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F5F5] text-sm font-semibold text-[#059669] ring-1 ring-[#E5E7EB]">
                    i
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="rounded-xl bg-[#059669] px-3 py-1.5 text-xs font-medium text-white">
                    Продолжить
                  </span>
                  <div className="text-sm font-medium text-[#6B7280]">Выучено 30%</div>
                </div>

                <div className="space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                    <div className="h-full w-[30%] bg-[#059669]" />
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Карточек: 10 • Пройдено: 4 • Выучено: 3
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="px-1 pb-2 pt-10 text-[12px] text-[#94A3B8]">
        <span>Обратная связь: </span>
        <a
          href="mailto:pavlovsckydmitry@yandex.ru"
          className="underline decoration-[#CBD5E1] underline-offset-4"
        >
          pavlovsckydmitry@yandex.ru
        </a>
      </footer>
    </div>
  );
}

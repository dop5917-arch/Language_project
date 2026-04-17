import Link from "next/link";
import HelpDrawerButton from "@/components/HelpDrawerButton";
import PublicAddDeckPromptButton from "@/components/PublicAddDeckPromptButton";
import PublicDemoActionPanel from "@/components/PublicDemoActionPanel";
import PublicDemoDeckCard from "@/components/PublicDemoDeckCard";
import { STARTER_CARDS } from "@/lib/starter-deck";

export default function HomePage() {
  const cardsCount = STARTER_CARDS.length;

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
            </div>
          </div>
        </section>

        <PublicDemoActionPanel dueToday={cardsCount} />

        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <PublicAddDeckPromptButton />
            <HelpDrawerButton />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PublicDemoDeckCard cardsCount={cardsCount} />
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

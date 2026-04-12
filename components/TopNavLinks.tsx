"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  readStudyTimerState,
  STUDY_TIMER_EVENT,
  writeStudyTimerState
} from "@/components/study-timer";

const HOW_IT_WORKS_STEPS = [
  {
    number: "1",
    title: "Создай колоду",
    description: "Открой нужную колоду или создай новую для слов, которые хочешь изучать."
  },
  {
    number: "2",
    title: "Добавь слова",
    description: "Нажми «Добавить карточку с AI» и вставь одно слово или список слов."
  },
  {
    number: "3",
    title: "Скопируй промпт",
    description: "Программа сама подготовит промпт для AI на основе твоих слов."
  },
  {
    number: "4",
    title: "Вставь в AI",
    description: "Открой ChatGPT или другой AI-сервис, вставь промпт и получи результат."
  },
  {
    number: "5",
    title: "Верни ответ в SmartCards",
    description: "Скопируй ответ AI и вставь его обратно в программу."
  },
  {
    number: "6",
    title: "Начни учить",
    description: "Готовые карточки сразу можно изучать, повторять и закреплять по расписанию."
  }
];

type StatsResponse = {
  totalCards: number;
  studiedCards: number;
  remainingToMaster: number;
  dueToday: number;
  reviewsToday: number;
  studyDays: number;
  lastActivityAt: string | null;
};

export default function TopNavLinks() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [addCardsMode, setAddCardsMode] = useState<"ai" | "manual" | null>(null);
  const [timerModalOpen, setTimerModalOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [whereToGetWordsOpen, setWhereToGetWordsOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [minutesInput, setMinutesInput] = useState("25");
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<{
    id: string;
    email: string;
    name: string | null;
  } | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [aiDeckOptions, setAiDeckOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [timerStatus, setTimerStatus] = useState<string | null>(null);

  async function refreshSession() {
    setSessionLoading(true);
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const json = await res.json();
      setSessionUser(json?.authenticated ? json.user : null);
    } catch {
      setSessionUser(null);
    } finally {
      setSessionLoading(false);
    }
  }

  function refreshTimerStatus() {
    const timer = readStudyTimerState();
    if (!timer) {
      setTimerStatus(null);
      return;
    }
    const leftMs = Math.max(0, (timer.pausedAt ?? timer.endAt) - Date.now());
    const total = Math.max(0, Math.ceil(leftMs / 1000));
    const min = Math.floor(total / 60);
    const sec = total % 60;
    const label = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    setTimerStatus(timer.pausedAt ? `Пауза • ${label}` : label);
  }

  function startTimer() {
    const parsed = Number.parseInt(minutesInput, 10);
    const durationMin = Math.max(1, Math.min(180, Number.isFinite(parsed) ? parsed : 25));
    const now = Date.now();
    writeStudyTimerState({
      durationMin,
      startedAt: now,
      endAt: now + durationMin * 60 * 1000
    });
    setTimerModalOpen(false);
  }

  async function openAddCardsModal() {
    setAddCardsMode(null);
    setAiModalOpen(true);
    try {
      const res = await fetch("/api/decks", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { decks?: Array<{ id: string; name: string }> };
      setAiDeckOptions(json.decks ?? []);
    } catch {
      setAiDeckOptions([]);
    }
  }

  async function openStats() {
    setMenuOpen(false);
    setStatsOpen(true);
    if (stats || statsLoading) return;
    setStatsLoading(true);
    try {
      const res = await fetch("/api/stats/summary", { cache: "no-store" });
      const json = await res.json();
      setStats(json);
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    const openCreate = () => setCreateOpen(true);
    window.addEventListener("open-create-deck-modal", openCreate);
    return () => window.removeEventListener("open-create-deck-modal", openCreate);
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [pathname]);

  useEffect(() => {
    refreshTimerStatus();
    const sync = () => refreshTimerStatus();
    const tick = window.setInterval(sync, 1000);
    window.addEventListener(STUDY_TIMER_EVENT, sync);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener(STUDY_TIMER_EVENT, sync);
    };
  }, []);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void openAddCardsModal()}
          className="inline-flex h-10 items-center rounded-xl bg-[#059669] px-3 text-sm font-medium text-white shadow-sm hover:bg-[#047857]"
        >
          Добавить карточки
        </button>

        <button
          type="button"
          onClick={() => setTimerModalOpen(true)}
          className="inline-flex h-10 items-center rounded-xl bg-white px-3 text-sm font-medium text-[#111111] shadow-sm ring-1 ring-[#E5E7EB] hover:bg-[#F5F5F5]"
        >
          {timerStatus ? `Таймер • ${timerStatus}` : "Таймер"}
        </button>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="inline-flex h-10 items-center rounded-xl bg-white px-3 text-sm font-medium text-[#111111] shadow-sm ring-1 ring-[#E5E7EB] hover:bg-[#F5F5F5]"
          aria-label="Открыть справку"
        >
          <span>Справка</span>
        </button>

        {sessionUser ? (
          <button
            type="button"
            onClick={() => setAccountOpen((prev) => !prev)}
            className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-[#111111] shadow-sm ring-1 ring-[#E5E7EB] hover:bg-[#F5F5F5]"
            aria-label="Аккаунт"
            title="Аккаунт"
          >
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#111111] text-[11px] font-semibold text-white">
                {(sessionUser.name?.trim() || sessionUser.email).slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden sm:inline">{sessionUser.name?.trim() || sessionUser.email}</span>
            </span>
          </button>
        ) : (
          <Link
            href="/auth"
            className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-[#111111] shadow-sm ring-1 ring-[#E5E7EB] hover:bg-[#F5F5F5]"
          >
            {sessionLoading ? "..." : "Войти"}
          </Link>
        )}
      </div>

      {menuOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-[600] bg-black/30"
              />
              <div className="fixed inset-y-0 left-0 z-[610] w-[88vw] max-w-sm border-r border-[#E5E7EB] bg-white p-4 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-[#111111]">Справка</div>
                    <div className="text-sm text-[#64748B]">О приложении и работе с карточками</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Закрыть"
                    title="Закрыть"
                    className="inline-flex h-7 w-7 items-center justify-center rounded bg-red-50 text-sm font-semibold leading-none text-red-700 hover:bg-red-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2">
                  <MenuButton
                    label="О приложении"
                    description="Философия приложения и подход к карточкам"
                    onClick={() => {
                      setMenuOpen(false);
                      setAboutOpen(true);
                    }}
                  />
                  <MenuButton
                    label="Как работает приложение"
                    description="Пошаговая схема создания карточек"
                    onClick={() => {
                      setMenuOpen(false);
                      setHowItWorksOpen(true);
                    }}
                  />
                  <MenuButton
                    label="Где взять слова"
                    description="Готовая платформа со списками слов"
                    onClick={() => {
                      setMenuOpen(false);
                      setWhereToGetWordsOpen(true);
                    }}
                  />
                </div>
              </div>
            </>,
            document.body
          )
        : null}

      {aiModalOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                onClick={() => {
                  setAiModalOpen(false);
                  setAddCardsMode(null);
                }}
                className="fixed inset-0 z-[600] bg-black/30"
                aria-label="Закрыть добавление карточек"
              />
              <div className="fixed inset-0 z-[610] flex items-center justify-center p-4">
                <div className="w-[92vw] max-w-lg rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-[#111111]">
                      {addCardsMode === null
                        ? "Как добавить карточки"
                        : addCardsMode === "ai"
                          ? "Выберите колоду для добавления карточек с ИИ"
                          : "Выберите колоду для добавления карточек вручную"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setAiModalOpen(false);
                        setAddCardsMode(null);
                      }}
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
                        onClick={() => {
                          setAiModalOpen(false);
                          setAddCardsMode(null);
                        }}
                        className="rounded-xl bg-[#111111] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                      >
                        Понятно
                      </button>
                    </div>
                  ) : addCardsMode === null ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setAddCardsMode("ai")}
                        className="block w-full rounded-xl bg-[#059669] px-4 py-3 text-left text-sm font-semibold text-white hover:bg-[#047857]"
                      >
                        Добавить карточки с ИИ
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddCardsMode("manual")}
                        className="block w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-left text-sm font-semibold text-[#111111] hover:bg-[#F5F5F5]"
                      >
                        Добавить карточки вручную
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setAddCardsMode(null)}
                        className="mb-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111111] hover:bg-[#F5F5F5]"
                      >
                        ← Назад
                      </button>
                      {aiDeckOptions.map((deck) => (
                        <Link
                          key={`ai-deck-${deck.id}`}
                          href={addCardsMode === "ai" ? `/decks/${deck.id}/add-smart` : `/decks/${deck.id}/add`}
                          onClick={() => {
                            setAiModalOpen(false);
                            setAddCardsMode(null);
                          }}
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

      {timerModalOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                onClick={() => setTimerModalOpen(false)}
                className="fixed inset-0 z-[600] bg-black/30"
                aria-label="Закрыть таймер"
              />
              <div className="fixed inset-0 z-[610] flex items-center justify-center p-4">
                <div className="w-[92vw] max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-[#111111]">Таймер</h3>
                    <button
                      type="button"
                      onClick={() => setTimerModalOpen(false)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100"
                      aria-label="Закрыть"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm text-[#64748B]">
                      Сколько минут уделить карточкам
                    </label>
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
                      className="w-full rounded-xl bg-[#F5F5F5] px-3 py-2 text-sm text-[#111111] outline-none ring-1 ring-[#E5E7EB]"
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      onClick={startTimer}
                      className="w-full rounded-xl bg-[#111111] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Запустить таймер
                    </button>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )
        : null}

      {createOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="fixed inset-0 z-[600] bg-black/30"
              />
              <div className="fixed inset-0 z-[610] flex items-center justify-center p-4">
                <div className="w-[92vw] max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold">Создать колоду</h3>
                    <button
                      type="button"
                      onClick={() => setCreateOpen(false)}
                      aria-label="Закрыть"
                      title="Закрыть"
                      className="inline-flex h-7 w-7 items-center justify-center rounded bg-red-50 text-sm font-semibold leading-none text-red-700 hover:bg-red-100"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Название колоды"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl bg-[#F5F5F5] px-3 py-2 text-sm text-[#111111] outline-none ring-1 ring-[#E5E7EB] focus:ring-2 focus:ring-[#111111]"
                    />
                    <button
                      type="button"
                      disabled={creating || !name.trim()}
                      onClick={async () => {
                        if (!name.trim()) return;
                        setCreating(true);
                        try {
                          const res = await fetch("/api/decks/create", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: name.trim() })
                          });
                          if (!res.ok) return;
                          const json = await res.json();
                          const deckId = json?.deck?.id as string | undefined;
                          setCreateOpen(false);
                          setName("");
                          if (deckId) {
                            router.push(`/decks/${deckId}`);
                          } else {
                            router.push("/decks");
                          }
                          router.refresh();
                        } finally {
                          setCreating(false);
                        }
                      }}
                      className="w-full rounded-xl bg-[#111111] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creating ? "Создаю..." : "Создать"}
                    </button>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )
        : null}

      {accountOpen && sessionUser && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                onClick={() => setAccountOpen(false)}
                className="fixed inset-0 z-[600] bg-transparent"
              />
              <div className="fixed right-4 top-[72px] z-[610] w-[92vw] max-w-xs rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <div className="mb-3 rounded-xl bg-[#F8FAFC] p-3">
                  <div className="text-sm font-semibold text-[#111111]">
                    {sessionUser.name?.trim() || "Аккаунт"}
                  </div>
                  <div className="mt-1 text-sm text-[#64748B]">{sessionUser.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    void openStats();
                  }}
                  className="mb-2 w-full rounded-xl bg-white px-3 py-2 text-left text-sm font-medium text-[#111111] ring-1 ring-[#E5E7EB] hover:bg-[#F5F5F5]"
                >
                  Моя статистика
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const shareUrl = typeof window !== "undefined" ? window.location.origin : "";
                    try {
                      if (navigator.share) {
                        await navigator.share({
                          title: "SmartCards",
                          text: "SmartCards — умные карточки для изучения слов",
                          url: shareUrl
                        });
                      } else if (shareUrl) {
                        await navigator.clipboard.writeText(shareUrl);
                      }
                    } finally {
                      setAccountOpen(false);
                    }
                  }}
                  className="mb-2 w-full rounded-xl bg-white px-3 py-2 text-left text-sm font-medium text-[#111111] ring-1 ring-[#E5E7EB] hover:bg-[#F5F5F5]"
                >
                  Поделиться приложением
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    setAccountOpen(false);
                    setSessionUser(null);
                    router.push("/decks");
                    router.refresh();
                  }}
                  className="w-full rounded-xl bg-white px-3 py-2 text-left text-sm font-medium text-[#111111] ring-1 ring-[#E5E7EB] hover:bg-[#F5F5F5]"
                >
                  Выйти
                </button>
              </div>
            </>,
            document.body
          )
        : null}

      {statsOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                onClick={() => setStatsOpen(false)}
                className="fixed inset-0 z-[600] bg-black/30"
              />
              <div className="fixed inset-0 z-[610] flex items-center justify-center p-4">
                <div className="w-[92vw] max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold">Моя статистика</h3>
                    <button
                      type="button"
                      onClick={() => setStatsOpen(false)}
                      aria-label="Закрыть"
                      title="Закрыть"
                      className="inline-flex h-7 w-7 items-center justify-center rounded bg-red-50 text-sm font-semibold leading-none text-red-700 hover:bg-red-100"
                    >
                      ✕
                    </button>
                  </div>
                  {statsLoading ? <p className="text-sm text-slate-600">Загрузка…</p> : null}
                  {!statsLoading && stats ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <Tile label="Карточек всего" value={stats.totalCards} />
                        <Tile label="Изучено карточек" value={stats.studiedCards} />
                        <Tile label="Осталось освоить" value={stats.remainingToMaster} />
                        <Tile label="Дней с занятиями" value={stats.studyDays} />
                        <Tile label="Повторов сегодня" value={stats.reviewsToday} />
                        <Tile label="К повторению сегодня" value={stats.dueToday} />
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <WideTile label="Последняя активность" value={formatStatsDate(stats.lastActivityAt)} />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </>,
            document.body
          )
        : null}

      {aboutOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                onClick={() => setAboutOpen(false)}
                className="fixed inset-0 z-[600] bg-black/30"
              />
              <div className="fixed inset-0 z-[610] flex items-center justify-center p-4">
                <div className="w-[92vw] max-w-2xl rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold">О приложении</h3>
                    <button
                      type="button"
                      onClick={() => setAboutOpen(false)}
                      aria-label="Закрыть"
                      title="Закрыть"
                      className="inline-flex h-7 w-7 items-center justify-center rounded bg-red-50 text-sm font-semibold leading-none text-red-700 hover:bg-red-100"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 text-sm leading-7 text-[#334155]">
                    <p>
                      <span className="font-semibold text-[#111111]">SmartCards</span> — это приложение для более надежного запоминания иностранных слов через контекст, умные карточки и интервальное повторение.
                    </p>
                    <p>
                      Главная идея приложения в том, что слово запоминается лучше не изолированно, а в живой ситуации: в предложении, в значении, в контексте употребления и в повторении через время.
                    </p>
                    <p>
                      Пользователь сам выбирает слова, которые хочет изучать. Затем с помощью инструментов искусственного интеллекта эти слова превращаются в более содержательные карточки: с контекстом, определением, вариантами значений, дополнительными ассоциациями и другими элементами, которые помогают лучше удерживать слово в памяти.
                    </p>
                    <p>
                      В приложении используется интервальное повторение. Это значит, что карточки показываются не случайно, а в те моменты, когда слово особенно важно повторить, чтобы оно закрепилось надолго. Такой подход снижает лишнюю нагрузку и помогает тратить время на повторение более эффективно.
                    </p>
                    <p>Таймер позволяет контролировать время на изучение карточек.</p>

                    <div className="rounded-2xl bg-[#F8FAFC] p-4 text-sm leading-6 text-[#334155] ring-1 ring-[#E5E7EB]">
                      <div className="font-semibold text-[#111111]">Обратная связь</div>
                      <a
                        href="mailto:pavlovsckydmitry@yandex.ru"
                        className="mt-1 inline-block font-medium text-[#111111] underline decoration-[#D1D5DB] underline-offset-4"
                      >
                        pavlovsckydmitry@yandex.ru
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )
        : null}

      {whereToGetWordsOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                onClick={() => setWhereToGetWordsOpen(false)}
                className="fixed inset-0 z-[600] bg-black/30"
              />
              <div className="fixed inset-0 z-[610] flex items-center justify-center p-4">
                <div className="w-[92vw] max-w-xl rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold">Где взять слова</h3>
                    <button
                      type="button"
                      onClick={() => setWhereToGetWordsOpen(false)}
                      aria-label="Закрыть"
                      title="Закрыть"
                      className="inline-flex h-7 w-7 items-center justify-center rounded bg-red-50 text-sm font-semibold leading-none text-red-700 hover:bg-red-100"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 text-sm leading-7 text-[#334155]">
                    <p>
                      Если у тебя нет своего списка слов для изучения, можно использовать лексику с платформы{" "}
                      <a
                        href="https://word-by-word.ru"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#111111] underline decoration-[#D1D5DB] underline-offset-4"
                      >
                        word-by-word.ru
                      </a>.
                    </p>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )
        : null}

      {howItWorksOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                onClick={() => setHowItWorksOpen(false)}
                className="fixed inset-0 z-[600] bg-black/30"
              />
              <div className="fixed inset-0 z-[610] flex items-center justify-center p-4">
                <div className="w-[92vw] max-w-2xl rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold">Как работает приложение</h3>
                    <button
                      type="button"
                      onClick={() => setHowItWorksOpen(false)}
                      aria-label="Закрыть"
                      title="Закрыть"
                      className="inline-flex h-7 w-7 items-center justify-center rounded bg-red-50 text-sm font-semibold leading-none text-red-700 hover:bg-red-100"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm leading-6 text-[#475569]">
                      Программа работает по простой схеме: ты добавляешь слова, AI помогает собрать содержательные карточки, а дальше SmartCards помогает тебе учить слова через контекст и интервальное повторение.
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {HOW_IT_WORKS_STEPS.map((step, index) => (
                        <div
                          key={step.number}
                          className="relative rounded-2xl bg-[#F8FAFC] p-4 shadow-sm ring-1 ring-[#E5E7EB]"
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#111111] text-sm font-semibold text-white">
                              {step.number}
                            </div>
                            <div className="text-sm font-semibold text-[#111111]">{step.title}</div>
                          </div>
                          <p className="text-sm leading-6 text-[#475569]">{step.description}</p>
                          {index < HOW_IT_WORKS_STEPS.length - 1 ? (
                            <div className="pointer-events-none absolute -bottom-3 left-1/2 hidden -translate-x-1/2 text-lg text-[#94A3B8] sm:block">
                              ↓
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl bg-[#F8FAFC] p-4 text-sm leading-6 text-[#334155] ring-1 ring-[#E5E7EB]">
                      <span className="font-semibold text-[#111111]">Итог:</span> ты получаешь готовые карточки с контекстом, изучаешь их и возвращаешься к ним в те моменты, когда повторение действительно нужно.
                    </div>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}

function MenuButton({
  label,
  description,
  onClick
}: {
  label: string;
  description: string;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      className="w-full rounded-2xl bg-[#F8FAFC] px-4 py-3 text-left ring-1 ring-[#E5E7EB] transition-colors hover:bg-[#F1F5F9]"
    >
      <div className="text-sm font-semibold text-[#111111]">{label}</div>
      <div className="mt-1 text-sm text-[#64748B]">{description}</div>
    </button>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] p-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-600">{label}</div>
      <div className="mt-0.5 text-base font-semibold text-[#0F172A]">{value}</div>
    </div>
  );
}

function WideTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-600">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#0F172A]">{value}</div>
    </div>
  );
}

function formatStatsDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

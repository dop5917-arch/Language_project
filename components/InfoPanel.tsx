"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

export default function InfoPanel() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [whereToGetWordsOpen, setWhereToGetWordsOpen] = useState(false);
  const steps = [
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
      title: "Верни ответ в AICards",
      description: "Скопируй ответ AI и вставь его обратно в программу."
    },
    {
      number: "6",
      title: "Начни учить",
      description: "Готовые карточки сразу можно изучать, повторять и закреплять по расписанию."
    }
  ];

  return (
    <>
      <section>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-[#111111] shadow-sm ring-1 ring-[#E5E7EB] hover:bg-[#F5F5F5]"
          >
            О программе
          </button>
          <button
            type="button"
            onClick={() => setHowItWorksOpen(true)}
            className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-[#111111] shadow-sm ring-1 ring-[#E5E7EB] hover:bg-[#F5F5F5]"
          >
            Как это работает
          </button>
          <button
            type="button"
            onClick={() => setWhereToGetWordsOpen(true)}
            className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-[#111111] shadow-sm ring-1 ring-[#E5E7EB] hover:bg-[#F5F5F5]"
          >
            Где взять слова
          </button>
        </div>
      </section>

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
                    <h3 className="text-base font-semibold">О программе</h3>
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
                      <span className="font-semibold text-[#111111]">AICards</span> — это приложение для более надежного запоминания иностранных слов через контекст, умные карточки и интервальное повторение.
                    </p>
                    <p>
                      Главная идея программы в том, что слово запоминается лучше не изолированно, а в живой ситуации: в предложении, в значении, в контексте употребления и в повторении через время.
                    </p>
                    <p>
                      Пользователь сам выбирает слова, которые хочет изучать. Затем с помощью инструментов искусственного интеллекта эти слова превращаются в более содержательные карточки: с контекстом, определением, вариантами значений, дополнительными ассоциациями и другими элементами, которые помогают лучше удерживать слово в памяти.
                    </p>
                    <p>
                      В приложении используется интервальное повторение. Это значит, что карточки показываются не случайно, а в те моменты, когда слово особенно важно повторить, чтобы оно закрепилось надолго. Такой подход снижает лишнюю нагрузку и помогает тратить время на повторение более эффективно.
                    </p>
                    <p>
                      Таймер позволяет контролировать время на изучение карточек.
                    </p>

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
                      Если у тебя нет списка слов, можно использовать лексику по уровню сложности, например на
                      {" "}
                      <a
                        href="https://word-by-word.ru"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#111111] underline decoration-[#D1D5DB] underline-offset-4"
                      >
                        word-by-word.ru
                      </a>
                      . Проанализируй список слов, выдели для себя неизвестные и добавь их в карточки для изучения.
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
                    <h3 className="text-base font-semibold">Как работает программа</h3>
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
                      Программа работает по простой схеме: ты добавляешь слова, AI помогает собрать содержательные
                      карточки, а дальше AICards помогает тебе учить слова через контекст и интервальное повторение.
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {steps.map((step, index) => (
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
                          {index < steps.length - 1 ? (
                            <div className="pointer-events-none absolute -bottom-3 left-1/2 hidden -translate-x-1/2 text-lg text-[#94A3B8] sm:block">
                              ↓
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl bg-[#F8FAFC] p-4 text-sm leading-6 text-[#334155] ring-1 ring-[#E5E7EB]">
                      <span className="font-semibold text-[#111111]">Итог:</span> ты получаешь готовые карточки с
                      контекстом, изучаешь их и возвращаешься к ним в те моменты, когда повторение действительно
                      нужно.
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

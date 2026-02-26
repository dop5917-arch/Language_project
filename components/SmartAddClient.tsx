"use client";

import { useState } from "react";

type Draft = {
  word: string;
  targetWord?: string;
  phonetic?: string;
  audioUrl?: string;
  frontText: string;
  exampleOptions?: string[];
  backText: string;
  definitionOptions?: string[];
  imageUrl?: string;
  imageOptions?: Array<{ id: string; label: string; url: string }>;
  tags?: string;
  level?: number;
};

type Props = {
  deckId: string;
};

export default function SmartAddClient({ deckId }: Props) {
  const [word, setWord] = useState("");
  const [variant, setVariant] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function generate(nextVariant?: number) {
    const trimmed = word.trim();
    if (!trimmed) {
      setError("Введите слово");
      return;
    }

    const v = nextVariant ?? variant;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/word-helper?variant=${v}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: trimmed })
      });
      const data = (await res.json()) as { error?: string; draft?: Draft };
      if (!res.ok || !data.draft) {
        throw new Error(data.error ?? "Не удалось подобрать карточку");
      }
      setDraft(data.draft);
      setVariant(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function saveCard() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/decks/${deckId}/smart-add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontText: draft.frontText,
          backText: draft.backText,
          targetWord: draft.targetWord ?? draft.word,
          phonetic: draft.phonetic ?? "",
          audioUrl: draft.audioUrl ?? "",
          imageUrl: draft.imageUrl ?? "",
          tags: draft.tags ?? "",
          level: draft.level
        })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Не удалось сохранить карточку");
      setSuccess("Карточка сохранена");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  function clearAll() {
    setDraft(null);
    setWord("");
    setVariant(0);
    setError(null);
    setSuccess(null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <label className="mb-2 block text-sm font-medium">Слово (English)</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="apple"
            className="flex-1 rounded border px-3 py-2"
          />
          <button
            type="button"
            onClick={() => generate(variant)}
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Подбираю..." : "Подобрать карточку"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Пока это тестовый помощник (заглушка). Позже подключим настоящий словарь/API.
        </p>
      </div>

      {error ? <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {success ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</p>
      ) : null}

      {draft ? (
        <div className="space-y-4 rounded-lg border bg-white p-4">
          <h2 className="text-lg font-semibold">Черновик карточки</h2>

          {(draft.targetWord || draft.phonetic || draft.audioUrl) ? (
            <div className="rounded border bg-slate-50 p-3">
              <div className="text-sm font-medium">
                Word: {draft.targetWord ?? draft.word}
                {draft.phonetic ? <span className="ml-2 text-slate-600">{draft.phonetic}</span> : null}
              </div>
              {draft.audioUrl ? (
                <audio controls src={draft.audioUrl} className="mt-2 w-full" preload="none" />
              ) : null}
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium">Лицевая сторона (предложение)</label>
            {draft.exampleOptions && draft.exampleOptions.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {draft.exampleOptions.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => (prev ? { ...prev, frontText: example } : prev))
                    }
                    className={`rounded border px-3 py-1 text-xs ${
                      draft.frontText === example ? "border-blue-600 bg-blue-50 text-blue-700" : ""
                    }`}
                    title={example}
                  >
                    {example.length > 42 ? `${example.slice(0, 42)}...` : example}
                  </button>
                ))}
              </div>
            ) : null}
            <textarea
              value={draft.frontText}
              onChange={(e) => setDraft((prev) => (prev ? { ...prev, frontText: e.target.value } : prev))}
              rows={3}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Оборотная сторона (определение)</label>
            {draft.definitionOptions && draft.definitionOptions.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {draft.definitionOptions.map((definition) => (
                  <button
                    key={definition}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => (prev ? { ...prev, backText: definition } : prev))
                    }
                    className={`rounded border px-3 py-1 text-xs ${
                      draft.backText === definition ? "border-blue-600 bg-blue-50 text-blue-700" : ""
                    }`}
                    title={definition}
                  >
                    {definition.length > 52 ? `${definition.slice(0, 52)}...` : definition}
                  </button>
                ))}
              </div>
            ) : null}
            <textarea
              value={draft.backText}
              onChange={(e) => setDraft((prev) => (prev ? { ...prev, backText: e.target.value } : prev))}
              rows={3}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Картинка (URL)</label>
            {draft.imageOptions && draft.imageOptions.length > 0 ? (
              <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {draft.imageOptions.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => (prev ? { ...prev, imageUrl: image.url } : prev))
                    }
                    className={`overflow-hidden rounded border text-left ${
                      draft.imageUrl === image.url ? "border-blue-600 ring-1 ring-blue-600" : ""
                    }`}
                  >
                    <img src={image.url} alt={image.label} className="h-24 w-full object-cover" />
                    <div className="px-2 py-1 text-xs text-slate-600">{image.label}</div>
                  </button>
                ))}
              </div>
            ) : null}
            <input
              value={draft.imageUrl ?? ""}
              onChange={(e) => setDraft((prev) => (prev ? { ...prev, imageUrl: e.target.value } : prev))}
              className="w-full rounded border px-3 py-2"
            />
            {draft.imageUrl ? (
              <img src={draft.imageUrl} alt="" className="mt-2 max-h-56 w-full rounded border object-cover" />
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Tags</label>
              <input
                value={draft.tags ?? ""}
                onChange={(e) => setDraft((prev) => (prev ? { ...prev, tags: e.target.value } : prev))}
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Level (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={draft.level ?? 1}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev ? { ...prev, level: Number(e.target.value) || 1 } : prev
                  )
                }
                className="w-full rounded border px-3 py-2"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveCard}
              disabled={saving}
              className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            >
              {saving ? "Сохраняю..." : "Сохранить карточку"}
            </button>
            <button
              type="button"
              onClick={() => generate(variant + 1)}
              disabled={loading}
              className="rounded border px-4 py-2"
            >
              Еще вариант
            </button>
            <button type="button" onClick={clearAll} className="rounded border px-4 py-2">
              Очистить
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

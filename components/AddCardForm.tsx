"use client";

import { useState } from "react";

export default function AddCardForm({
  action
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [imageUrl, setImageUrl] = useState("");
  const [fileInfo, setFileInfo] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  async function onSelectImage(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    if (!file.type.startsWith("image/")) {
      setFileError("Выбери файл изображения (png, jpg, webp и т.д.)");
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      setFileError("Файл слишком большой. Максимум 2.5 MB");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
      reader.readAsDataURL(file);
    });
    setImageUrl(dataUrl);
    setFileInfo(`${file.name} • ${Math.round(file.size / 1024)} KB`);
  }

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <div>
        <label className="mb-1 block text-sm font-medium text-[#111111]">Изучаемое слово (опционально)</label>
        <input
          name="targetWord"
          type="text"
          className="w-full rounded-xl bg-[#F5F5F5] px-3 py-2.5 text-[#111111] outline-none ring-1 ring-[#D1D5DB] focus:ring-2 focus:ring-[#059669]"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[#111111]">Лицевая сторона (контекст)</label>
        <textarea
          name="frontText"
          className="w-full rounded-xl bg-[#F5F5F5] px-3 py-2.5 text-[#111111] outline-none ring-1 ring-[#D1D5DB] focus:ring-2 focus:ring-[#059669]"
          rows={3}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[#111111]">Обратная сторона (определение)</label>
        <textarea
          name="backText"
          className="w-full rounded-xl bg-[#F5F5F5] px-3 py-2.5 text-[#111111] outline-none ring-1 ring-[#D1D5DB] focus:ring-2 focus:ring-[#059669]"
          rows={4}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#111111]">Транскрипция (опционально)</label>
          <input
            name="phonetic"
            type="text"
            className="w-full rounded-xl bg-[#F5F5F5] px-3 py-2.5 text-[#111111] outline-none ring-1 ring-[#D1D5DB] focus:ring-2 focus:ring-[#059669]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#111111]">Ссылка на аудио (опционально)</label>
          <input
            name="audioUrl"
            type="url"
            className="w-full rounded-xl bg-[#F5F5F5] px-3 py-2.5 text-[#111111] outline-none ring-1 ring-[#D1D5DB] focus:ring-2 focus:ring-[#059669]"
          />
        </div>
      </div>

      <div className="space-y-2 rounded-xl bg-[#F8FAFC] p-3 ring-1 ring-[#E5E7EB]">
        <label className="block text-sm font-medium text-[#111111]">Картинка (опционально)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => void onSelectImage(e.target.files?.[0])}
          className="block w-full text-sm text-[#374151]"
        />
        {fileInfo ? <p className="text-xs text-[#6B7280]">Загружено: {fileInfo}</p> : null}
        {fileError ? <p className="text-xs text-[#EF4444]">{fileError}</p> : null}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Preview"
            className="max-h-44 w-full rounded-lg object-cover ring-1 ring-[#E5E7EB]"
          />
        ) : null}
        <input name="imageUrl" type="hidden" value={imageUrl} />
      </div>

      <button type="submit" className="rounded-xl bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
        Сохранить карточку
      </button>
    </form>
  );
}


"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "register";

export default function AuthClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password
        })
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Не удалось выполнить вход");
        return;
      }

      router.push("/decks");
      router.refresh();
    } catch {
      setError("Не удалось выполнить запрос");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#E5E7EB]">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-[#0F172A]">
          {mode === "login" ? "Вход" : "Создать аккаунт"}
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          {mode === "login"
            ? "Войди в свой аккаунт, чтобы видеть только свои колоды и карточки."
            : "Создай аккаунт, чтобы хранить свои колоды и карточки отдельно."}
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-xl px-3 py-2 text-sm font-medium ${
            mode === "login" ? "bg-[#111111] text-white" : "bg-[#F5F5F5] text-[#111111]"
          }`}
        >
          Вход
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`rounded-xl px-3 py-2 text-sm font-medium ${
            mode === "register" ? "bg-[#111111] text-white" : "bg-[#F5F5F5] text-[#111111]"
          }`}
        >
          Регистрация
        </button>
      </div>

      <div className="space-y-3">
        {mode === "register" ? (
          <input
            type="text"
            placeholder="Имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl bg-[#F8FAFC] px-3 py-2 text-sm text-[#111111] ring-1 ring-[#E5E7EB] outline-none"
          />
        ) : null}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl bg-[#F8FAFC] px-3 py-2 text-sm text-[#111111] ring-1 ring-[#E5E7EB] outline-none"
        />
        <input
          type="text"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl bg-[#F8FAFC] px-3 py-2 text-sm text-[#111111] ring-1 ring-[#E5E7EB] outline-none"
        />

        {mode === "register" ? (
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
            Запомните пароль: функции восстановления пароля в приложении пока не реализованы.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
        ) : null}

        <button
          type="button"
          disabled={loading || !email.trim() || !password.trim() || (mode === "register" && !name.trim())}
          onClick={() => void submit()}
          className="w-full rounded-xl bg-[#111111] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>
      </div>
    </div>
  );
}

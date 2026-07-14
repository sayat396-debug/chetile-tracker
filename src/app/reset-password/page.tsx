"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSendResetEmail() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setMessage("Введите email.");
      return;
    }

    setIsSending(true);
    setMessage("");

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/update-password`
        : "https://chetile-tracker.vercel.app/update-password";

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    setIsSending(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Ссылка для смены пароля отправлена на почту. Проверь входящие и папку Спам."
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <p className="mb-2 text-sm font-medium text-slate-500">
          Восстановление доступа
        </p>

        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Забыли пароль?
        </h1>

        <p className="mb-6 text-slate-600">
          Введите email администратора. Мы отправим ссылку, по которой можно
          будет задать новый пароль.
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="example@mail.com"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg outline-none focus:border-slate-900"
          />
        </div>

        {message && (
          <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm font-medium text-slate-700">
            {message}
          </p>
        )}

        <button
          onClick={handleSendResetEmail}
          disabled={isSending}
          className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSending ? "Отправляем..." : "Отправить ссылку"}
        </button>

        <Link
          href="/admin"
          className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          ← Вернуться ко входу
        </Link>
      </div>
    </main>
  );
}
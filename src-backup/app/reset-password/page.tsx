"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setIsError(true);
      setMessage("Введите email.");
      return;
    }

    setIsLoading(true);

    const redirectTo = `${window.location.origin}/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    setIsLoading(false);

    if (error) {
      setIsError(true);
      setMessage(error.message);
      return;
    }

    setIsError(false);
    setMessage(
      "Ссылка для восстановления пароля отправлена. Проверьте входящие письма и папку «Спам»."
    );

    setEmail("");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <Link
          href="/admin"
          className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          ← Вернуться ко входу
        </Link>

        <p className="mt-6 text-sm font-semibold tracking-wide text-slate-500">
          QADAMTRACK
        </p>

        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Восстановление пароля
        </h1>

        <p className="mt-2 text-slate-600">
          Введите email администратора. Мы отправим ссылку для создания нового
          пароля.
        </p>

        <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="example@mail.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Отправляем ссылку..." : "Отправить ссылку"}
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 rounded-xl p-3 text-sm font-medium ${
              isError
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-6 border-t border-slate-200 pt-5">
          <Link
            href="/admin"
            className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-center font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Войти как администратор
          </Link>

          <Link
            href="/register"
            className="mt-3 block text-center text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            Создать аккаунт администратора
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          QadamTrack — двигайтесь к цели вместе
        </p>
      </div>
    </main>
  );
}
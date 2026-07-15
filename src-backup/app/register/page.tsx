"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setIsError(true);
      setMessage("Введите email.");
      return;
    }

    if (password.length < 6) {
      setIsError(true);
      setMessage("Пароль должен содержать не менее 6 символов.");
      return;
    }

    if (password !== repeatPassword) {
      setIsError(true);
      setMessage("Пароли не совпадают.");
      return;
    }

    setIsLoading(true);

    const emailRedirectTo = `${window.location.origin}/admin`;

    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo,
      },
    });

    setIsLoading(false);

    if (error) {
      setIsError(true);
      setMessage(error.message);
      return;
    }

    setIsError(false);
    setMessage(
      "Аккаунт создан. Проверьте электронную почту и подтвердите регистрацию."
    );

    setEmail("");
    setPassword("");
    setRepeatPassword("");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <Link
          href="/"
          className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          ← На главную
        </Link>

        <p className="mt-6 text-sm font-semibold tracking-wide text-slate-500">
          QADAMTRACK
        </p>

        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Создание аккаунта
        </h1>

        <p className="mt-2 text-slate-600">
          Зарегистрируйтесь как администратор, чтобы создавать группы,
          добавлять участников и настраивать цели.
        </p>

        <form onSubmit={handleRegister} className="mt-6 space-y-4">
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

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Пароль
            </label>

            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Не менее 6 символов"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="repeatPassword"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Повторите пароль
            </label>

            <input
              id="repeatPassword"
              type="password"
              autoComplete="new-password"
              value={repeatPassword}
              onChange={(event) => setRepeatPassword(event.target.value)}
              placeholder="Введите пароль ещё раз"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Создаём аккаунт..." : "Создать аккаунт"}
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
          <p className="text-center text-sm text-slate-600">
            Уже зарегистрированы?
          </p>

          <Link
            href="/admin"
            className="mt-3 block w-full rounded-xl border border-slate-200 px-4 py-3 text-center font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Войти как администратор
          </Link>

          <Link
            href="/reset-password"
            className="mt-3 block text-center text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            Восстановить пароль
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          QadamTrack — двигайтесь к цели вместе
        </p>
      </div>
    </main>
  );
}
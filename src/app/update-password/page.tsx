"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [isSessionReady, setIsSessionReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function checkRecoverySession() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setIsError(true);
        setMessage("Не удалось проверить ссылку восстановления.");
        setIsSessionReady(true);
        return;
      }

      if (data.session) {
        setHasRecoverySession(true);
      }

      setIsSessionReady(true);
    }

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(true);
        setIsSessionReady(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

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

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setIsLoading(false);

    if (error) {
      setIsError(true);
      setMessage(error.message);
      return;
    }

    setIsError(false);
    setMessage(
      "Пароль успешно изменён. Теперь вы можете войти в админ-панель."
    );

    setPassword("");
    setRepeatPassword("");
  }

  if (!isSessionReady) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold tracking-wide text-slate-500">
            QADAMTRACK
          </p>

          <p className="mt-4 text-slate-600">
            Проверяем ссылку восстановления...
          </p>
        </div>
      </main>
    );
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
          Создание нового пароля
        </h1>

        {hasRecoverySession ? (
          <>
            <p className="mt-2 text-slate-600">
              Придумайте новый пароль для аккаунта администратора.
            </p>

            <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Новый пароль
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
                  Повторите новый пароль
                </label>

                <input
                  id="repeatPassword"
                  type="password"
                  autoComplete="new-password"
                  value={repeatPassword}
                  onChange={(event) => setRepeatPassword(event.target.value)}
                  placeholder="Введите новый пароль ещё раз"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Сохраняем пароль..." : "Сохранить новый пароль"}
              </button>
            </form>
          </>
        ) : (
          <div className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-800">
            <p className="font-semibold">
              Ссылка восстановления недействительна или устарела
            </p>

            <p className="mt-2 text-sm">
              Запросите новую ссылку для восстановления пароля.
            </p>
          </div>
        )}

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
            href="/reset-password"
            className="mt-3 block text-center text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            Запросить новую ссылку
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          QadamTrack — двигайтесь к цели вместе
        </p>
      </div>
    </main>
  );
}
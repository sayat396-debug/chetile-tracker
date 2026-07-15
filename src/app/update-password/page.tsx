"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import BrandMark from "@/components/BrandMark";
import { supabase } from "@/lib/supabaseClient";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";

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
      "Пароль успешно изменён. Теперь вы можете войти в админ-панель.",
    );

    setPassword("");
    setRepeatPassword("");
  }

  if (!isSessionReady) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-sky-50 px-4 py-8">
        <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-200/60">
          <div className="bg-slate-950 p-6">
            <BrandMark inverse />
          </div>
          <div className="p-6">
            <div className="h-5 w-48 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-4 h-14 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <AuthShell
      eyebrow="Новый пароль"
      title="Создайте новый пароль"
      description="Введите новый пароль для аккаунта администратора и повторите его для проверки."
    >
      {hasRecoverySession ? (
        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-bold text-slate-700"
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
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="repeatPassword"
              className="mb-2 block text-sm font-bold text-slate-700"
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
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-slate-950 px-4 py-3.5 text-lg font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Сохраняем пароль..." : "Сохранить новый пароль"}
          </button>
        </form>
      ) : (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
            !
          </div>
          <p className="mt-4 font-black">
            Ссылка восстановления недействительна или устарела
          </p>
          <p className="mt-2 text-sm leading-6">
            Запросите новую ссылку для восстановления пароля.
          </p>
        </div>
      )}

      {message && (
        <div
          className={`mt-5 rounded-2xl border p-4 text-sm font-semibold ${
            isError
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {message}
        </div>
      )}

      <div className="mt-8 border-t border-slate-200 pt-6">
        <Link
          href="/admin"
          className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-center font-bold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Войти как администратор
        </Link>
        <Link
          href="/reset-password"
          className="mt-4 block text-center text-sm font-bold text-emerald-700 transition hover:text-emerald-900"
        >
          Запросить новую ссылку
        </Link>
      </div>
    </AuthShell>
  );
}

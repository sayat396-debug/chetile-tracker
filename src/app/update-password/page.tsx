"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setHasRecoverySession(true);
      }

      setIsCheckingSession(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleUpdatePassword() {
    if (!password) {
      setMessage("Введите новый пароль.");
      return;
    }

    if (password.length < 6) {
      setMessage("Пароль должен быть минимум 6 символов.");
      return;
    }

    if (password !== repeatPassword) {
      setMessage("Пароли не совпадают.");
      return;
    }

    setIsUpdating(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setIsUpdating(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPassword("");
    setRepeatPassword("");

    setMessage("Пароль обновлён. Теперь можно войти в админку.");
  }

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-slate-600">Проверяем ссылку...</p>
        </div>
      </main>
    );
  }

  if (!hasRecoverySession) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-medium text-slate-500">
            Смена пароля
          </p>

          <h1 className="mb-2 text-2xl font-bold text-red-700">
            Ссылка недействительна
          </h1>

          <p className="mb-6 text-slate-600">
            Откройте страницу через ссылку из письма. Если ссылка устарела,
            запросите восстановление пароля заново.
          </p>

          <Link
            href="/reset-password"
            className="block w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-lg font-semibold text-white transition hover:bg-slate-700"
          >
            Запросить новую ссылку
          </Link>

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

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <p className="mb-2 text-sm font-medium text-slate-500">
          Смена пароля
        </p>

        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Новый пароль
        </h1>

        <p className="mb-6 text-slate-600">
          Введите новый пароль для аккаунта администратора.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Новый пароль
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Минимум 6 символов"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Повторите пароль
            </label>

            <input
              type="password"
              value={repeatPassword}
              onChange={(event) => setRepeatPassword(event.target.value)}
              placeholder="Повторите новый пароль"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg outline-none focus:border-slate-900"
            />
          </div>
        </div>

        {message && (
          <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm font-medium text-slate-700">
            {message}
          </p>
        )}

        <button
          onClick={handleUpdatePassword}
          disabled={isUpdating}
          className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isUpdating ? "Сохраняем..." : "Сохранить новый пароль"}
        </button>

        <Link
          href="/admin"
          className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          ← Перейти в админку
        </Link>
      </div>
    </main>
  );
}
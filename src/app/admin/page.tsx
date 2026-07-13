"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      setSession(data.session);
      setIsLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignUp() {
    setIsSubmitting(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Регистрация прошла. Если Supabase требует подтверждение email, проверь почту. Если подтверждение отключено — ты уже можешь войти."
    );
  }

  async function handleSignIn() {
    setIsSubmitting(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Вход выполнен.");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMessage("Ты вышел из админ-панели.");
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-slate-600">Проверяем вход...</p>
        </div>
      </main>
    );
  }

  if (session) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-medium text-slate-500">
            Админ-панель / Версия 2.0
          </p>

          <h1 className="mb-2 text-2xl font-bold text-slate-900">
            Панель администратора
          </h1>

          <p className="mb-4 text-slate-600">
            Ты вошёл как:
          </p>

          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900">
            <p className="font-semibold">{session.user.email}</p>
            <p className="mt-1 text-sm">Авторизация работает.</p>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Группы</p>
              <p className="mt-1 text-sm text-slate-600">
                Позже здесь появится список твоих групп.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Участники</p>
              <p className="mt-1 text-sm text-slate-600">
                Здесь будет управление участниками группы.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Задачи и нормы</p>
              <p className="mt-1 text-sm text-slate-600">
                Здесь будет настройка задач, единиц измерения и недельных норм.
              </p>
            </div>
          </div>

          {message && (
            <p className="mt-4 text-center text-sm font-medium text-slate-600">
              {message}
            </p>
          )}

          <button
            onClick={handleSignOut}
            className="mt-6 w-full rounded-xl bg-red-600 px-4 py-3 text-lg font-semibold text-white transition hover:bg-red-700"
          >
            Выйти
          </button>

          <Link
            href="/"
            className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            ← На главную
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <p className="mb-2 text-sm font-medium text-slate-500">
          Админ-панель / Версия 2.0
        </p>

        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Вход администратора
        </h1>

        <p className="mb-6 text-slate-600">
          Зарегистрируйся или войди, чтобы позже управлять группами,
          участниками и задачами.
        </p>

        <div className="space-y-4">
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Пароль
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Минимум 6 символов"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg outline-none focus:border-slate-900"
            />
          </div>
        </div>

        {message && (
          <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm font-medium text-slate-700">
            {message}
          </p>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={handleSignIn}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Подождите..." : "Войти"}
          </button>

          <button
            onClick={handleSignUp}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            Зарегистрироваться
          </button>

          <Link
            href="/"
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            ← На главную
          </Link>
        </div>
      </div>
    </main>
  );
}
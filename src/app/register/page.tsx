"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignUp() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setMessage("Введите email.");
      return;
    }

    if (!password) {
      setMessage("Введите пароль.");
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

    setIsSubmitting(true);
    setMessage("");

    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/admin`
        : "https://chetile-tracker.vercel.app/admin";

    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo,
      },
    });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEmail("");
    setPassword("");
    setRepeatPassword("");

    setMessage(
      "Регистрация прошла. Если Supabase требует подтверждение email, проверь почту. Если подтверждение отключено — можешь сразу войти."
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <p className="mb-2 text-sm font-medium text-slate-500">
          Регистрация администратора
        </p>

        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Создать аккаунт
        </h1>

        <p className="mb-6 text-slate-600">
          Зарегистрируйся, чтобы создавать группы и управлять участниками,
          задачами и недельными нормами.
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Повторите пароль
            </label>

            <input
              type="password"
              value={repeatPassword}
              onChange={(event) => setRepeatPassword(event.target.value)}
              placeholder="Повторите пароль"
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
          onClick={handleSignUp}
          disabled={isSubmitting}
          className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? "Регистрируем..." : "Зарегистрироваться"}
        </button>

        <Link
          href="/admin"
          className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          Уже есть аккаунт? Войти
        </Link>

        <Link
          href="/reset-password"
          className="mt-3 block text-center text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Забыли пароль?
        </Link>
      </div>
    </main>
  );
}
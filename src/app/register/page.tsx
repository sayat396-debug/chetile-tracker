"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { supabase } from "@/lib/supabaseClient";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";

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
      "Аккаунт создан. Проверьте электронную почту и подтвердите регистрацию.",
    );

    setEmail("");
    setPassword("");
    setRepeatPassword("");
  }

  return (
    <AuthShell
      eyebrow="Регистрация"
      title="Создайте аккаунт администратора"
      description="После регистрации вы сможете создавать группы, добавлять участников и задавать недельные цели."
    >
      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-bold text-slate-700"
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
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-bold text-slate-700"
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
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="repeatPassword"
            className="mb-2 block text-sm font-bold text-slate-700"
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
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-2xl bg-slate-950 px-4 py-3.5 text-lg font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Создаём аккаунт..." : "Создать аккаунт"}
        </button>
      </form>

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
        <p className="text-center text-sm text-slate-500">
          Уже зарегистрированы?
        </p>
        <Link
          href="/admin"
          className="mt-3 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-center font-bold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Войти как администратор
        </Link>
        <Link
          href="/reset-password"
          className="mt-4 block text-center text-sm font-bold text-emerald-700 transition hover:text-emerald-900"
        >
          Восстановить пароль
        </Link>
      </div>
    </AuthShell>
  );
}

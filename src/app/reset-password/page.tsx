"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { supabase } from "@/lib/supabaseClient";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";

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
      "Ссылка для восстановления пароля отправлена. Проверьте входящие письма и папку «Спам».",
    );

    setEmail("");
  }

  return (
    <AuthShell
      eyebrow="Восстановление доступа"
      title="Получите ссылку для нового пароля"
      description="Введите email администратора. Ссылка для смены пароля придёт на указанную почту."
      backHref="/admin"
      backLabel="Вернуться ко входу"
    >
      <form onSubmit={handleResetPassword} className="space-y-5">
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-2xl bg-slate-950 px-4 py-3.5 text-lg font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Отправляем ссылку..." : "Отправить ссылку"}
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
        <Link
          href="/admin"
          className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-center font-bold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Войти как администратор
        </Link>
        <Link
          href="/register"
          className="mt-4 block text-center text-sm font-bold text-emerald-700 transition hover:text-emerald-900"
        >
          Создать аккаунт администратора
        </Link>
      </div>
    </AuthShell>
  );
}

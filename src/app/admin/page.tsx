"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Group = {
  id: string;
  name: string;
  slug: string;
  week_start_day: number;
  created_at: string | null;
};

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupSlug, setNewGroupSlug] = useState("");
  const [newGroupWeekStartDay, setNewGroupWeekStartDay] = useState("6");

  const [isLoading, setIsLoading] = useState(true);
  const [isGroupsLoading, setIsGroupsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

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

  useEffect(() => {
    async function loadGroups() {
      if (!session) {
        setGroups([]);
        return;
      }

      setIsGroupsLoading(true);

      const { data, error } = await supabase
        .from("groups")
        .select("id, name, slug, week_start_day, created_at")
        .order("created_at", { ascending: false });

      setIsGroupsLoading(false);

      if (error) {
        setMessage("Не удалось загрузить группы.");
        return;
      }

      setGroups(data || []);
    }

    loadGroups();
  }, [session]);

  function makeSlugFromName(name: string) {
    return name
      .toLowerCase()
      .trim()
      .replaceAll(" ", "-")
      .replace(/[^a-z0-9а-яё-]/gi, "")
      .replaceAll("ё", "е");
  }

  function handleNewGroupNameChange(value: string) {
    setNewGroupName(value);

    if (!newGroupSlug) {
      setNewGroupSlug(makeSlugFromName(value));
    }
  }

  async function ensureProfileExists(currentSession: Session) {
    const { error } = await supabase.from("profiles").upsert({
      id: currentSession.user.id,
      full_name: currentSession.user.email,
    });

    if (error) {
      throw error;
    }
  }

  async function loadGroupsAgain() {
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, slug, week_start_day, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Группа создана, но список групп не обновился.");
      return;
    }

    setGroups(data || []);
  }

  async function handleCreateGroup() {
    if (!session) return;

    const cleanName = newGroupName.trim();
    const cleanSlug = newGroupSlug.trim().toLowerCase();

    if (!cleanName) {
      setMessage("Введите название группы.");
      return;
    }

    if (!cleanSlug) {
      setMessage("Введите slug группы.");
      return;
    }

    setIsCreatingGroup(true);
    setMessage("");

    try {
      await ensureProfileExists(session);

      const { error } = await supabase.from("groups").insert({
        owner_id: session.user.id,
        name: cleanName,
        slug: cleanSlug,
        week_start_day: Number(newGroupWeekStartDay),
      });

      if (error) {
        setMessage(error.message);
        setIsCreatingGroup(false);
        return;
      }

      setNewGroupName("");
      setNewGroupSlug("");
      setNewGroupWeekStartDay("6");

      await loadGroupsAgain();

      setMessage("Группа создана.");
    } catch (error) {
      console.error(error);
      setMessage("Не удалось создать группу. Проверь profiles и RLS policies.");
    }

    setIsCreatingGroup(false);
  }

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
    setGroups([]);
    setMessage("Ты вышел из админ-панели.");
  }

  function getWeekStartDayLabel(day: number) {
    if (day === 0) return "Воскресенье";
    if (day === 1) return "Понедельник";
    if (day === 2) return "Вторник";
    if (day === 3) return "Среда";
    if (day === 4) return "Четверг";
    if (day === 5) return "Пятница";
    if (day === 6) return "Суббота";

    return "Не указано";
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

          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900">
            <p className="text-sm">Ты вошёл как:</p>
            <p className="mt-1 font-semibold">{session.user.email}</p>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              Создать группу
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Название группы
                </label>

                <input
                  value={newGroupName}
                  onChange={(event) =>
                    handleNewGroupNameChange(event.target.value)
                  }
                  placeholder="Например: Четиле 2"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Slug для ссылки
                </label>

                <input
                  value={newGroupSlug}
                  onChange={(event) => setNewGroupSlug(event.target.value)}
                  placeholder="Например: chetile-2"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg outline-none focus:border-slate-900"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Ссылка будет такой: /g/{newGroupSlug || "slug"}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Начало недели
                </label>

                <select
                  value={newGroupWeekStartDay}
                  onChange={(event) =>
                    setNewGroupWeekStartDay(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg outline-none focus:border-slate-900"
                >
                  <option value="1">Понедельник</option>
                  <option value="2">Вторник</option>
                  <option value="3">Среда</option>
                  <option value="4">Четверг</option>
                  <option value="5">Пятница</option>
                  <option value="6">Суббота</option>
                  <option value="0">Воскресенье</option>
                </select>
              </div>

              <button
                onClick={handleCreateGroup}
                disabled={isCreatingGroup}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isCreatingGroup ? "Создаём..." : "Создать группу"}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              Мои группы
            </h2>

            {isGroupsLoading && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">Загружаем группы...</p>
              </div>
            )}

            {!isGroupsLoading && groups.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Групп пока нет</p>
                <p className="mt-1 text-sm text-slate-600">
                  Создай первую группу выше.
                </p>
              </div>
            )}

            {!isGroupsLoading && groups.length > 0 && (
              <div className="space-y-3">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-semibold text-slate-900">
                      {group.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Ссылка: /g/{group.slug}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Начало недели:{" "}
                      {getWeekStartDayLabel(group.week_start_day)}
                    </p>

                    <Link
                      href={`/g/${group.slug}`}
                      className="mt-4 block w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-base font-semibold text-white transition hover:bg-slate-700"
                    >
                      Открыть группу
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {message && (
            <p className="mb-4 rounded-xl bg-slate-100 p-3 text-sm font-medium text-slate-700">
              {message}
            </p>
          )}

          <button
            onClick={handleSignOut}
            className="w-full rounded-xl bg-red-600 px-4 py-3 text-lg font-semibold text-white transition hover:bg-red-700"
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
          Зарегистрируйся или войди, чтобы управлять группами, участниками и
          задачами.
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
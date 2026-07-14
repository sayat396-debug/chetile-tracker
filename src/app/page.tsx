"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Group = {
  id: string;
  name: string;
  slug: string;
  is_archived: boolean | null;
  created_at: string | null;
};

type LastOpenedGroup = {
  name: string;
  slug: string;
  savedAt: string;
};

const LAST_OPENED_GROUP_KEY = "last-opened-group";

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [adminGroups, setAdminGroups] = useState<Group[]>([]);
  const [lastOpenedGroup, setLastOpenedGroup] =
    useState<LastOpenedGroup | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isGroupsLoading, setIsGroupsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadHomeData() {
      setIsLoading(true);
      setMessage("");

      const savedGroupRaw = localStorage.getItem(LAST_OPENED_GROUP_KEY);

      if (savedGroupRaw) {
        try {
          const parsedGroup = JSON.parse(savedGroupRaw) as LastOpenedGroup;

          if (parsedGroup?.name && parsedGroup?.slug) {
            setLastOpenedGroup(parsedGroup);
          }
        } catch {
          localStorage.removeItem(LAST_OPENED_GROUP_KEY);
          setLastOpenedGroup(null);
        }
      }

      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      if (data.session) {
        await loadAdminGroups(data.session);
      }

      setIsLoading(false);
    }

    loadHomeData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);

      if (newSession) {
        await loadAdminGroups(newSession);
      } else {
        setAdminGroups([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadAdminGroups(currentSession: Session) {
    setIsGroupsLoading(true);

    const { data: groupsData, error } = await supabase
      .from("groups")
      .select("id, name, slug, is_archived, created_at")
      .eq("owner_id", currentSession.user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    setIsGroupsLoading(false);

    if (error) {
      setMessage("Не удалось загрузить ваши группы.");
      return;
    }

    setAdminGroups(groupsData || []);
  }

  function clearLastOpenedGroup() {
    localStorage.removeItem(LAST_OPENED_GROUP_KEY);
    setLastOpenedGroup(null);
    setMessage("Группа убрана с главной страницы.");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();

    localStorage.removeItem(LAST_OPENED_GROUP_KEY);

    setSession(null);
    setAdminGroups([]);
    setLastOpenedGroup(null);
    setMessage("Вы вышли из аккаунта администратора.");
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-slate-600">Загрузка...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <p className="mb-2 text-sm font-medium text-slate-500">Версия 2.0</p>

        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Недельный трекер
        </h1>

        {session ? (
          <>
            <p className="mb-4 text-slate-600">
              Вы вошли как администратор. Ниже отображаются ваши активные
              группы.
            </p>

            <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900">
              <p className="text-sm">Аккаунт администратора:</p>
              <p className="mt-1 font-semibold">{session.user.email}</p>
            </div>

            {isGroupsLoading && (
              <div className="mb-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
                Загружаем группы...
              </div>
            )}

            {!isGroupsLoading && adminGroups.length > 0 && (
              <div className="mb-5 space-y-3">
                {adminGroups.map((group) => (
                  <Link
                    key={group.id}
                    href={`/g/${group.slug}`}
                    className="block w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-lg font-semibold text-white transition hover:bg-slate-700"
                  >
                    Открыть группу «{group.name}»
                  </Link>
                ))}
              </div>
            )}

            {!isGroupsLoading && adminGroups.length === 0 && (
              <div className="mb-5 rounded-xl bg-slate-100 p-4">
                <p className="font-semibold text-slate-900">
                  У вас пока нет активных групп
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Создайте группу в админ-панели или восстановите её из архива.
                </p>
              </div>
            )}

            <Link
              href="/admin"
              className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Открыть админ-панель
            </Link>

            <button
              onClick={handleSignOut}
              className="mt-3 w-full rounded-xl bg-red-600 px-4 py-3 text-lg font-semibold text-white transition hover:bg-red-700"
            >
              Выйти
            </button>
          </>
        ) : (
          <>
            <p className="mb-6 text-slate-600">
              Откройте ссылку группы, которую вам отправил администратор, или
              войдите как администратор.
            </p>

            {lastOpenedGroup && (
              <div className="mb-4">
                <Link
                  href={`/g/${lastOpenedGroup.slug}`}
                  className="block w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-lg font-semibold text-white transition hover:bg-slate-700"
                >
                  Открыть группу «{lastOpenedGroup.name}»
                </Link>

                <button
                  onClick={clearLastOpenedGroup}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-base font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Убрать эту группу с главной
                </button>
              </div>
            )}

            {!lastOpenedGroup && (
              <div className="mb-4 rounded-xl bg-slate-100 p-4">
                <p className="font-semibold text-slate-900">
                  Группа пока не выбрана
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  После перехода по ссылке группы она появится здесь.
                </p>
              </div>
            )}

            <Link
              href="/admin"
              className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Войти как администратор
            </Link>

            <Link
              href="/register"
              className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Создать аккаунт администратора
            </Link>
          </>
        )}

        {message && (
          <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm font-medium text-slate-700">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
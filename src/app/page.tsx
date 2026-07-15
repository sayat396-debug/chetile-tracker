"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
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

const productBenefits = [
  {
    number: "01",
    title: "Быстрые отметки",
    description: "Участники вводят результат за день прямо с телефона.",
  },
  {
    number: "02",
    title: "Понятный прогресс",
    description: "Личные проценты и общий результат группы за неделю.",
  },
  {
    number: "03",
    title: "Гибкие цели",
    description: "Администратор сам создаёт задачи, нормы и участников.",
  },
];

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
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-sky-50 px-4 py-8">
        <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-200/60">
          <div className="bg-slate-950 p-6">
            <BrandMark inverse />
          </div>
          <div className="space-y-3 p-6">
            <div className="h-5 w-32 animate-pulse rounded-full bg-slate-100" />
            <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-slate-50 to-sky-50">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <BrandMark compact />

          <div className="flex items-center gap-2">
            {session ? (
              <Link
                href="/admin"
                className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                Админ-панель
              </Link>
            ) : (
              <Link
                href="/admin"
                className="rounded-full border border-white/80 bg-white/80 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-slate-950"
              >
                Войти
              </Link>
            )}
          </div>
        </header>

        <div className="grid items-center gap-8 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 lg:py-16">
          <section>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-700 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Групповой трекер целей
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Общие цели становятся понятнее, когда виден каждый шаг
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              QadamTrack помогает группе отмечать ежедневные результаты,
              соблюдать недельные нормы и видеть общий прогресс без сложных
              таблиц.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {productBenefits.map((benefit) => (
                <article
                  key={benefit.number}
                  className="rounded-3xl border border-white/80 bg-white/75 p-5 shadow-lg shadow-slate-200/40 backdrop-blur"
                >
                  <p className="text-xs font-black tracking-[0.18em] text-emerald-600">
                    {benefit.number}
                  </p>
                  <h2 className="mt-3 font-black text-slate-950">
                    {benefit.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {benefit.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="relative">
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-300/30 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl shadow-slate-300/50">
              <div className="relative overflow-hidden bg-slate-950 p-6 sm:p-7">
                <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-400/20 blur-3xl" />
                <div className="relative">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
                    Ваше пространство
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    {session ? "Управление группами" : "Продолжить работу"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {session
                      ? "Откройте группу или перейдите к настройкам администратора."
                      : "Откройте последнюю группу либо войдите как администратор."}
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-7">
                {session ? (
                  <>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                        Администратор
                      </p>
                      <p className="mt-1 truncate font-black text-emerald-950">
                        {session.user.email}
                      </p>
                    </div>

                    {isGroupsLoading && (
                      <div className="mt-4 space-y-3">
                        {[1, 2].map((item) => (
                          <div
                            key={item}
                            className="h-16 animate-pulse rounded-2xl bg-slate-100"
                          />
                        ))}
                      </div>
                    )}

                    {!isGroupsLoading && adminGroups.length > 0 && (
                      <div className="mt-5 space-y-3">
                        <p className="text-sm font-black text-slate-950">
                          Активные группы
                        </p>

                        {adminGroups.map((group) => (
                          <Link
                            key={group.id}
                            href={`/g/${group.slug}`}
                            className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-black text-slate-900">
                                {group.name}
                              </span>
                              <span className="mt-1 block text-xs font-medium text-slate-500">
                                /g/{group.slug}
                              </span>
                            </span>
                            <span className="text-xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-500">
                              →
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {!isGroupsLoading && adminGroups.length === 0 && (
                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="font-black text-slate-900">
                          Активных групп пока нет
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          Создайте первую группу в админ-панели или восстановите
                          её из архива.
                        </p>
                      </div>
                    )}

                    <Link
                      href="/admin"
                      className="mt-5 block w-full rounded-2xl bg-slate-950 px-4 py-3.5 text-center font-black text-white transition hover:bg-slate-800"
                    >
                      Открыть админ-панель
                    </Link>

                    <button
                      onClick={handleSignOut}
                      className="mt-3 w-full rounded-2xl border border-rose-200 bg-white px-4 py-3.5 font-bold text-rose-700 transition hover:bg-rose-50"
                    >
                      Выйти из аккаунта
                    </button>
                  </>
                ) : (
                  <>
                    {lastOpenedGroup ? (
                      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                          Последняя группа
                        </p>
                        <h3 className="mt-2 text-xl font-black text-emerald-950">
                          {lastOpenedGroup.name}
                        </h3>
                        <p className="mt-1 text-sm text-emerald-800">
                          Можно сразу продолжить ежедневные отметки.
                        </p>

                        <Link
                          href={`/g/${lastOpenedGroup.slug}`}
                          className="mt-5 block w-full rounded-2xl bg-slate-950 px-4 py-3.5 text-center font-black text-white transition hover:bg-slate-800"
                        >
                          Открыть группу
                        </Link>

                        <button
                          onClick={clearLastOpenedGroup}
                          className="mt-3 w-full rounded-2xl border border-emerald-200 bg-white/70 px-4 py-3 text-sm font-bold text-emerald-900 transition hover:bg-white"
                        >
                          Убрать группу с главной
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                          ↗
                        </div>
                        <p className="mt-4 font-black text-slate-950">
                          Группа пока не выбрана
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Получите ссылку от администратора. После первого
                          открытия группа появится здесь.
                        </p>
                      </div>
                    )}

                    <Link
                      href="/admin"
                      className="mt-5 block w-full rounded-2xl bg-slate-950 px-4 py-3.5 text-center font-black text-white transition hover:bg-slate-800"
                    >
                      Войти как администратор
                    </Link>

                    <Link
                      href="/register"
                      className="mt-3 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-center font-bold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Создать аккаунт
                    </Link>
                  </>
                )}

                {message && (
                  <p className="mt-4 rounded-2xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">
                    {message}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        <footer className="border-t border-slate-200/70 py-6 text-center text-xs font-medium text-slate-400">
          QadamTrack · двигайтесь к цели вместе, шаг за шагом
        </footer>
      </div>
    </main>
  );
}

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

type Member = {
  id: string;
  group_id: string;
  name: string;
  display_order: number | null;
  is_active: boolean | null;
};

type Task = {
  id: string;
  group_id: string;
  name: string;
  unit: string | null;
  weekly_goal: number;
  display_order: number | null;
  is_active: boolean | null;
};

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupSlug, setNewGroupSlug] = useState("");
  const [newGroupWeekStartDay, setNewGroupWeekStartDay] = useState("6");

  const [selectedGroupId, setSelectedGroupId] = useState("");

  const [newMemberName, setNewMemberName] = useState("");
  const [editingMemberId, setEditingMemberId] = useState("");
  const [editMemberName, setEditMemberName] = useState("");

  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskUnit, setNewTaskUnit] = useState("");
  const [newTaskWeeklyGoal, setNewTaskWeeklyGoal] = useState("");

  const [editingTaskId, setEditingTaskId] = useState("");
  const [editTaskName, setEditTaskName] = useState("");
  const [editTaskUnit, setEditTaskUnit] = useState("");
  const [editTaskWeeklyGoal, setEditTaskWeeklyGoal] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isGroupsLoading, setIsGroupsLoading] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [isTasksLoading, setIsTasksLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);

  const [message, setMessage] = useState("");

  const selectedGroup = groups.find((group) => group.id === selectedGroupId);

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

      const loadedGroups = data || [];
      setGroups(loadedGroups);

      if (loadedGroups.length > 0) {
        setSelectedGroupId((current) => current || loadedGroups[0].id);
      }
    }

    loadGroups();
  }, [session]);

  useEffect(() => {
    async function loadMembersAndTasks() {
      if (!selectedGroupId) {
        setMembers([]);
        setTasks([]);
        return;
      }

      setIsMembersLoading(true);
      setIsTasksLoading(true);

      const { data: membersData, error: membersError } = await supabase
        .from("group_members")
        .select("id, group_id, name, display_order, is_active")
        .eq("group_id", selectedGroupId)
        .order("display_order", { ascending: true });

      setIsMembersLoading(false);

      if (membersError) {
        setMessage("Не удалось загрузить участников.");
      } else {
        setMembers(membersData || []);
      }

      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("id, group_id, name, unit, weekly_goal, display_order, is_active")
        .eq("group_id", selectedGroupId)
        .order("display_order", { ascending: true });

      setIsTasksLoading(false);

      if (tasksError) {
        setMessage("Не удалось загрузить задачи.");
      } else {
        setTasks(tasksData || []);
      }
    }

    loadMembersAndTasks();
  }, [selectedGroupId]);

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

    const loadedGroups = data || [];
    setGroups(loadedGroups);

    if (loadedGroups.length > 0) {
      setSelectedGroupId(loadedGroups[0].id);
    }
  }

  async function loadMembersAgain(groupId: string) {
    const { data, error } = await supabase
      .from("group_members")
      .select("id, group_id, name, display_order, is_active")
      .eq("group_id", groupId)
      .order("display_order", { ascending: true });

    if (error) {
      setMessage("Участник добавлен, но список участников не обновился.");
      return;
    }

    setMembers(data || []);
  }

  async function loadTasksAgain(groupId: string) {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, group_id, name, unit, weekly_goal, display_order, is_active")
      .eq("group_id", groupId)
      .order("display_order", { ascending: true });

    if (error) {
      setMessage("Задача добавлена, но список задач не обновился.");
      return;
    }

    setTasks(data || []);
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

  async function handleAddMember() {
    const cleanName = newMemberName.trim();

    if (!selectedGroupId) {
      setMessage("Сначала выберите группу.");
      return;
    }

    if (!cleanName) {
      setMessage("Введите имя участника.");
      return;
    }

    const nextDisplayOrder = members.length + 1;

    setIsAddingMember(true);
    setMessage("");

    const { error } = await supabase.from("group_members").insert({
      group_id: selectedGroupId,
      name: cleanName,
      display_order: nextDisplayOrder,
      is_active: true,
    });

    if (error) {
      setMessage(error.message);
      setIsAddingMember(false);
      return;
    }

    setNewMemberName("");
    await loadMembersAgain(selectedGroupId);

    setMessage("Участник добавлен.");
    setIsAddingMember(false);
  }

  function handleStartEditMember(member: Member) {
    setEditingMemberId(member.id);
    setEditMemberName(member.name);
    setMessage("");
  }

  function handleCancelEditMember() {
    setEditingMemberId("");
    setEditMemberName("");
    setMessage("");
  }

  async function handleSaveMemberEdit(member: Member) {
    const cleanName = editMemberName.trim();

    if (!cleanName) {
      setMessage("Введите имя участника.");
      return;
    }

    setIsUpdatingMember(true);
    setMessage("");

    const { error } = await supabase
      .from("group_members")
      .update({
        name: cleanName,
      })
      .eq("id", member.id);

    if (error) {
      setMessage(error.message);
      setIsUpdatingMember(false);
      return;
    }

    await loadMembersAgain(member.group_id);

    setEditingMemberId("");
    setEditMemberName("");

    setMessage("Участник обновлён.");
    setIsUpdatingMember(false);
  }

  async function handleToggleMemberActive(member: Member) {
    const { error } = await supabase
      .from("group_members")
      .update({ is_active: !member.is_active })
      .eq("id", member.id);

    if (error) {
      setMessage("Не удалось изменить статус участника.");
      return;
    }

    await loadMembersAgain(member.group_id);
  }

  async function handleAddTask() {
    const cleanName = newTaskName.trim();
    const cleanUnit = newTaskUnit.trim();
    const cleanWeeklyGoal = Number(newTaskWeeklyGoal);

    if (!selectedGroupId) {
      setMessage("Сначала выберите группу.");
      return;
    }

    if (!cleanName) {
      setMessage("Введите название задачи.");
      return;
    }

    if (!newTaskWeeklyGoal || Number.isNaN(cleanWeeklyGoal)) {
      setMessage("Введите недельную норму числом.");
      return;
    }

    if (cleanWeeklyGoal < 0) {
      setMessage("Недельная норма не может быть меньше 0.");
      return;
    }

    const nextDisplayOrder = tasks.length + 1;

    setIsAddingTask(true);
    setMessage("");

    const { error } = await supabase.from("tasks").insert({
      group_id: selectedGroupId,
      name: cleanName,
      unit: cleanUnit || null,
      weekly_goal: cleanWeeklyGoal,
      display_order: nextDisplayOrder,
      is_active: true,
    });

    if (error) {
      setMessage(error.message);
      setIsAddingTask(false);
      return;
    }

    setNewTaskName("");
    setNewTaskUnit("");
    setNewTaskWeeklyGoal("");

    await loadTasksAgain(selectedGroupId);

    setMessage("Задача добавлена.");
    setIsAddingTask(false);
  }

  function handleStartEditTask(task: Task) {
    setEditingTaskId(task.id);
    setEditTaskName(task.name);
    setEditTaskUnit(task.unit || "");
    setEditTaskWeeklyGoal(String(task.weekly_goal));
    setMessage("");
  }

  function handleCancelEditTask() {
    setEditingTaskId("");
    setEditTaskName("");
    setEditTaskUnit("");
    setEditTaskWeeklyGoal("");
    setMessage("");
  }

  async function handleSaveTaskEdit(task: Task) {
    const cleanName = editTaskName.trim();
    const cleanUnit = editTaskUnit.trim();
    const cleanWeeklyGoal = Number(editTaskWeeklyGoal);

    if (!cleanName) {
      setMessage("Введите название задачи.");
      return;
    }

    if (!editTaskWeeklyGoal || Number.isNaN(cleanWeeklyGoal)) {
      setMessage("Введите недельную норму числом.");
      return;
    }

    if (cleanWeeklyGoal < 0) {
      setMessage("Недельная норма не может быть меньше 0.");
      return;
    }

    setIsUpdatingTask(true);
    setMessage("");

    const { error } = await supabase
      .from("tasks")
      .update({
        name: cleanName,
        unit: cleanUnit || null,
        weekly_goal: cleanWeeklyGoal,
      })
      .eq("id", task.id);

    if (error) {
      setMessage(error.message);
      setIsUpdatingTask(false);
      return;
    }

    await loadTasksAgain(task.group_id);

    setEditingTaskId("");
    setEditTaskName("");
    setEditTaskUnit("");
    setEditTaskWeeklyGoal("");

    setMessage("Задача обновлена.");
    setIsUpdatingTask(false);
  }

  async function handleToggleTaskActive(task: Task) {
    const { error } = await supabase
      .from("tasks")
      .update({ is_active: !task.is_active })
      .eq("id", task.id);

    if (error) {
      setMessage("Не удалось изменить статус задачи.");
      return;
    }

    await loadTasksAgain(task.group_id);
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
    setMembers([]);
    setTasks([]);
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
                    className={`rounded-2xl border p-4 ${
                      selectedGroupId === group.id
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
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

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedGroupId(group.id)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                      >
                        Настроить
                      </button>

                      <Link
                        href={`/g/${group.slug}`}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Открыть
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedGroup && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="mb-1 text-xl font-bold text-slate-900">
                Участники
              </h2>

              <p className="mb-4 text-sm text-slate-600">
                Группа: {selectedGroup.name}
              </p>

              <div className="mb-4 flex gap-2">
                <input
                  value={newMemberName}
                  onChange={(event) => setNewMemberName(event.target.value)}
                  placeholder="Имя участника"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-900"
                />

                <button
                  onClick={handleAddMember}
                  disabled={isAddingMember}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isAddingMember ? "..." : "+"}
                </button>
              </div>

              {isMembersLoading && (
                <p className="text-sm text-slate-500">
                  Загружаем участников...
                </p>
              )}

              {!isMembersLoading && members.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm text-slate-600">
                    В этой группе пока нет участников.
                  </p>
                </div>
              )}

              {!isMembersLoading && members.length > 0 && (
                <div className="space-y-2">
                  {members.map((member) => {
                    const isEditingThisMember = editingMemberId === member.id;

                    return (
                      <div
                        key={member.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        {isEditingThisMember ? (
                          <div className="space-y-3">
                            <input
                              value={editMemberName}
                              onChange={(event) =>
                                setEditMemberName(event.target.value)
                              }
                              placeholder="Имя участника"
                              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-900"
                            />

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleSaveMemberEdit(member)}
                                disabled={isUpdatingMember}
                                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                              >
                                {isUpdatingMember
                                  ? "Сохраняем..."
                                  : "Сохранить"}
                              </button>

                              <button
                                onClick={handleCancelEditMember}
                                disabled={isUpdatingMember}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                              >
                                Отмена
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {member.name}
                              </p>

                              <p className="text-xs text-slate-500">
                                {member.is_active ? "Активен" : "Отключён"}
                              </p>
                            </div>

                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => handleStartEditMember(member)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                Изменить
                              </button>

                              <button
                                onClick={() => handleToggleMemberActive(member)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                {member.is_active ? "Отключить" : "Включить"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {selectedGroup && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="mb-1 text-xl font-bold text-slate-900">
                Задачи и нормы
              </h2>

              <p className="mb-4 text-sm text-slate-600">
                Группа: {selectedGroup.name}
              </p>

              <div className="mb-4 space-y-3">
                <input
                  value={newTaskName}
                  onChange={(event) => setNewTaskName(event.target.value)}
                  placeholder="Название задачи, например Салават"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-900"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={newTaskUnit}
                    onChange={(event) => setNewTaskUnit(event.target.value)}
                    placeholder="Ед. изм."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-900"
                  />

                  <input
                    type="number"
                    min="0"
                    value={newTaskWeeklyGoal}
                    onChange={(event) =>
                      setNewTaskWeeklyGoal(event.target.value)
                    }
                    placeholder="Норма"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-900"
                  />
                </div>

                <button
                  onClick={handleAddTask}
                  disabled={isAddingTask}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isAddingTask ? "Добавляем..." : "Добавить задачу"}
                </button>
              </div>

              {isTasksLoading && (
                <p className="text-sm text-slate-500">Загружаем задачи...</p>
              )}

              {!isTasksLoading && tasks.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm text-slate-600">
                    В этой группе пока нет задач.
                  </p>
                </div>
              )}

              {!isTasksLoading && tasks.length > 0 && (
                <div className="space-y-2">
                  {tasks.map((task) => {
                    const isEditingThisTask = editingTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        {isEditingThisTask ? (
                          <div className="space-y-3">
                            <input
                              value={editTaskName}
                              onChange={(event) =>
                                setEditTaskName(event.target.value)
                              }
                              placeholder="Название задачи"
                              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-900"
                            />

                            <div className="grid grid-cols-2 gap-2">
                              <input
                                value={editTaskUnit}
                                onChange={(event) =>
                                  setEditTaskUnit(event.target.value)
                                }
                                placeholder="Ед. изм."
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-900"
                              />

                              <input
                                type="number"
                                min="0"
                                value={editTaskWeeklyGoal}
                                onChange={(event) =>
                                  setEditTaskWeeklyGoal(event.target.value)
                                }
                                placeholder="Норма"
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-900"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleSaveTaskEdit(task)}
                                disabled={isUpdatingTask}
                                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                              >
                                {isUpdatingTask
                                  ? "Сохраняем..."
                                  : "Сохранить"}
                              </button>

                              <button
                                onClick={handleCancelEditTask}
                                disabled={isUpdatingTask}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                              >
                                Отмена
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {task.name}
                              </p>

                              <p className="text-xs text-slate-500">
                                Норма: {task.weekly_goal} {task.unit || ""}
                              </p>

                              <p className="text-xs text-slate-500">
                                {task.is_active ? "Активна" : "Отключена"}
                              </p>
                            </div>

                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => handleStartEditTask(task)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                Изменить
                              </button>

                              <button
                                onClick={() => handleToggleTaskActive(task)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                {task.is_active ? "Отключить" : "Включить"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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
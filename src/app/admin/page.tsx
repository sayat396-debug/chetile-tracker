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
  is_archived: boolean | null;
  archived_at: string | null;
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

type ManagementTab = "members" | "tasks";

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [managementTab, setManagementTab] = useState<ManagementTab>("members");

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupSlug, setNewGroupSlug] = useState("");
  const [newGroupWeekStartDay, setNewGroupWeekStartDay] = useState("6");

  const [selectedGroupId, setSelectedGroupId] = useState("");

  const [editingGroupId, setEditingGroupId] = useState("");
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupSlug, setEditGroupSlug] = useState("");
  const [editGroupWeekStartDay, setEditGroupWeekStartDay] = useState("6");

  const [transferringGroupId, setTransferringGroupId] = useState("");
  const [transferEmail, setTransferEmail] = useState("");

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
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [isTransferringGroup, setIsTransferringGroup] = useState(false);
  const [isArchivingGroup, setIsArchivingGroup] = useState(false);
  const [isRestoringGroup, setIsRestoringGroup] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);

  const [message, setMessage] = useState("");

  const activeGroups = groups.filter((group) => !group.is_archived);
  const archivedGroups = groups.filter((group) => group.is_archived);

  const selectedGroup = activeGroups.find(
    (group) => group.id === selectedGroupId
  );

  const activeMembers = members.filter((member) => member.is_active);
  const inactiveMembers = members.filter((member) => !member.is_active);

  const activeTasks = tasks.filter((task) => task.is_active);
  const inactiveTasks = tasks.filter((task) => !task.is_active);

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
        .select(
          "id, name, slug, week_start_day, created_at, is_archived, archived_at"
        )
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      setIsGroupsLoading(false);

      if (error) {
        setMessage("Не удалось загрузить группы.");
        return;
      }

      const loadedGroups = data || [];
      const loadedActiveGroups = loadedGroups.filter(
        (group) => !group.is_archived
      );

      setGroups(loadedGroups);

      if (loadedActiveGroups.length > 0) {
        setSelectedGroupId((current) => {
          const currentIsActive = loadedActiveGroups.some(
            (group) => group.id === current
          );

          return currentIsActive ? current : loadedActiveGroups[0].id;
        });
      } else {
        setSelectedGroupId("");
        setMembers([]);
        setTasks([]);
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

  async function loadGroupsAgain(preferredSelectedGroupId?: string) {
    if (!session) return;

    const { data, error } = await supabase
      .from("groups")
      .select(
        "id, name, slug, week_start_day, created_at, is_archived, archived_at"
      )
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Список групп не обновился.");
      return;
    }

    const loadedGroups = data || [];
    const loadedActiveGroups = loadedGroups.filter(
      (group) => !group.is_archived
    );

    setGroups(loadedGroups);

    if (loadedActiveGroups.length === 0) {
      setSelectedGroupId("");
      setMembers([]);
      setTasks([]);
      return;
    }

    if (
      preferredSelectedGroupId &&
      loadedActiveGroups.some((group) => group.id === preferredSelectedGroupId)
    ) {
      setSelectedGroupId(preferredSelectedGroupId);
      return;
    }

    setSelectedGroupId(loadedActiveGroups[0].id);
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

      const { data, error } = await supabase
        .from("groups")
        .insert({
          owner_id: session.user.id,
          name: cleanName,
          slug: cleanSlug,
          week_start_day: Number(newGroupWeekStartDay),
          is_archived: false,
          archived_at: null,
        })
        .select("id")
        .single();

      if (error) {
        setMessage(error.message);
        setIsCreatingGroup(false);
        return;
      }

      setNewGroupName("");
      setNewGroupSlug("");
      setNewGroupWeekStartDay("6");
      setIsCreateGroupOpen(false);

      await loadGroupsAgain(data.id);

      setMessage("Группа создана.");
    } catch (error) {
      console.error(error);
      setMessage("Не удалось создать группу. Проверь profiles и RLS policies.");
    }

    setIsCreatingGroup(false);
  }

  function handleStartEditGroup(group: Group) {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupSlug(group.slug);
    setEditGroupWeekStartDay(String(group.week_start_day));
    setTransferringGroupId("");
    setTransferEmail("");
    setMessage("");
  }

  function handleCancelEditGroup() {
    setEditingGroupId("");
    setEditGroupName("");
    setEditGroupSlug("");
    setEditGroupWeekStartDay("6");
    setMessage("");
  }

  async function handleSaveGroupEdit(group: Group) {
    const cleanName = editGroupName.trim();
    const cleanSlug = editGroupSlug.trim().toLowerCase();

    if (!cleanName) {
      setMessage("Введите название группы.");
      return;
    }

    if (!cleanSlug) {
      setMessage("Введите slug группы.");
      return;
    }

    setIsUpdatingGroup(true);
    setMessage("");

    const { error } = await supabase
      .from("groups")
      .update({
        name: cleanName,
        slug: cleanSlug,
        week_start_day: Number(editGroupWeekStartDay),
      })
      .eq("id", group.id);

    if (error) {
      setMessage(error.message);
      setIsUpdatingGroup(false);
      return;
    }

    await loadGroupsAgain(group.id);

    setEditingGroupId("");
    setEditGroupName("");
    setEditGroupSlug("");
    setEditGroupWeekStartDay("6");

    setMessage("Настройки группы обновлены.");
    setIsUpdatingGroup(false);
  }

  function handleStartTransferGroup(group: Group) {
    setTransferringGroupId(group.id);
    setTransferEmail("");
    setEditingGroupId("");
    setMessage(
      "Новый админ должен заранее зарегистрироваться через /register. После передачи группа исчезнет из твоей админки."
    );
  }

  function handleCancelTransferGroup() {
    setTransferringGroupId("");
    setTransferEmail("");
    setMessage("");
  }

  async function handleTransferGroup(group: Group) {
    const cleanEmail = transferEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setMessage("Введите email нового админа.");
      return;
    }

    const isConfirmed = window.confirm(
      `Передать группу "${group.name}" пользователю ${cleanEmail}? После передачи эта группа исчезнет из твоей админки.`
    );

    if (!isConfirmed) return;

    setIsTransferringGroup(true);
    setMessage("");

    const { data, error } = await supabase.rpc("transfer_group_by_email", {
      p_group_id: group.id,
      p_new_owner_email: cleanEmail,
    });

    if (error) {
      setMessage(error.message);
      setIsTransferringGroup(false);
      return;
    }

    setTransferringGroupId("");
    setTransferEmail("");

    await loadGroupsAgain();

    setMessage(data || "Группа передана новому админу.");
    setIsTransferringGroup(false);
  }

  async function handleArchiveGroup(group: Group) {
    const isConfirmed = window.confirm(
      `Архивировать группу "${group.name}"? Она исчезнет из активных групп, но данные сохранятся.`
    );

    if (!isConfirmed) return;

    setIsArchivingGroup(true);
    setMessage("");

    const { error } = await supabase
      .from("groups")
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
      })
      .eq("id", group.id);

    if (error) {
      setMessage(error.message);
      setIsArchivingGroup(false);
      return;
    }

    setEditingGroupId("");
    setTransferringGroupId("");
    setTransferEmail("");

    await loadGroupsAgain();

    setMessage("Группа отправлена в архив.");
    setIsArchivingGroup(false);
  }

  async function handleRestoreGroup(group: Group) {
    const isConfirmed = window.confirm(
      `Восстановить группу "${group.name}" из архива?`
    );

    if (!isConfirmed) return;

    setIsRestoringGroup(true);
    setMessage("");

    const { error } = await supabase
      .from("groups")
      .update({
        is_archived: false,
        archived_at: null,
      })
      .eq("id", group.id);

    if (error) {
      setMessage(error.message);
      setIsRestoringGroup(false);
      return;
    }

    await loadGroupsAgain(group.id);

    setMessage("Группа восстановлена из архива.");
    setIsRestoringGroup(false);
  }

  async function handleDeleteArchivedGroup(group: Group) {
    const isConfirmed = window.confirm(
      `Удалить группу "${group.name}" навсегда? Будут удалены участники, задачи, отметки и история. Это действие нельзя отменить.`
    );

    if (!isConfirmed) return;

    const secondConfirm = window.confirm(
      `Точно удалить "${group.name}"? Восстановить данные после удаления уже не получится.`
    );

    if (!secondConfirm) return;

    setIsDeletingGroup(true);
    setMessage("");

    const { data, error } = await supabase.rpc("delete_archived_group", {
      p_group_id: group.id,
    });

    if (error) {
      setMessage(error.message);
      setIsDeletingGroup(false);
      return;
    }

    await loadGroupsAgain();

    setMessage(data || "Группа удалена.");
    setIsDeletingGroup(false);
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

  async function handleSignIn() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setMessage("Введите email.");
      return;
    }

    if (!password) {
      setMessage("Введите пароль.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
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

  function getArchivedDateLabel(archivedAt: string | null) {
    if (!archivedAt) return "Дата архива не указана";

    const date = new Date(archivedAt);

    if (Number.isNaN(date.getTime())) {
      return "Дата архива не указана";
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
  }

  function renderMemberCard(member: Member) {
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
              onChange={(event) => setEditMemberName(event.target.value)}
              placeholder="Имя участника"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-900"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSaveMemberEdit(member)}
                disabled={isUpdatingMember}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isUpdatingMember ? "Сохраняем..." : "Сохранить"}
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
              <p className="font-semibold text-slate-900">{member.name}</p>
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
  }

  function renderTaskCard(task: Task) {
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
              onChange={(event) => setEditTaskName(event.target.value)}
              placeholder="Название задачи"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-900"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                value={editTaskUnit}
                onChange={(event) => setEditTaskUnit(event.target.value)}
                placeholder="Ед. изм."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-900"
              />

              <input
                type="number"
                min="0"
                value={editTaskWeeklyGoal}
                onChange={(event) => setEditTaskWeeklyGoal(event.target.value)}
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
                {isUpdatingTask ? "Сохраняем..." : "Сохранить"}
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
              <p className="font-semibold text-slate-900">{task.name}</p>

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
            <button
              onClick={() => setIsCreateGroupOpen((current) => !current)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-xl font-bold text-slate-900">
                Создать группу
              </span>

              <span className="text-sm font-semibold text-slate-500">
                {isCreateGroupOpen ? "Скрыть" : "Открыть"}
              </span>
            </button>

            {isCreateGroupOpen && (
              <div className="mt-4 space-y-4">
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
            )}
          </div>

          <div className="mb-6">
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              Активные группы
            </h2>

            {isGroupsLoading && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">Загружаем группы...</p>
              </div>
            )}

            {!isGroupsLoading && activeGroups.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">
                  Активных групп пока нет
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Создай новую группу выше или восстанови группу из архива.
                </p>
              </div>
            )}

            {!isGroupsLoading && activeGroups.length > 0 && (
              <div className="space-y-3">
                {activeGroups.map((group) => {
                  const isEditingThisGroup = editingGroupId === group.id;
                  const isTransferringThisGroup =
                    transferringGroupId === group.id;

                  return (
                    <div
                      key={group.id}
                      className={`rounded-2xl border p-4 ${
                        selectedGroupId === group.id
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      {isEditingThisGroup ? (
                        <div className="space-y-3">
                          <input
                            value={editGroupName}
                            onChange={(event) =>
                              setEditGroupName(event.target.value)
                            }
                            placeholder="Название группы"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-900"
                          />

                          <input
                            value={editGroupSlug}
                            onChange={(event) =>
                              setEditGroupSlug(event.target.value)
                            }
                            placeholder="slug"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-900"
                          />

                          <select
                            value={editGroupWeekStartDay}
                            onChange={(event) =>
                              setEditGroupWeekStartDay(event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-slate-900"
                          >
                            <option value="1">Понедельник</option>
                            <option value="2">Вторник</option>
                            <option value="3">Среда</option>
                            <option value="4">Четверг</option>
                            <option value="5">Пятница</option>
                            <option value="6">Суббота</option>
                            <option value="0">Воскресенье</option>
                          </select>

                          <p className="text-xs text-slate-500">
                            Новая ссылка будет: /g/{editGroupSlug || "slug"}
                          </p>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleSaveGroupEdit(group)}
                              disabled={isUpdatingGroup}
                              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                            >
                              {isUpdatingGroup ? "Сохраняем..." : "Сохранить"}
                            </button>

                            <button
                              onClick={handleCancelEditGroup}
                              disabled={isUpdatingGroup}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : isTransferringThisGroup ? (
                        <div className="space-y-3">
                          <p className="font-semibold text-slate-900">
                            Передать группу: {group.name}
                          </p>

                          <p className="text-sm text-slate-600">
                            Введи email нового админа. Он должен заранее
                            зарегистрироваться через /register.
                          </p>

                          <input
                            type="email"
                            value={transferEmail}
                            onChange={(event) =>
                              setTransferEmail(event.target.value)
                            }
                            placeholder="newadmin@mail.com"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-900"
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleTransferGroup(group)}
                              disabled={isTransferringGroup}
                              className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                            >
                              {isTransferringGroup
                                ? "Передаём..."
                                : "Передать"}
                            </button>

                            <button
                              onClick={handleCancelTransferGroup}
                              disabled={isTransferringGroup}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {group.name}
                              </p>

                              <p className="mt-1 text-sm text-slate-600">
                                /g/{group.slug}
                              </p>

                              <p className="mt-1 text-sm text-slate-600">
                                Начало недели:{" "}
                                {getWeekStartDayLabel(group.week_start_day)}
                              </p>
                            </div>

                            {selectedGroupId === group.id && (
                              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                                Выбрана
                              </span>
                            )}
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <Link
                              href={`/g/${group.slug}`}
                              className="rounded-xl bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
                            >
                              Открыть
                            </Link>

                            <button
                              onClick={() => handleStartEditGroup(group)}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                            >
                              Изменить
                            </button>

                            <button
                              onClick={() => handleStartTransferGroup(group)}
                              className="rounded-xl border border-red-200 bg-white px-3 py-2 text-center text-sm font-semibold text-red-700 transition hover:bg-red-50"
                            >
                              Передать
                            </button>

                            <button
                              onClick={() => handleArchiveGroup(group)}
                              disabled={isArchivingGroup}
                              className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-center text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:bg-orange-100"
                            >
                              {isArchivingGroup ? "..." : "В архив"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedGroup && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="mb-1 text-xl font-bold text-slate-900">
                Управление группой
              </h2>

              <p className="mb-4 text-sm text-slate-600">
                Выбери группу и настрой участников или задачи.
              </p>

              <label className="mb-1 block text-sm font-medium text-slate-700">
                Выбранная группа
              </label>

              <select
                value={selectedGroupId}
                onChange={(event) => {
                  setSelectedGroupId(event.target.value);
                  setEditingMemberId("");
                  setEditingTaskId("");
                  setMessage("");
                }}
                className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-slate-900"
              >
                {activeGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>

              <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  onClick={() => setManagementTab("members")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    managementTab === "members"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Участники ({activeMembers.length})
                </button>

                <button
                  onClick={() => setManagementTab("tasks")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    managementTab === "tasks"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Задачи ({activeTasks.length})
                </button>
              </div>

              {managementTab === "members" && (
                <div>
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

                  {!isMembersLoading && activeMembers.length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm text-slate-600">
                        Активных участников пока нет.
                      </p>
                    </div>
                  )}

                  {!isMembersLoading && activeMembers.length > 0 && (
                    <div className="space-y-2">
                      {activeMembers.map((member) => renderMemberCard(member))}
                    </div>
                  )}

                  {!isMembersLoading && inactiveMembers.length > 0 && (
                    <div className="mt-5">
                      <h3 className="mb-2 text-sm font-bold text-slate-500">
                        Отключённые участники
                      </h3>

                      <div className="space-y-2">
                        {inactiveMembers.map((member) =>
                          renderMemberCard(member)
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {managementTab === "tasks" && (
                <div>
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
                    <p className="text-sm text-slate-500">
                      Загружаем задачи...
                    </p>
                  )}

                  {!isTasksLoading && activeTasks.length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm text-slate-600">
                        Активных задач пока нет.
                      </p>
                    </div>
                  )}

                  {!isTasksLoading && activeTasks.length > 0 && (
                    <div className="space-y-2">
                      {activeTasks.map((task) => renderTaskCard(task))}
                    </div>
                  )}

                  {!isTasksLoading && inactiveTasks.length > 0 && (
                    <div className="mt-5">
                      <h3 className="mb-2 text-sm font-bold text-slate-500">
                        Отключённые задачи
                      </h3>

                      <div className="space-y-2">
                        {inactiveTasks.map((task) => renderTaskCard(task))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {archivedGroups.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                Архив групп
              </h2>

              <div className="space-y-3">
                {archivedGroups.map((group) => (
                  <div
                    key={group.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-semibold text-slate-900">
                      {group.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      /g/{group.slug}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      В архиве с: {getArchivedDateLabel(group.archived_at)}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleRestoreGroup(group)}
                        disabled={isRestoringGroup}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {isRestoringGroup ? "..." : "Восстановить"}
                      </button>

                      <button
                        onClick={() => handleDeleteArchivedGroup(group)}
                        disabled={isDeletingGroup}
                        className="rounded-xl border border-red-200 bg-white px-3 py-2 text-center text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-red-100"
                      >
                        {isDeletingGroup ? "..." : "Удалить"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
          Войди, чтобы управлять группами, участниками и задачами.
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
              placeholder="Введите пароль"
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
          onClick={handleSignIn}
          disabled={isSubmitting}
          className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? "Входим..." : "Войти"}
        </button>

        <Link
          href="/reset-password"
          className="mt-4 block text-center text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Забыли пароль?
        </Link>

        <Link
          href="/register"
          className="mt-5 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          Создать аккаунт администратора
        </Link>

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
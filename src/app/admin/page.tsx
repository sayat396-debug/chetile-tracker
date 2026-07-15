"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import AuthShell from "@/components/AuthShell";

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
  has_pin: boolean | null;
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
  const [newGroupWeekStartDay, setNewGroupWeekStartDay] = useState("6");

  const [selectedGroupId, setSelectedGroupId] = useState("");

  const [editingGroupId, setEditingGroupId] = useState("");
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupWeekStartDay, setEditGroupWeekStartDay] = useState("6");

  const [transferringGroupId, setTransferringGroupId] = useState("");
  const [transferEmail, setTransferEmail] = useState("");

  const [newMemberName, setNewMemberName] = useState("");
  const [editingMemberId, setEditingMemberId] = useState("");
  const [editMemberName, setEditMemberName] = useState("");

  const [pinEditingMemberId, setPinEditingMemberId] = useState("");
  const [pinValue, setPinValue] = useState("");

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
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const [message, setMessage] = useState("");

  const activeGroups = groups.filter((group) => !group.is_archived);
  const archivedGroups = groups.filter((group) => group.is_archived);

  const selectedGroup = activeGroups.find(
    (group) => group.id === selectedGroupId,
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
          "id, name, slug, week_start_day, created_at, is_archived, archived_at",
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
        (group) => !group.is_archived,
      );

      setGroups(loadedGroups);

      if (loadedActiveGroups.length > 0) {
        setSelectedGroupId((current) => {
          const currentIsActive = loadedActiveGroups.some(
            (group) => group.id === current,
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
        .from("group_members_public")
        .select("id, group_id, name, display_order, is_active, has_pin")
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
        .select(
          "id, group_id, name, unit, weekly_goal, display_order, is_active",
        )
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

  function transliterate(text: string) {
    const map: Record<string, string> = {
      а: "a",
      б: "b",
      в: "v",
      г: "g",
      д: "d",
      е: "e",
      ё: "e",
      ж: "zh",
      з: "z",
      и: "i",
      й: "y",
      к: "k",
      л: "l",
      м: "m",
      н: "n",
      о: "o",
      п: "p",
      р: "r",
      с: "s",
      т: "t",
      у: "u",
      ф: "f",
      х: "h",
      ц: "ts",
      ч: "ch",
      ш: "sh",
      щ: "sch",
      ъ: "",
      ы: "y",
      ь: "",
      э: "e",
      ю: "yu",
      я: "ya",
      қ: "k",
      ғ: "g",
      ә: "a",
      ң: "n",
      ө: "o",
      ұ: "u",
      ү: "u",
      һ: "h",
      і: "i",
    };

    return text
      .toLowerCase()
      .split("")
      .map((char) => map[char] ?? char)
      .join("");
  }

  function makeSlugFromName(name: string) {
    const baseSlug = transliterate(name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);

    return baseSlug || "group";
  }

  async function makeUniqueSlug(name: string) {
    const baseSlug = makeSlugFromName(name);

    for (let attempt = 0; attempt < 5; attempt++) {
      const randomPart = Math.random().toString(36).slice(2, 6);
      const candidate = `${baseSlug}-${randomPart}`;

      const { data, error } = await supabase
        .from("groups")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return candidate;
      }
    }

    return `${baseSlug}-${Date.now().toString(36)}`;
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
        "id, name, slug, week_start_day, created_at, is_archived, archived_at",
      )
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Список групп не обновился.");
      return;
    }

    const loadedGroups = data || [];
    const loadedActiveGroups = loadedGroups.filter(
      (group) => !group.is_archived,
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
      .from("group_members_public")
      .select("id, group_id, name, display_order, is_active, has_pin")
      .eq("group_id", groupId)
      .order("display_order", { ascending: true });

    if (error) {
      setMessage("Список участников не обновился.");
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
      setMessage("Список задач не обновился.");
      return;
    }

    setTasks(data || []);
  }

  function getGroupLink(group: Group) {
    if (typeof window === "undefined") {
      return `/g/${group.slug}`;
    }

    return `${window.location.origin}/g/${group.slug}`;
  }

  async function handleShareGroup(group: Group) {
    const groupLink = getGroupLink(group);

    try {
      if (navigator.share) {
        await navigator.share({
          title: group.name,
          text: `Откройте группу «${group.name}» в QadamTrack`,
          url: groupLink,
        });

        setMessage("Ссылка отправлена.");
        return;
      }

      await navigator.clipboard.writeText(groupLink);
      setMessage(`Ссылка скопирована: ${groupLink}`);
    } catch {
      setMessage(`Ссылка группы: ${groupLink}`);
    }
  }

  async function handleCreateGroup() {
    if (!session) return;

    const cleanName = newGroupName.trim();

    if (!cleanName) {
      setMessage("Введите название группы.");
      return;
    }

    setIsCreatingGroup(true);
    setMessage("");

    try {
      await ensureProfileExists(session);

      const autoSlug = await makeUniqueSlug(cleanName);

      const { data, error } = await supabase
        .from("groups")
        .insert({
          owner_id: session.user.id,
          name: cleanName,
          slug: autoSlug,
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
      setNewGroupWeekStartDay("6");
      setIsCreateGroupOpen(false);

      await loadGroupsAgain(data.id);

      setMessage("Группа создана. Ссылка сформирована автоматически.");
    } catch (error) {
      console.error(error);
      setMessage("Не удалось создать группу. Проверь RLS policies и slug.");
    }

    setIsCreatingGroup(false);
  }

  function handleStartEditGroup(group: Group) {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupWeekStartDay(String(group.week_start_day));
    setTransferringGroupId("");
    setTransferEmail("");
    setMessage("");
  }

  function handleCancelEditGroup() {
    setEditingGroupId("");
    setEditGroupName("");
    setEditGroupWeekStartDay("6");
    setMessage("");
  }

  async function handleSaveGroupEdit(group: Group) {
    const cleanName = editGroupName.trim();

    if (!cleanName) {
      setMessage("Введите название группы.");
      return;
    }

    setIsUpdatingGroup(true);
    setMessage("");

    const { error } = await supabase
      .from("groups")
      .update({
        name: cleanName,
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
    setEditGroupWeekStartDay("6");

    setMessage("Настройки группы обновлены. Ссылка группы не изменилась.");
    setIsUpdatingGroup(false);
  }

  function handleStartTransferGroup(group: Group) {
    setTransferringGroupId(group.id);
    setTransferEmail("");
    setEditingGroupId("");
    setMessage(
      "Новый администратор должен заранее зарегистрироваться через /register. После передачи группа исчезнет из вашей админ-панели.",
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
      `Передать группу "${group.name}" пользователю ${cleanEmail}? После передачи эта группа исчезнет из вашей админ-панели.`,
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
      `Архивировать группу "${group.name}"? Она исчезнет из активных групп, но данные сохранятся.`,
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
      `Восстановить группу "${group.name}" из архива?`,
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
      `Удалить группу "${group.name}" навсегда? Будут удалены участники, задачи, отметки и история. Это действие нельзя отменить.`,
    );

    if (!isConfirmed) return;

    const secondConfirm = window.confirm(
      `Точно удалить "${group.name}"? Восстановить данные после удаления уже не получится.`,
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
    setPinEditingMemberId("");
    setPinValue("");
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

  function handleStartEditPin(member: Member) {
    setPinEditingMemberId(member.id);
    setPinValue("");
    setEditingMemberId("");
    setMessage("");
  }

  function handleCancelEditPin() {
    setPinEditingMemberId("");
    setPinValue("");
    setMessage("");
  }

  async function handleSaveMemberPin(member: Member) {
    const cleanPin = pinValue.trim();

    if (!/^[0-9]{4,8}$/.test(cleanPin)) {
      setMessage("PIN-код должен состоять из 4–8 цифр.");
      return;
    }

    setIsSavingPin(true);
    setMessage("");

    const { data, error } = await supabase.rpc("set_member_pin", {
      p_member_id: member.id,
      p_pin_code: cleanPin,
    });

    if (error) {
      setMessage(error.message);
      setIsSavingPin(false);
      return;
    }

    await loadMembersAgain(member.group_id);

    setPinEditingMemberId("");
    setPinValue("");

    setMessage(data || "PIN-код сохранён.");
    setIsSavingPin(false);
  }

  async function handleRemoveMemberPin(member: Member) {
    const isConfirmed = window.confirm(
      `Убрать PIN-код у участника "${member.name}"? После этого он сможет заходить без PIN.`,
    );

    if (!isConfirmed) return;

    setIsSavingPin(true);
    setMessage("");

    const { data, error } = await supabase.rpc("set_member_pin", {
      p_member_id: member.id,
      p_pin_code: "",
    });

    if (error) {
      setMessage(error.message);
      setIsSavingPin(false);
      return;
    }

    await loadMembersAgain(member.group_id);

    setPinEditingMemberId("");
    setPinValue("");

    setMessage(data || "PIN-код отключён.");
    setIsSavingPin(false);
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

  async function handleDeleteInactiveMember(member: Member) {
    const isConfirmed = window.confirm(
      `Удалить участника "${member.name}" навсегда? Его отметки и история по этой группе будут удалены.`,
    );

    if (!isConfirmed) return;

    const secondConfirm = window.confirm(
      `Точно удалить участника "${member.name}"? Это действие нельзя отменить.`,
    );

    if (!secondConfirm) return;

    setIsDeletingMember(true);
    setMessage("");

    const { data, error } = await supabase.rpc("delete_inactive_member", {
      p_member_id: member.id,
    });

    if (error) {
      setMessage(error.message);
      setIsDeletingMember(false);
      return;
    }

    await loadMembersAgain(member.group_id);

    setMessage(data || "Участник удалён.");
    setIsDeletingMember(false);
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

  async function handleDeleteInactiveTask(task: Task) {
    const isConfirmed = window.confirm(
      `Удалить задачу "${task.name}" навсегда? Все отметки по этой задаче будут удалены.`,
    );

    if (!isConfirmed) return;

    const secondConfirm = window.confirm(
      `Точно удалить задачу "${task.name}"? Это действие нельзя отменить.`,
    );

    if (!secondConfirm) return;

    setIsDeletingTask(true);
    setMessage("");

    const { data, error } = await supabase.rpc("delete_inactive_task", {
      p_task_id: task.id,
    });

    if (error) {
      setMessage(error.message);
      setIsDeletingTask(false);
      return;
    }

    await loadTasksAgain(task.group_id);

    setMessage(data || "Задача удалена.");
    setIsDeletingTask(false);
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
    setMessage("Вы вышли из админ-панели.");
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

  function getInitials(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";

  const primaryButtonClass =
    "rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";

  const secondaryButtonClass =
    "rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  function renderMemberCard(member: Member) {
    const isEditingThisMember = editingMemberId === member.id;
    const isEditingThisPin = pinEditingMemberId === member.id;

    return (
      <article
        key={member.id}
        className={`rounded-3xl border p-4 transition ${
          member.is_active
            ? "border-slate-200 bg-white"
            : "border-slate-200 bg-slate-50 opacity-80"
        }`}
      >
        {isEditingThisMember ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">
                Изменение участника
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Обновите имя, которое будет видно в группе.
              </p>
            </div>

            <input
              value={editMemberName}
              onChange={(event) => setEditMemberName(event.target.value)}
              placeholder="Имя участника"
              className={inputClass}
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSaveMemberEdit(member)}
                disabled={isUpdatingMember}
                className={primaryButtonClass}
              >
                {isUpdatingMember ? "Сохраняем..." : "Сохранить"}
              </button>

              <button
                onClick={handleCancelEditMember}
                disabled={isUpdatingMember}
                className={secondaryButtonClass}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : isEditingThisPin ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">
                Защита участника
              </p>
              <p className="mt-1 font-black text-slate-950">
                PIN для {member.name}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Введите 4–8 цифр. На этом устройстве PIN можно запомнить.
              </p>
            </div>

            <input
              type="password"
              inputMode="numeric"
              value={pinValue}
              onChange={(event) => setPinValue(event.target.value)}
              placeholder="Например: 1234"
              className={inputClass}
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSaveMemberPin(member)}
                disabled={isSavingPin}
                className={primaryButtonClass}
              >
                {isSavingPin ? "Сохраняем..." : "Сохранить PIN"}
              </button>

              <button
                onClick={handleCancelEditPin}
                disabled={isSavingPin}
                className={secondaryButtonClass}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-black text-emerald-800">
                {getInitials(member.name)}
              </div>

              <div className="min-w-0">
                <p className="truncate font-black text-slate-950">
                  {member.name}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      member.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {member.is_active ? "Активен" : "Отключён"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    {member.has_pin ? "PIN включён" : "Без PIN"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:max-w-sm sm:justify-end">
              <button
                onClick={() => handleStartEditMember(member)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Изменить
              </button>

              <button
                onClick={() => handleStartEditPin(member)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                {member.has_pin ? "Сменить PIN" : "Поставить PIN"}
              </button>

              {member.has_pin && (
                <button
                  onClick={() => handleRemoveMemberPin(member)}
                  disabled={isSavingPin}
                  className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
                >
                  Убрать PIN
                </button>
              )}

              <button
                onClick={() => handleToggleMemberActive(member)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                {member.is_active ? "Отключить" : "Включить"}
              </button>

              {!member.is_active && (
                <button
                  onClick={() => handleDeleteInactiveMember(member)}
                  disabled={isDeletingMember}
                  className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  {isDeletingMember ? "..." : "Удалить"}
                </button>
              )}
            </div>
          </div>
        )}
      </article>
    );
  }

  function renderTaskCard(task: Task) {
    const isEditingThisTask = editingTaskId === task.id;

    return (
      <article
        key={task.id}
        className={`rounded-3xl border p-4 transition ${
          task.is_active
            ? "border-slate-200 bg-white"
            : "border-slate-200 bg-slate-50 opacity-80"
        }`}
      >
        {isEditingThisTask ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">
                Изменение задачи
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Название, единица измерения и недельная норма.
              </p>
            </div>

            <input
              value={editTaskName}
              onChange={(event) => setEditTaskName(event.target.value)}
              placeholder="Название задачи"
              className={inputClass}
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                value={editTaskUnit}
                onChange={(event) => setEditTaskUnit(event.target.value)}
                placeholder="Ед. изм."
                className={inputClass}
              />

              <input
                type="number"
                min="0"
                value={editTaskWeeklyGoal}
                onChange={(event) => setEditTaskWeeklyGoal(event.target.value)}
                placeholder="Норма"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSaveTaskEdit(task)}
                disabled={isUpdatingTask}
                className={primaryButtonClass}
              >
                {isUpdatingTask ? "Сохраняем..." : "Сохранить"}
              </button>

              <button
                onClick={handleCancelEditTask}
                disabled={isUpdatingTask}
                className={secondaryButtonClass}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-lg font-black text-sky-800">
                ↗
              </div>

              <div className="min-w-0">
                <p className="truncate font-black text-slate-950">
                  {task.name}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Норма: {task.weekly_goal} {task.unit || ""} в неделю
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                    task.is_active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {task.is_active ? "Активна" : "Отключена"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                onClick={() => handleStartEditTask(task)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Изменить
              </button>

              <button
                onClick={() => handleToggleTaskActive(task)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                {task.is_active ? "Отключить" : "Включить"}
              </button>

              {!task.is_active && (
                <button
                  onClick={() => handleDeleteInactiveTask(task)}
                  disabled={isDeletingTask}
                  className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  {isDeletingTask ? "..." : "Удалить"}
                </button>
              )}
            </div>
          </div>
        )}
      </article>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-sky-50 px-4 py-8">
        <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-200/60">
          <div className="bg-slate-950 p-6">
            <BrandMark inverse />
          </div>
          <div className="space-y-3 p-6">
            <div className="h-5 w-40 animate-pulse rounded-full bg-slate-100" />
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </main>
    );
  }

  if (session) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-sky-50 px-3 py-4 sm:px-5 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <header className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-5 shadow-2xl shadow-slate-300/50 sm:p-7">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />

            <div className="relative">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <BrandMark inverse />

                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/"
                    className="rounded-full bg-white/10 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/10 transition hover:bg-white/15"
                  >
                    Главная
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="rounded-full bg-rose-500/15 px-4 py-2.5 text-sm font-bold text-rose-200 ring-1 ring-rose-400/20 transition hover:bg-rose-500/25"
                  >
                    Выйти
                  </button>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
                    Панель администратора
                  </p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                    Управление QadamTrack
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                    Создавайте группы, управляйте участниками и настраивайте
                    недельные цели в одном месте.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-xs font-medium text-slate-400">
                    Вы вошли как
                  </p>
                  <p className="mt-1 break-all font-black text-white">
                    {session.user.email}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-xs text-slate-400">Группы</p>
                  <p className="mt-1 text-2xl font-black text-white">
                    {activeGroups.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-xs text-slate-400">Участники</p>
                  <p className="mt-1 text-2xl font-black text-white">
                    {activeMembers.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-xs text-slate-400">Задачи</p>
                  <p className="mt-1 text-2xl font-black text-white">
                    {activeTasks.length}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {message && (
            <div className="mt-4 rounded-2xl border border-white/80 bg-white/90 p-4 text-sm font-semibold text-slate-700 shadow-lg shadow-slate-200/40 backdrop-blur">
              {message}
            </div>
          )}

          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-slate-200/50 sm:p-6">
                <button
                  onClick={() => setIsCreateGroupOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <span>
                    <span className="block text-xs font-black uppercase tracking-[0.14em] text-emerald-600">
                      Новая группа
                    </span>
                    <span className="mt-1 block text-xl font-black text-slate-950">
                      Создать пространство
                    </span>
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-black text-emerald-700">
                    {isCreateGroupOpen ? "−" : "+"}
                  </span>
                </button>

                {isCreateGroupOpen && (
                  <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Название группы
                      </label>
                      <input
                        value={newGroupName}
                        onChange={(event) =>
                          setNewGroupName(event.target.value)
                        }
                        placeholder="Например: Клуб полезных привычек"
                        className={inputClass}
                      />
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Ссылка группы будет создана автоматически.
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Начало недели
                      </label>
                      <select
                        value={newGroupWeekStartDay}
                        onChange={(event) =>
                          setNewGroupWeekStartDay(event.target.value)
                        }
                        className={inputClass}
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
                      className={`w-full ${primaryButtonClass}`}
                    >
                      {isCreatingGroup ? "Создаём..." : "Создать группу"}
                    </button>
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-slate-200/50 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Ваши пространства
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      Активные группы
                    </h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {activeGroups.length}
                  </span>
                </div>

                {isGroupsLoading && (
                  <div className="mt-5 space-y-3">
                    {[1, 2].map((item) => (
                      <div
                        key={item}
                        className="h-28 animate-pulse rounded-3xl bg-slate-100"
                      />
                    ))}
                  </div>
                )}

                {!isGroupsLoading && activeGroups.length === 0 && (
                  <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                    <p className="font-black text-slate-950">
                      Активных групп пока нет
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Создайте новую группу или восстановите её из архива.
                    </p>
                  </div>
                )}

                {!isGroupsLoading && activeGroups.length > 0 && (
                  <div className="mt-5 space-y-3">
                    {activeGroups.map((group) => {
                      const isEditingThisGroup = editingGroupId === group.id;
                      const isTransferringThisGroup =
                        transferringGroupId === group.id;
                      const isSelected = selectedGroupId === group.id;

                      return (
                        <article
                          key={group.id}
                          className={`rounded-3xl border p-4 transition ${
                            isSelected
                              ? "border-emerald-300 bg-emerald-50/70 ring-4 ring-emerald-50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          {isEditingThisGroup ? (
                            <div className="space-y-3">
                              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">
                                Изменение группы
                              </p>
                              <input
                                value={editGroupName}
                                onChange={(event) =>
                                  setEditGroupName(event.target.value)
                                }
                                placeholder="Название группы"
                                className={inputClass}
                              />
                              <select
                                value={editGroupWeekStartDay}
                                onChange={(event) =>
                                  setEditGroupWeekStartDay(event.target.value)
                                }
                                className={inputClass}
                              >
                                <option value="1">Понедельник</option>
                                <option value="2">Вторник</option>
                                <option value="3">Среда</option>
                                <option value="4">Четверг</option>
                                <option value="5">Пятница</option>
                                <option value="6">Суббота</option>
                                <option value="0">Воскресенье</option>
                              </select>
                              <p className="text-xs leading-5 text-slate-500">
                                Ссылка группы не меняется, чтобы участники не
                                потеряли доступ.
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => handleSaveGroupEdit(group)}
                                  disabled={isUpdatingGroup}
                                  className={primaryButtonClass}
                                >
                                  {isUpdatingGroup
                                    ? "Сохраняем..."
                                    : "Сохранить"}
                                </button>
                                <button
                                  onClick={handleCancelEditGroup}
                                  disabled={isUpdatingGroup}
                                  className={secondaryButtonClass}
                                >
                                  Отмена
                                </button>
                              </div>
                            </div>
                          ) : isTransferringThisGroup ? (
                            <div className="space-y-3">
                              <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-600">
                                Передача владельца
                              </p>
                              <p className="font-black text-slate-950">
                                {group.name}
                              </p>
                              <p className="text-sm leading-6 text-slate-600">
                                Новый администратор должен заранее
                                зарегистрироваться через страницу регистрации.
                              </p>
                              <input
                                type="email"
                                value={transferEmail}
                                onChange={(event) =>
                                  setTransferEmail(event.target.value)
                                }
                                placeholder="newadmin@mail.com"
                                className={inputClass}
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => handleTransferGroup(group)}
                                  disabled={isTransferringGroup}
                                  className="rounded-2xl bg-rose-600 px-4 py-3 font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                                >
                                  {isTransferringGroup
                                    ? "Передаём..."
                                    : "Передать"}
                                </button>
                                <button
                                  onClick={handleCancelTransferGroup}
                                  disabled={isTransferringGroup}
                                  className={secondaryButtonClass}
                                >
                                  Отмена
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate font-black text-slate-950">
                                      {group.name}
                                    </h3>
                                    {isSelected && (
                                      <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                                        Выбрана
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 truncate text-sm font-medium text-slate-500">
                                    /g/{group.slug}
                                  </p>
                                  <p className="mt-2 text-xs text-slate-500">
                                    Неделя начинается:{" "}
                                    {getWeekStartDayLabel(group.week_start_day)}
                                  </p>
                                </div>
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg">
                                  ↗
                                </div>
                              </div>

                              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                <Link
                                  href={`/g/${group.slug}`}
                                  className="rounded-xl bg-slate-950 px-3 py-2.5 text-center text-xs font-bold text-white transition hover:bg-slate-800"
                                >
                                  Открыть
                                </Link>
                                <button
                                  onClick={() => setSelectedGroupId(group.id)}
                                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                                >
                                  Настроить
                                </button>
                                <button
                                  onClick={() => handleShareGroup(group)}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Поделиться
                                </button>
                                <button
                                  onClick={() => handleStartEditGroup(group)}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Изменить
                                </button>
                                <button
                                  onClick={() =>
                                    handleStartTransferGroup(group)
                                  }
                                  className="rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
                                >
                                  Передать
                                </button>
                                <button
                                  onClick={() => handleArchiveGroup(group)}
                                  disabled={isArchivingGroup}
                                  className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-xs font-bold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
                                >
                                  {isArchivingGroup ? "..." : "В архив"}
                                </button>
                              </div>
                            </>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-slate-200/50 sm:p-6 lg:sticky lg:top-4">
              {selectedGroup ? (
                <>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">
                        Настройки группы
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-slate-950">
                        {selectedGroup.name}
                      </h2>
                    </div>

                    <div className="w-full sm:max-w-xs">
                      <label className="mb-2 block text-xs font-bold text-slate-500">
                        Выбранная группа
                      </label>
                      <select
                        value={selectedGroupId}
                        onChange={(event) => {
                          setSelectedGroupId(event.target.value);
                          setEditingMemberId("");
                          setEditingTaskId("");
                          setPinEditingMemberId("");
                          setPinValue("");
                          setMessage("");
                        }}
                        className={inputClass}
                      >
                        {activeGroups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1.5">
                    <button
                      onClick={() => setManagementTab("members")}
                      className={`rounded-xl px-3 py-3 text-sm font-black transition ${
                        managementTab === "members"
                          ? "bg-slate-950 text-white shadow-sm"
                          : "text-slate-500 hover:bg-white hover:text-slate-900"
                      }`}
                    >
                      Участники ({activeMembers.length})
                    </button>
                    <button
                      onClick={() => setManagementTab("tasks")}
                      className={`rounded-xl px-3 py-3 text-sm font-black transition ${
                        managementTab === "tasks"
                          ? "bg-slate-950 text-white shadow-sm"
                          : "text-slate-500 hover:bg-white hover:text-slate-900"
                      }`}
                    >
                      Задачи ({activeTasks.length})
                    </button>
                  </div>

                  {managementTab === "members" && (
                    <div className="mt-5">
                      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                        <label className="mb-2 block text-sm font-black text-emerald-950">
                          Добавить участника
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            value={newMemberName}
                            onChange={(event) =>
                              setNewMemberName(event.target.value)
                            }
                            placeholder="Имя участника"
                            className={`${inputClass} min-w-0 flex-1 bg-white`}
                          />
                          <button
                            onClick={handleAddMember}
                            disabled={isAddingMember}
                            className={`${primaryButtonClass} shrink-0 sm:px-6`}
                          >
                            {isAddingMember ? "Добавляем..." : "Добавить"}
                          </button>
                        </div>
                      </div>

                      {isMembersLoading && (
                        <div className="mt-4 space-y-3">
                          {[1, 2].map((item) => (
                            <div
                              key={item}
                              className="h-24 animate-pulse rounded-3xl bg-slate-100"
                            />
                          ))}
                        </div>
                      )}

                      {!isMembersLoading && activeMembers.length === 0 && (
                        <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-600">
                          Активных участников пока нет.
                        </div>
                      )}

                      {!isMembersLoading && activeMembers.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {activeMembers.map((member) =>
                            renderMemberCard(member),
                          )}
                        </div>
                      )}

                      {!isMembersLoading && inactiveMembers.length > 0 && (
                        <div className="mt-7">
                          <h3 className="mb-3 text-sm font-black text-slate-500">
                            Отключённые участники
                          </h3>
                          <div className="space-y-3">
                            {inactiveMembers.map((member) =>
                              renderMemberCard(member),
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {managementTab === "tasks" && (
                    <div className="mt-5">
                      <div className="rounded-3xl border border-sky-200 bg-sky-50 p-4">
                        <label className="mb-2 block text-sm font-black text-sky-950">
                          Добавить задачу
                        </label>
                        <div className="space-y-2">
                          <input
                            value={newTaskName}
                            onChange={(event) =>
                              setNewTaskName(event.target.value)
                            }
                            placeholder="Например: Чтение книги"
                            className={`${inputClass} bg-white`}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              value={newTaskUnit}
                              onChange={(event) =>
                                setNewTaskUnit(event.target.value)
                              }
                              placeholder="Например: страниц"
                              className={`${inputClass} bg-white`}
                            />
                            <input
                              type="number"
                              min="0"
                              value={newTaskWeeklyGoal}
                              onChange={(event) =>
                                setNewTaskWeeklyGoal(event.target.value)
                              }
                              placeholder="Например: 70"
                              className={`${inputClass} bg-white`}
                            />
                          </div>
                          <button
                            onClick={handleAddTask}
                            disabled={isAddingTask}
                            className={`w-full ${primaryButtonClass}`}
                          >
                            {isAddingTask ? "Добавляем..." : "Добавить задачу"}
                          </button>
                        </div>
                      </div>

                      {isTasksLoading && (
                        <div className="mt-4 space-y-3">
                          {[1, 2].map((item) => (
                            <div
                              key={item}
                              className="h-24 animate-pulse rounded-3xl bg-slate-100"
                            />
                          ))}
                        </div>
                      )}

                      {!isTasksLoading && activeTasks.length === 0 && (
                        <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-600">
                          Активных задач пока нет.
                        </div>
                      )}

                      {!isTasksLoading && activeTasks.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {activeTasks.map((task) => renderTaskCard(task))}
                        </div>
                      )}

                      {!isTasksLoading && inactiveTasks.length > 0 && (
                        <div className="mt-7">
                          <h3 className="mb-3 text-sm font-black text-slate-500">
                            Отключённые задачи
                          </h3>
                          <div className="space-y-3">
                            {inactiveTasks.map((task) => renderTaskCard(task))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                    +
                  </div>
                  <h2 className="mt-4 text-xl font-black text-slate-950">
                    Создайте первую группу
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                    После создания здесь появятся участники, задачи и настройки
                    недельных целей.
                  </p>
                </div>
              )}
            </section>
          </div>

          {archivedGroups.length > 0 && (
            <section className="mt-4 rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-slate-200/50 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Неактивные пространства
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Архив групп
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {archivedGroups.length}
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {archivedGroups.map((group) => (
                  <article
                    key={group.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950">
                          {group.name}
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          /g/{group.slug}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
                        Архив
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      В архиве с: {getArchivedDateLabel(group.archived_at)}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleRestoreGroup(group)}
                        disabled={isRestoringGroup}
                        className="rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        {isRestoringGroup ? "..." : "Восстановить"}
                      </button>
                      <button
                        onClick={() => handleDeleteArchivedGroup(group)}
                        disabled={isDeletingGroup}
                        className="rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        {isDeletingGroup ? "..." : "Удалить"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <footer className="py-7 text-center text-xs font-medium text-slate-400">
            QadamTrack · двигайтесь к цели вместе, шаг за шагом
          </footer>
        </div>
      </main>
    );
  }

  return (
    <AuthShell
      eyebrow="Админ-панель"
      title="Войдите в аккаунт"
      description="Управляйте группами, участниками, задачами и недельными нормами."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSignIn();
        }}
        className="space-y-5"
      >
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Email
          </label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="example@mail.com"
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Пароль
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Введите пароль"
            className={inputClass}
          />
        </div>

        {message && (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-slate-950 px-4 py-3.5 text-lg font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Входим..." : "Войти"}
        </button>
      </form>

      <Link
        href="/reset-password"
        className="mt-4 block text-center text-sm font-bold text-emerald-700 transition hover:text-emerald-900"
      >
        Забыли пароль?
      </Link>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <p className="text-center text-sm text-slate-500">Ещё нет аккаунта?</p>
        <Link
          href="/register"
          className="mt-3 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-center font-bold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Создать аккаунт администратора
        </Link>
      </div>
    </AuthShell>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { supabase } from "@/lib/supabaseClient";

const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

type Member = {
  id: string;
  name: string;
  display_order: number | null;
  has_pin: boolean | null;
  pin_updated_at: string | null;
};

type Task = {
  id: string;
  name: string;
  unit: string | null;
  weekly_goal: number;
  display_order: number | null;
};

type Group = {
  id: string;
  name: string;
  slug: string;
  week_start_day: number;
  created_at: string | null;
  is_archived: boolean | null;
};

type EntryRow = {
  member_id: string;
  task_id: string;
  entry_date: string;
  value: number;
};

type EntryValues = Record<string, string>;
type Entries = Record<string, EntryValues>;
type Tab = "mark" | "my-progress" | "group-results";

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

function formatDisplayDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${day}.${month}`;
}

function getTodayKey() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return toDateKey(today);
}

function getWeekStartDateForDate(date: Date, weekStartDay: number) {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(12, 0, 0, 0);

  const currentDay = normalizedDate.getDay();
  const diff = (currentDay - weekStartDay + 7) % 7;

  const weekStart = new Date(normalizedDate);
  weekStart.setDate(normalizedDate.getDate() - diff);

  return weekStart;
}

function getCurrentWeekStartDate(weekStartDay: number) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return getWeekStartDateForDate(today, weekStartDay);
}

function getWeekDaysFromStart(weekStartDateKey: string) {
  const weekStart = parseDateKey(weekStartDateKey);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);

    return {
      label: dayNames[date.getDay()],
      date: toDateKey(date),
      displayDate: formatDisplayDate(date),
    };
  });
}

function getCreatedWeekStartDateKey(
  groupCreatedAt: string | null,
  weekStartDay: number,
) {
  if (!groupCreatedAt) {
    return "";
  }

  const createdAtDate = new Date(groupCreatedAt);

  if (Number.isNaN(createdAtDate.getTime())) {
    return "";
  }

  const createdWeekStart = getWeekStartDateForDate(createdAtDate, weekStartDay);

  return toDateKey(createdWeekStart);
}

function getWeekOptions(
  weekStartDay: number,
  groupCreatedAt: string | null,
  maxWeeks = 100,
) {
  const currentWeekStart = getCurrentWeekStartDate(weekStartDay);
  const createdWeekStartKey = getCreatedWeekStartDateKey(
    groupCreatedAt,
    weekStartDay,
  );

  const options = [];

  for (let index = 0; index < maxWeeks; index++) {
    const startDate = new Date(currentWeekStart);
    startDate.setDate(currentWeekStart.getDate() - index * 7);

    const startDateKey = toDateKey(startDate);

    if (createdWeekStartKey && startDateKey < createdWeekStartKey) {
      break;
    }

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const dateLabel = `${formatDisplayDate(startDate)}–${formatDisplayDate(
      endDate,
    )}`;

    let label = dateLabel;

    if (index === 0) {
      label = `Текущая неделя: ${dateLabel}`;
    }

    if (index === 1) {
      label = `Прошлая неделя: ${dateLabel}`;
    }

    options.push({
      value: startDateKey,
      label,
    });
  }

  return options;
}

function getDefaultSelectedDayForWeek(weekStartDateKey: string) {
  const todayKey = getTodayKey();
  const days = getWeekDaysFromStart(weekStartDateKey);

  const todayInSelectedWeek = days.find((day) => day.date === todayKey);

  if (todayInSelectedWeek) {
    return todayInSelectedWeek.date;
  }

  return days[0]?.date || "";
}

function convertEntriesRowsToState(rows: EntryRow[]) {
  const result: Entries = {};

  rows.forEach((row) => {
    const key = `${row.member_id}_${row.entry_date}`;

    result[key] = {
      ...result[key],
      [row.task_id]: String(row.value ?? 0),
    };
  });

  return result;
}

function getMemberInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function GroupPage() {
  const params = useParams();
  const groupSlug = decodeURIComponent(String(params.slug));

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isEntriesLoading, setIsEntriesLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [pendingPinMember, setPendingPinMember] = useState<Member | null>(null);
  const [pinCode, setPinCode] = useState("");
  const [pinError, setPinError] = useState("");
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const [selectedWeekStartDate, setSelectedWeekStartDate] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedTab, setSelectedTab] = useState<Tab>("mark");

  const [entries, setEntries] = useState<Entries>({});
  const [formValues, setFormValues] = useState<EntryValues>({});

  const selectedMemberStorageKey = `selected-member-${groupSlug}`;
  const verifiedMemberStorageKey = `verified-member-${groupSlug}`;

  const todayKey = getTodayKey();

  const weekOptions = useMemo(() => {
    return getWeekOptions(
      group?.week_start_day ?? 6,
      group?.created_at ?? null,
      100,
    );
  }, [group?.week_start_day, group?.created_at]);

  const days = useMemo(() => {
    if (selectedWeekStartDate) {
      return getWeekDaysFromStart(selectedWeekStartDate);
    }

    if (group) {
      const currentWeekStart = getCurrentWeekStartDate(group.week_start_day);
      return getWeekDaysFromStart(toDateKey(currentWeekStart));
    }

    return [];
  }, [group, selectedWeekStartDate]);

  const entryKey =
    selectedMember && selectedDay ? `${selectedMember.id}_${selectedDay}` : "";

  const weekTitle =
    days.length > 0 ? `${days[0].displayDate}–${days[6].displayDate}` : "";

  const selectedDayInfo = days.find((day) => day.date === selectedDay);

  const hasUnsavedChanges = useMemo(() => {
    if (!entryKey || tasks.length === 0) {
      return false;
    }

    const savedValues = entries[entryKey] || {};

    return tasks.some((task) => {
      const currentValue = Number(formValues[task.id] || 0);
      const savedValue = Number(savedValues[task.id] || 0);

      return currentValue !== savedValue;
    });
  }, [entryKey, entries, formValues, tasks]);

  function getMemberVerificationToken(member: Member) {
    return `${member.id}_${member.pin_updated_at || "no-pin-date"}`;
  }

  function isMemberVerifiedOnThisDevice(member: Member) {
    if (!member.has_pin) {
      return true;
    }

    const savedToken = localStorage.getItem(verifiedMemberStorageKey);
    return savedToken === getMemberVerificationToken(member);
  }

  function rememberMemberVerification(member: Member) {
    localStorage.setItem(
      verifiedMemberStorageKey,
      getMemberVerificationToken(member),
    );
  }

  function forgetMemberVerification() {
    localStorage.removeItem(verifiedMemberStorageKey);
  }

  useEffect(() => {
    async function loadBaseDataFromSupabase() {
      setIsLoading(true);
      setErrorMessage("");

      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("id, name, slug, week_start_day, created_at, is_archived")
        .eq("slug", groupSlug)
        .single();

      if (groupError || !groupData) {
        setErrorMessage("Не удалось загрузить группу из Supabase.");
        setIsLoading(false);
        return;
      }

      setGroup(groupData);

      if (groupData.is_archived) {
        setIsLoading(false);
        return;
      }

      localStorage.setItem(
        "last-opened-group",
        JSON.stringify({
          name: groupData.name,
          slug: groupData.slug,
          savedAt: new Date().toISOString(),
        }),
      );

      const currentWeekStart = getCurrentWeekStartDate(
        groupData.week_start_day,
      );
      const currentWeekStartKey = toDateKey(currentWeekStart);
      const defaultDay = getDefaultSelectedDayForWeek(currentWeekStartKey);

      setSelectedWeekStartDate(currentWeekStartKey);
      setSelectedDay(defaultDay);

      const { data: membersData, error: membersError } = await supabase
        .from("group_members_public")
        .select("id, name, display_order, has_pin, pin_updated_at")
        .eq("group_id", groupData.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (membersError || !membersData) {
        setErrorMessage("Не удалось загрузить участников из Supabase.");
        setIsLoading(false);
        return;
      }

      setMembers(membersData);

      const savedMemberId = localStorage.getItem(selectedMemberStorageKey);

      if (savedMemberId) {
        const savedMember = membersData.find(
          (member) => member.id === savedMemberId,
        );

        if (savedMember && isMemberVerifiedOnThisDevice(savedMember)) {
          setSelectedMember(savedMember);
          setSelectedTab("mark");
        }

        if (savedMember && !isMemberVerifiedOnThisDevice(savedMember)) {
          localStorage.removeItem(selectedMemberStorageKey);
        }
      }

      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("id, name, unit, weekly_goal, display_order")
        .eq("group_id", groupData.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (tasksError || !tasksData) {
        setErrorMessage("Не удалось загрузить задачи из Supabase.");
        setIsLoading(false);
        return;
      }

      setTasks(tasksData);

      setIsLoading(false);
    }

    loadBaseDataFromSupabase();
  }, [groupSlug, selectedMemberStorageKey, verifiedMemberStorageKey]);

  useEffect(() => {
    async function loadEntriesForSelectedWeek() {
      if (!group || !selectedWeekStartDate || group.is_archived) return;

      const weekDays = getWeekDaysFromStart(selectedWeekStartDate);
      const weekStartDate = weekDays[0].date;
      const weekEndDate = weekDays[6].date;

      setIsEntriesLoading(true);
      setErrorMessage("");

      const { data: entriesData, error: entriesError } = await supabase
        .from("entries")
        .select("member_id, task_id, entry_date, value")
        .eq("group_id", group.id)
        .gte("entry_date", weekStartDate)
        .lte("entry_date", weekEndDate);

      if (entriesError) {
        setErrorMessage("Не удалось загрузить отметки из Supabase.");
        setIsEntriesLoading(false);
        return;
      }

      setEntries(convertEntriesRowsToState(entriesData || []));
      setIsEntriesLoading(false);
    }

    loadEntriesForSelectedWeek();
  }, [group, selectedWeekStartDate]);

  useEffect(() => {
    if (!entryKey) return;

    const savedValuesForCurrentDay = entries[entryKey] || {};
    setFormValues(savedValuesForCurrentDay);
    setSaveMessage("");
  }, [entryKey, entries]);

  function handleSelectMember(member: Member) {
    setSaveMessage("");
    setPinError("");

    if (member.has_pin && !isMemberVerifiedOnThisDevice(member)) {
      setPendingPinMember(member);
      setPinCode("");
      setSelectedMember(null);
      localStorage.removeItem(selectedMemberStorageKey);
      return;
    }

    setSelectedMember(member);
    setPendingPinMember(null);
    setSelectedTab("mark");
    localStorage.setItem(selectedMemberStorageKey, member.id);
  }

  async function handleVerifyPin() {
    if (!pendingPinMember) return;

    const cleanPin = pinCode.trim();

    if (!/^[0-9]{4,8}$/.test(cleanPin)) {
      setPinError("Введите PIN-код из 4–8 цифр.");
      return;
    }

    setIsVerifyingPin(true);
    setPinError("");

    const { data, error } = await supabase.rpc("verify_member_pin", {
      p_member_id: pendingPinMember.id,
      p_pin_code: cleanPin,
    });

    setIsVerifyingPin(false);

    if (error) {
      setPinError(error.message);
      return;
    }

    if (!data) {
      setPinError("Неверный PIN-код.");
      return;
    }

    rememberMemberVerification(pendingPinMember);
    localStorage.setItem(selectedMemberStorageKey, pendingPinMember.id);

    setSelectedMember(pendingPinMember);
    setPendingPinMember(null);
    setPinCode("");
    setSelectedTab("mark");
  }

  function handleCancelPin() {
    setPendingPinMember(null);
    setPinCode("");
    setPinError("");
  }

  function handleBackToMembers() {
    setSelectedMember(null);
    setPendingPinMember(null);
    setPinCode("");
    setPinError("");
    setSelectedTab("mark");
    setFormValues({});
    setSaveMessage("");
    localStorage.removeItem(selectedMemberStorageKey);
  }

  function handleForgetThisDevice() {
    forgetMemberVerification();
    handleBackToMembers();
  }

  function handleWeekChange(newWeekStartDate: string) {
    const defaultDay = getDefaultSelectedDayForWeek(newWeekStartDate);

    setSelectedWeekStartDate(newWeekStartDate);
    setSelectedDay(defaultDay);
    setEntries({});
    setFormValues({});
    setSaveMessage("");
  }

  function handleValueChange(taskId: string, value: string) {
    setFormValues((prev) => ({
      ...prev,
      [taskId]: value,
    }));

    setSaveMessage("");
  }

  async function handleSave() {
    if (!group || !selectedMember || !entryKey || days.length === 0) return;

    setIsSaving(true);
    setSaveMessage("");

    const weekStartDate = days[0].date;
    const weekEndDate = days[6].date;

    const rowsToSave = tasks.map((task) => ({
      group_id: group.id,
      member_id: selectedMember.id,
      task_id: task.id,
      entry_date: selectedDay,
      week_start_date: weekStartDate,
      week_end_date: weekEndDate,
      value: Number(formValues[task.id] || 0),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("entries").upsert(rowsToSave, {
      onConflict: "member_id,task_id,entry_date",
    });

    if (error) {
      setIsSaving(false);
      setSaveMessage("Ошибка сохранения. Проверь RLS policies для entries.");
      console.error(error);
      return;
    }

    const updatedEntries = {
      ...entries,
      [entryKey]: formValues,
    };

    setEntries(updatedEntries);
    setIsSaving(false);
    setSaveMessage("Данные сохранены.");
  }

  function getTaskTotal(memberId: string, taskId: string) {
    return days.reduce((sum, day) => {
      const key = `${memberId}_${day.date}`;
      const value = Number(entries[key]?.[taskId] || 0);

      return sum + value;
    }, 0);
  }

  function getTaskPercent(total: number, weeklyGoal: number) {
    if (weeklyGoal <= 0) return 0;

    return Math.round((total / weeklyGoal) * 100);
  }

  function getMemberOverallPercent(memberId: string) {
    if (tasks.length === 0) return 0;

    const percents = tasks.map((task) => {
      const total = getTaskTotal(memberId, task.id);
      const percent = getTaskPercent(total, Number(task.weekly_goal));

      return Math.min(percent, 100);
    });

    const sum = percents.reduce((acc, percent) => acc + percent, 0);

    return Math.round(sum / tasks.length);
  }

  function getGroupOverallPercent() {
    if (members.length === 0) return 0;

    const memberPercents = members.map((member) =>
      getMemberOverallPercent(member.id),
    );

    const sum = memberPercents.reduce((acc, percent) => acc + percent, 0);

    return Math.round(sum / members.length);
  }

  function getStatus(percent: number) {
    if (percent >= 100) return "Выполнено";
    if (percent >= 90) return "Почти выполнено";
    if (percent >= 70) return "Хорошо";
    if (percent >= 50) return "Средне";
    if (percent >= 30) return "Ниже нормы";
    if (percent >= 1) return "Отстаёт";
    return "Нет данных";
  }

  function getPercentCardClass(percent: number) {
    if (percent >= 90)
      return "border-emerald-200 bg-emerald-50 text-emerald-950";
    if (percent >= 70) return "border-lime-200 bg-lime-50 text-lime-950";
    if (percent >= 50) return "border-amber-200 bg-amber-50 text-amber-950";
    if (percent >= 30) return "border-orange-200 bg-orange-50 text-orange-950";
    if (percent >= 1) return "border-rose-200 bg-rose-50 text-rose-950";
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  function getProgressBarClass(percent: number) {
    if (percent >= 90) return "bg-emerald-500";
    if (percent >= 70) return "bg-lime-500";
    if (percent >= 50) return "bg-amber-500";
    if (percent >= 30) return "bg-orange-500";
    if (percent >= 1) return "bg-rose-500";
    return "bg-slate-300";
  }

  function hasEntriesForDay(memberId: string, dayDate: string) {
    const key = `${memberId}_${dayDate}`;

    return tasks.some((task) => Number(entries[key]?.[task.id] || 0) > 0);
  }

  function getRankBadge(index: number) {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return String(index + 1);
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-sky-50 px-4 py-8">
        <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-200/60">
          <div className="bg-slate-950 p-6">
            <BrandMark inverse />
          </div>

          <div className="space-y-4 p-6">
            <div className="h-7 w-44 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />

            <div className="space-y-3 pt-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-rose-50 via-slate-50 to-orange-50 px-4 py-8">
        <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-200/60">
          <div className="bg-slate-950 p-6">
            <BrandMark inverse />
          </div>

          <div className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-xl">
              !
            </div>

            <h1 className="mt-4 text-2xl font-bold text-slate-950">Ошибка</h1>

            <p className="mt-2 text-slate-700">{errorMessage}</p>

            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              Проверь .env.local, RLS policies и данные группы {groupSlug} в
              Supabase.
            </p>

            <Link
              href="/"
              className="mt-6 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
            >
              ← На главную
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (group?.is_archived) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50 px-4 py-8">
        <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-200/60">
          <div className="bg-slate-950 p-6">
            <BrandMark inverse />
          </div>

          <div className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
              📦
            </div>

            <h1 className="mt-4 text-2xl font-bold text-slate-950">
              Группа в архиве
            </h1>

            <p className="mt-2 text-slate-600">
              Эта группа временно закрыта администратором. Отметки недоступны.
            </p>

            <Link
              href="/"
              className="mt-6 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
            >
              ← На главную
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (pendingPinMember && !selectedMember) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-sky-50 px-4 py-8">
        <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-200/60">
          <div className="bg-slate-950 p-6">
            <BrandMark inverse />
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-bold text-emerald-800">
                {getMemberInitials(pendingPinMember.name)}
              </div>

              <div>
                <p className="text-sm font-medium text-emerald-700">
                  {group?.name || groupSlug}
                </p>
                <h1 className="text-2xl font-bold text-slate-950">
                  Введите PIN-код
                </h1>
              </div>
            </div>

            <p className="mt-5 text-slate-600">
              Для участника <strong>{pendingPinMember.name}</strong> установлен
              PIN-код.
            </p>

            <label className="mt-6 block text-sm font-semibold text-slate-700">
              PIN-код
            </label>

            <input
              type="password"
              inputMode="numeric"
              value={pinCode}
              onChange={(event) => {
                setPinCode(event.target.value);
                setPinError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleVerifyPin();
                }
              }}
              placeholder="4–8 цифр"
              autoFocus
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-bold tracking-[0.35em] text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />

            {pinError && (
              <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
                {pinError}
              </p>
            )}

            <button
              onClick={handleVerifyPin}
              disabled={isVerifyingPin}
              className="mt-5 w-full rounded-2xl bg-emerald-500 px-4 py-4 text-lg font-bold text-slate-950 shadow-lg shadow-emerald-200 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
            >
              {isVerifyingPin ? "Проверяем..." : "Войти"}
            </button>

            <button
              onClick={handleCancelPin}
              disabled={isVerifyingPin}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              Выбрать другого участника
            </button>

            <Link
              href="/"
              className="mt-3 block w-full px-4 py-3 text-center text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              ← На главную
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!selectedMember) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-sky-50 px-4 py-8">
        <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-200/60">
          <div className="relative overflow-hidden bg-slate-950 p-6 sm:p-8">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />

            <div className="relative">
              <BrandMark inverse />

              <div className="mt-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">
                  Группа
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {group?.name || groupSlug}
                </h1>

                <p className="mt-3 max-w-md text-sm leading-6 text-slate-300 sm:text-base">
                  Выберите своё имя, чтобы внести результаты и посмотреть
                  прогресс недели.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950">Участники</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                {members.length}
              </span>
            </div>

            <div className="space-y-3">
              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleSelectMember(member)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/70"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-700 transition group-hover:bg-emerald-100 group-hover:text-emerald-800">
                    {getMemberInitials(member.name)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold text-slate-900">
                      {member.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {member.has_pin ? "Защищено PIN-кодом" : "Быстрый вход"}
                    </span>
                  </span>

                  {member.has_pin && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                      PIN
                    </span>
                  )}

                  <span className="text-xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-500">
                    →
                  </span>
                </button>
              ))}
            </div>

            <Link
              href="/"
              className="mt-6 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              ← На главную
            </Link>

            <p className="mt-6 text-center text-xs text-slate-400">
              QadamTrack · двигайтесь к цели вместе
            </p>
          </div>
        </div>
      </main>
    );
  }

  const selectedMemberPercent = getMemberOverallPercent(selectedMember.id);
  const groupPercent = getGroupOverallPercent();

  const sortedMembers = [...members].sort(
    (a, b) => getMemberOverallPercent(b.id) - getMemberOverallPercent(a.id),
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-sky-50 px-3 py-4 sm:px-4 sm:py-8">
      <div className="mx-auto max-w-2xl pb-24">
        <div className="mb-4 flex items-center justify-between gap-3 px-1">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Главная
          </Link>

          <button
            onClick={handleBackToMembers}
            className="rounded-full border border-white/80 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur transition hover:bg-white hover:text-slate-950"
          >
            Сменить участника
          </button>
        </div>

        <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 shadow-xl shadow-slate-300/50 sm:p-7">
          <div className="absolute -right-14 -top-16 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -bottom-24 left-12 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />

          <div className="relative">
            <BrandMark inverse />

            <div className="mt-7 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                  {group?.name || groupSlug}
                </p>

                <h1 className="mt-2 truncate text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {selectedMember.name}
                </h1>

                <p className="mt-1 text-sm text-slate-300">
                  Неделя {weekTitle}
                </p>
              </div>

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg font-black text-white ring-1 ring-white/10">
                {getMemberInitials(selectedMember.name)}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-xs font-medium text-slate-300">
                  Мой прогресс
                </p>
                <p className="mt-1 text-2xl font-black text-white">
                  {selectedMemberPercent}%
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-xs font-medium text-slate-300">Группа</p>
                <p className="mt-1 text-2xl font-black text-white">
                  {groupPercent}%
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-white/80 bg-white/90 p-4 shadow-lg shadow-slate-200/50 backdrop-blur sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Период
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {weekTitle || "Выберите неделю"}
              </p>
            </div>

            {isEntriesLoading && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Загружаем…
              </span>
            )}
          </div>

          <select
            value={selectedWeekStartDate}
            onChange={(event) => handleWeekChange(event.target.value)}
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          >
            {weekOptions.map((week) => (
              <option key={week.value} value={week.value}>
                {week.label}
              </option>
            ))}
          </select>
        </section>

        <div className="sticky top-2 z-30 mt-4 rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-lg shadow-slate-200/50 backdrop-blur">
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setSelectedTab("mark")}
              className={`rounded-xl px-2 py-3 text-xs font-bold transition sm:text-sm ${
                selectedTab === "mark"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Отметка
            </button>

            <button
              onClick={() => setSelectedTab("my-progress")}
              className={`rounded-xl px-2 py-3 text-xs font-bold transition sm:text-sm ${
                selectedTab === "my-progress"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Мой прогресс
            </button>

            <button
              onClick={() => setSelectedTab("group-results")}
              className={`rounded-xl px-2 py-3 text-xs font-bold transition sm:text-sm ${
                selectedTab === "group-results"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Итоги
            </button>
          </div>
        </div>

        {selectedTab === "mark" && (
          <section className="mt-4 rounded-3xl border border-white/80 bg-white p-4 shadow-lg shadow-slate-200/50 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-600">
                  Ежедневная отметка
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  {selectedDayInfo
                    ? `${selectedDayInfo.label}, ${selectedDayInfo.displayDate}`
                    : "Выберите день"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Введите результат только за выбранный день.
                </p>
              </div>

              {selectedDay === todayKey && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  Сегодня
                </span>
              )}
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
              {days.map((day) => {
                const isSelected = selectedDay === day.date;
                const isToday = day.date === todayKey;
                const isCompleted = hasEntriesForDay(
                  selectedMember.id,
                  day.date,
                );

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDay(day.date)}
                    className={`relative min-h-16 rounded-2xl border px-2 py-2 text-center transition ${
                      isSelected
                        ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-300"
                        : isToday
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-xs font-bold">{day.label}</span>
                    <span
                      className={`mt-1 block text-sm font-black ${
                        isSelected ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {day.displayDate}
                    </span>

                    {isCompleted && (
                      <span
                        className={`absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black ${
                          isSelected
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-emerald-500 text-white"
                        }`}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition focus-within:border-emerald-400 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-emerald-100/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`task-${task.id}`}
                        className="block truncate text-base font-bold text-slate-950"
                      >
                        {task.name}
                      </label>

                      <p className="mt-1 text-xs text-slate-500">
                        Норма: {task.weekly_goal} {task.unit || ""} в неделю
                      </p>
                    </div>

                    <div className="w-28 shrink-0 sm:w-36">
                      <input
                        id={`task-${task.id}`}
                        type="number"
                        min="0"
                        value={formValues[task.id] || ""}
                        onChange={(event) =>
                          handleValueChange(task.id, event.target.value)
                        }
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xl font-black text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-3 z-20 mt-6 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl shadow-slate-300/60 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="hidden min-w-0 flex-1 sm:block">
                  <p className="text-sm font-bold text-slate-900">
                    {hasUnsavedChanges
                      ? "Есть несохранённые изменения"
                      : "Всё сохранено"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {selectedDayInfo
                      ? `${selectedDayInfo.label}, ${selectedDayInfo.displayDate}`
                      : "Выбранный день"}
                  </p>
                </div>

                <button
                  onClick={handleSave}
                  disabled={isSaving || isEntriesLoading}
                  className="w-full rounded-2xl bg-emerald-500 px-5 py-4 text-base font-black text-slate-950 shadow-lg shadow-emerald-200 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none sm:w-auto sm:min-w-48"
                >
                  {isSaving ? "Сохраняем..." : "Сохранить"}
                </button>
              </div>

              {saveMessage && (
                <p
                  className={`mt-2 text-center text-sm font-semibold ${
                    saveMessage.startsWith("Ошибка")
                      ? "text-rose-600"
                      : "text-emerald-700"
                  }`}
                >
                  {saveMessage}
                </p>
              )}
            </div>
          </section>
        )}

        {selectedTab === "my-progress" && (
          <section className="mt-4 rounded-3xl border border-white/80 bg-white p-4 shadow-lg shadow-slate-200/50 sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-600">
                  Личный результат
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  Мой прогресс
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Неделя {weekTitle}
                </p>
              </div>

              <div className="text-right">
                <p className="text-4xl font-black text-slate-950">
                  {selectedMemberPercent}%
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  {getStatus(selectedMemberPercent)}
                </p>
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarClass(
                  selectedMemberPercent,
                )}`}
                style={{ width: `${Math.min(selectedMemberPercent, 100)}%` }}
              />
            </div>

            <div className="mt-6 space-y-3">
              {tasks.map((task) => {
                const total = getTaskTotal(selectedMember.id, task.id);
                const percent = getTaskPercent(total, Number(task.weekly_goal));

                return (
                  <div
                    key={task.id}
                    className={`rounded-2xl border p-4 ${getPercentCardClass(
                      percent,
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{task.name}</p>
                        <p className="mt-1 text-sm opacity-80">
                          {total} из {task.weekly_goal} {task.unit || ""}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-black">{percent}%</p>
                        <p className="text-xs font-semibold opacity-70">
                          {getStatus(percent)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
                      <div
                        className={`h-full rounded-full ${getProgressBarClass(
                          percent,
                        )}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {selectedTab === "group-results" && (
          <section className="mt-4 rounded-3xl border border-white/80 bg-white p-4 shadow-lg shadow-slate-200/50 sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
                  Общий результат
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  Итоги группы
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Неделя {weekTitle}
                </p>
              </div>

              <div className="text-right">
                <p className="text-4xl font-black text-slate-950">
                  {groupPercent}%
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  {getStatus(groupPercent)}
                </p>
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarClass(
                  groupPercent,
                )}`}
                style={{ width: `${Math.min(groupPercent, 100)}%` }}
              />
            </div>

            <div className="mt-6 space-y-3">
              {sortedMembers.map((member, index) => {
                const percent = getMemberOverallPercent(member.id);
                const isCurrentMember = member.id === selectedMember.id;

                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                      isCurrentMember
                        ? "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-base font-black text-slate-700 shadow-sm">
                      {getRankBadge(index)}
                    </div>

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-xs font-black text-slate-700">
                      {getMemberInitials(member.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-bold text-slate-950">
                          {member.name}
                        </p>

                        {isCurrentMember && (
                          <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                            Вы
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        {getStatus(percent)}
                      </p>
                    </div>

                    <p className="text-2xl font-black text-slate-950">
                      {percent}%
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {selectedMember.has_pin && (
          <button
            onClick={handleForgetThisDevice}
            className="mx-auto mt-5 block rounded-full px-4 py-2 text-sm font-semibold text-orange-600 transition hover:bg-orange-50 hover:text-orange-800"
          >
            Забыть PIN на этом устройстве
          </button>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          QadamTrack · двигайтесь к цели вместе
        </p>
      </div>
    </main>
  );
}

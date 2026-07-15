"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
  weekStartDay: number
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
  maxWeeks = 100
) {
  const currentWeekStart = getCurrentWeekStartDate(weekStartDay);
  const createdWeekStartKey = getCreatedWeekStartDateKey(
    groupCreatedAt,
    weekStartDay
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
      endDate
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
      100
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
    days.length > 0
      ? `Неделя: ${days[0].displayDate}–${days[6].displayDate}`
      : "";

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
      getMemberVerificationToken(member)
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
        })
      );

      const currentWeekStart = getCurrentWeekStartDate(groupData.week_start_day);
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
          (member) => member.id === savedMemberId
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
      getMemberOverallPercent(member.id)
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
    if (percent >= 90) return "border-green-200 bg-green-50 text-green-900";
    if (percent >= 70) return "border-lime-200 bg-lime-50 text-lime-900";
    if (percent >= 50) return "border-yellow-200 bg-yellow-50 text-yellow-900";
    if (percent >= 30) return "border-orange-200 bg-orange-50 text-orange-900";
    if (percent >= 1) return "border-red-200 bg-red-50 text-red-900";
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  function getDayDotClass(dayDate: string) {
    if (dayDate === todayKey) {
      return "bg-green-500";
    }

    if (dayDate < todayKey) {
      return "bg-red-500";
    }

    return "";
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold tracking-wide text-slate-500">
            QADAMTRACK
          </p>

          <p className="mt-4 text-slate-600">Загружаем группу...</p>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-xl font-bold text-red-700">Ошибка</h1>

          <p className="text-slate-700">{errorMessage}</p>

          <p className="mt-4 text-sm text-slate-500">
            Проверь .env.local, RLS policies и данные группы {groupSlug} в
            Supabase.
          </p>

          <Link
            href="/"
            className="mt-6 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            ← На главную
          </Link>
        </div>
      </main>
    );
  }

  if (group?.is_archived) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-slate-900">
            Группа в архиве
          </h1>

          <p className="text-slate-600">
            Эта группа временно закрыта администратором. Отметки недоступны.
          </p>

          <Link
            href="/"
            className="mt-6 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            ← На главную
          </Link>
        </div>
      </main>
    );
  }

  if (pendingPinMember && !selectedMember) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-semibold tracking-wide text-slate-500">
            QADAMTRACK / {group?.name || groupSlug}
          </p>

          <h1 className="mb-2 text-2xl font-bold text-slate-900">
            Введите PIN-код
          </h1>

          <p className="mb-5 text-slate-600">
            Для участника {pendingPinMember.name} установлен PIN-код.
          </p>

          <input
            type="password"
            inputMode="numeric"
            value={pinCode}
            onChange={(event) => {
              setPinCode(event.target.value);
              setPinError("");
            }}
            placeholder="PIN-код"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg outline-none focus:border-slate-900"
          />

          {pinError && (
            <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
              {pinError}
            </p>
          )}

          <button
            onClick={handleVerifyPin}
            disabled={isVerifyingPin}
            className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isVerifyingPin ? "Проверяем..." : "Войти"}
          </button>

          <button
            onClick={handleCancelPin}
            disabled={isVerifyingPin}
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            ← Выбрать другого участника
          </button>

          <Link
            href="/"
            className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            ← На главную
          </Link>

          <p className="mt-6 text-center text-xs text-slate-400">
            QadamTrack — двигайтесь к цели вместе
          </p>
        </div>
      </main>
    );
  }

  if (!selectedMember) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-semibold tracking-wide text-slate-500">
            QADAMTRACK / ГРУППА
          </p>

          <h1 className="mb-2 text-2xl font-bold text-slate-900">
            {group?.name || groupSlug}
          </h1>

          <p className="mb-6 text-slate-600">
            Выберите участника, чтобы перейти к отметке.
          </p>

          <div className="space-y-3">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => handleSelectMember(member)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-lg font-medium text-slate-800 transition hover:bg-slate-50"
              >
                <span>{member.name}</span>

                {member.has_pin && (
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                    PIN
                  </span>
                )}
              </button>
            ))}
          </div>

          <Link
            href="/"
            className="mt-6 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            ← На главную
          </Link>

          <p className="mt-6 text-center text-xs text-slate-400">
            QadamTrack — двигайтесь к цели вместе
          </p>
        </div>
      </main>
    );
  }

  const selectedMemberPercent = getMemberOverallPercent(selectedMember.id);
  const groupPercent = getGroupOverallPercent();

  const sortedMembers = [...members].sort(
    (a, b) => getMemberOverallPercent(b.id) - getMemberOverallPercent(a.id)
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <Link
          href="/"
          className="mb-3 block text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← На главную
        </Link>

        <button
          onClick={handleBackToMembers}
          className="mb-2 block text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Назад к выбору участника
        </button>

        {selectedMember.has_pin && (
          <button
            onClick={handleForgetThisDevice}
            className="mb-4 block text-sm font-medium text-orange-600 hover:text-orange-800"
          >
            Забыть PIN на этом устройстве
          </button>
        )}

        {!selectedMember.has_pin && <div className="mb-4" />}

        <p className="mb-2 text-sm font-medium text-slate-500">
          Участник: {selectedMember.name}
        </p>

        <p className="mb-2 text-sm font-semibold tracking-wide text-slate-500">
          QADAMTRACK / ГРУППА
        </p>

        <h1 className="mb-1 text-2xl font-bold text-slate-900">
          {group?.name || groupSlug}
        </h1>

        <p className="mb-4 text-sm font-medium text-slate-500">{weekTitle}</p>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Выберите неделю
          </label>

          <select
            value={selectedWeekStartDate}
            onChange={(event) => handleWeekChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none focus:border-slate-900"
          >
            {weekOptions.map((week) => (
              <option key={week.value} value={week.value}>
                {week.label}
              </option>
            ))}
          </select>

          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span>Прошедший день</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span>Сегодня</span>
            </div>
          </div>

          {isEntriesLoading && (
            <p className="mt-2 text-sm text-slate-500">
              Загружаем отметки за выбранную неделю...
            </p>
          )}
        </div>

        <div className="mb-6 grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setSelectedTab("mark")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              selectedTab === "mark"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            Отметка
          </button>

          <button
            onClick={() => setSelectedTab("my-progress")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              selectedTab === "my-progress"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            Мой прогресс
          </button>

          <button
            onClick={() => setSelectedTab("group-results")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              selectedTab === "group-results"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            Итоги
          </button>
        </div>

        {selectedTab === "mark" && (
          <>
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Отметка за день
            </h2>

            <div className="mb-6">
              <p className="mb-2 text-sm font-medium text-slate-700">
                Выберите день:
              </p>

              <div className="grid grid-cols-4 gap-2">
                {days.map((day) => {
                  const dotClass = getDayDotClass(day.date);

                  return (
                    <button
                      key={day.date}
                      onClick={() => setSelectedDay(day.date)}
                      className={`relative rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        selectedDay === day.date
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {dotClass && (
                        <span
                          className={`absolute right-2 top-2 h-2 w-2 rounded-full ${dotClass}`}
                        />
                      )}

                      <div>{day.label}</div>
                      <div>{day.displayDate}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id}>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {task.name}
                    <span className="ml-1 text-slate-400">
                      / норма {task.weekly_goal} {task.unit}
                    </span>
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={formValues[task.id] || ""}
                    onChange={(event) =>
                      handleValueChange(task.id, event.target.value)
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg outline-none focus:border-slate-900"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving || isEntriesLoading}
              className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-lg font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSaving ? "Сохраняем..." : "Сохранить"}
            </button>

            {saveMessage && (
              <p className="mt-3 text-center text-sm font-medium text-slate-600">
                {saveMessage}
              </p>
            )}
          </>
        )}

        {selectedTab === "my-progress" && (
          <>
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Мой прогресс
            </h2>

            <div
              className={`mb-4 rounded-2xl border p-4 ${getPercentCardClass(
                selectedMemberPercent
              )}`}
            >
              <p className="text-sm font-medium">Общий прогресс недели</p>
              <p className="mt-1 text-3xl font-bold">
                {selectedMemberPercent}%
              </p>
              <p className="mt-1 text-sm">{getStatus(selectedMemberPercent)}</p>
            </div>

            <div className="space-y-3">
              {tasks.map((task) => {
                const total = getTaskTotal(selectedMember.id, task.id);
                const percent = getTaskPercent(total, Number(task.weekly_goal));

                return (
                  <div
                    key={task.id}
                    className={`rounded-2xl border p-4 ${getPercentCardClass(
                      percent
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{task.name}</p>
                        <p className="mt-1 text-sm">
                          {total} / {task.weekly_goal} {task.unit}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-bold">{percent}%</p>
                        <p className="text-xs">{getStatus(percent)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {selectedTab === "group-results" && (
          <>
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Итоги группы
            </h2>

            <div
              className={`mb-4 rounded-2xl border p-4 ${getPercentCardClass(
                groupPercent
              )}`}
            >
              <p className="text-sm font-medium">Общий прогресс группы</p>
              <p className="mt-1 text-3xl font-bold">{groupPercent}%</p>
              <p className="mt-1 text-sm">{getStatus(groupPercent)}</p>
            </div>

            <div className="space-y-3">
              {sortedMembers.map((member, index) => {
                const percent = getMemberOverallPercent(member.id);

                return (
                  <div
                    key={member.id}
                    className={`rounded-2xl border p-4 ${getPercentCardClass(
                      percent
                    )}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {index + 1}. {member.name}
                        </p>
                        <p className="mt-1 text-sm">{getStatus(percent)}</p>
                      </div>

                      <p className="text-2xl font-bold">{percent}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
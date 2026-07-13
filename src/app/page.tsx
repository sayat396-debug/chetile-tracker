"use client";

import { useEffect, useState } from "react";

const members = ["Ayan", "Alisher", "Arman", "Ernur", "Israfil", "Sayat"];

const WEEK_START_DAY = 6; // 6 = суббота

const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

const tasks = [
  { name: "Салават", unit: "раз", weeklyGoal: 700 },
  { name: "КК, стр.", unit: "стр.", weeklyGoal: 10 },
  { name: "Книга, стр.", unit: "стр.", weeklyGoal: 20 },
  { name: "Таха", unit: "раз", weeklyGoal: 1 },
  { name: "Ораза", unit: "день", weeklyGoal: 1 },
  { name: "Джевшен", unit: "раз", weeklyGoal: 100 },
  { name: "Духа/Аууабин", unit: "раз", weeklyGoal: 2 },
];

const STORAGE_KEY = "chetile-tracker-v2-demo";

type EntryValues = Record<string, string>;
type Entries = Record<string, EntryValues>;
type Tab = "mark" | "my-progress" | "group-results";

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${day}.${month}`;
}

function getCurrentWeekDays() {
  const today = new Date();
  const currentDay = today.getDay();

  const diff = (currentDay - WEEK_START_DAY + 7) % 7;

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - diff);

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

export default function HomePage() {
  const days = getCurrentWeekDays();

  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(days[0].date);
  const [selectedTab, setSelectedTab] = useState<Tab>("mark");

  // entries — это уже сохранённые данные
  const [entries, setEntries] = useState<Entries>({});

  // formValues — это временные данные, которые сейчас введены в форму
  const [formValues, setFormValues] = useState<EntryValues>({});

  const entryKey = selectedMember ? `${selectedMember}_${selectedDay}` : "";
  const weekTitle = `Неделя: ${days[0].displayDate}–${days[6].displayDate}`;

  useEffect(() => {
    const savedEntries = localStorage.getItem(STORAGE_KEY);

    if (savedEntries) {
      try {
        setEntries(JSON.parse(savedEntries));
      } catch {
        setEntries({});
      }
    }
  }, []);

  useEffect(() => {
    if (!entryKey) return;

    const savedValuesForCurrentDay = entries[entryKey] || {};
    setFormValues(savedValuesForCurrentDay);
  }, [entryKey, entries]);

  function handleSelectMember(member: string) {
    setSelectedMember(member);
    setSelectedTab("mark");
  }

  function handleBackToMembers() {
    setSelectedMember(null);
    setSelectedTab("mark");
    setFormValues({});
  }

  function handleValueChange(taskName: string, value: string) {
    setFormValues((prev) => ({
      ...prev,
      [taskName]: value,
    }));
  }

  function handleSave() {
    if (!selectedMember || !entryKey) return;

    const updatedEntries = {
      ...entries,
      [entryKey]: formValues,
    };

    setEntries(updatedEntries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));

    alert("Данные сохранены в браузере.");
  }

  function getTaskTotal(member: string, taskName: string) {
    return days.reduce((sum, day) => {
      const key = `${member}_${day.date}`;
      const value = Number(entries[key]?.[taskName] || 0);

      return sum + value;
    }, 0);
  }

  function getTaskPercent(total: number, weeklyGoal: number) {
    if (weeklyGoal <= 0) return 0;

    return Math.round((total / weeklyGoal) * 100);
  }

  function getMemberOverallPercent(member: string) {
    const percents = tasks.map((task) => {
      const total = getTaskTotal(member, task.name);
      const percent = getTaskPercent(total, task.weeklyGoal);

      return Math.min(percent, 100);
    });

    const sum = percents.reduce((acc, percent) => acc + percent, 0);

    return Math.round(sum / tasks.length);
  }

  function getGroupOverallPercent() {
    const memberPercents = members.map((member) =>
      getMemberOverallPercent(member)
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

  if (!selectedMember) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-medium text-slate-500">
            Версия 2.0
          </p>

          <h1 className="mb-2 text-2xl font-bold text-slate-900">
            Недельный трекер Четиле
          </h1>

          <p className="mb-6 text-slate-600">
            Выберите участника, чтобы перейти к отметке.
          </p>

          <div className="space-y-3">
            {members.map((member) => (
              <button
                key={member}
                onClick={() => handleSelectMember(member)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-lg font-medium text-slate-800 transition hover:bg-slate-50"
              >
                {member}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const selectedMemberPercent = getMemberOverallPercent(selectedMember);
  const groupPercent = getGroupOverallPercent();

  const sortedMembers = [...members].sort(
    (a, b) => getMemberOverallPercent(b) - getMemberOverallPercent(a)
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <button
          onClick={handleBackToMembers}
          className="mb-4 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Назад к выбору участника
        </button>

        <p className="mb-2 text-sm font-medium text-slate-500">
          Участник: {selectedMember}
        </p>

        <h1 className="mb-1 text-2xl font-bold text-slate-900">
          Недельный трекер Четиле
        </h1>

        <p className="mb-4 text-sm font-medium text-slate-500">{weekTitle}</p>

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
                {days.map((day) => (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDay(day.date)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      selectedDay === day.date
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div>{day.label}</div>
                    <div>{day.displayDate}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.name}>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {task.name}
                    <span className="ml-1 text-slate-400">
                      / норма {task.weeklyGoal} {task.unit}
                    </span>
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={formValues[task.name] || ""}
                    onChange={(event) =>
                      handleValueChange(task.name, event.target.value)
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg outline-none focus:border-slate-900"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-lg font-semibold text-white transition hover:bg-slate-700"
            >
              Сохранить
            </button>
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
                const total = getTaskTotal(selectedMember, task.name);
                const percent = getTaskPercent(total, task.weeklyGoal);

                return (
                  <div
                    key={task.name}
                    className={`rounded-2xl border p-4 ${getPercentCardClass(
                      percent
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{task.name}</p>
                        <p className="mt-1 text-sm">
                          {total} / {task.weeklyGoal} {task.unit}
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
                const percent = getMemberOverallPercent(member);

                return (
                  <div
                    key={member}
                    className={`rounded-2xl border p-4 ${getPercentCardClass(
                      percent
                    )}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {index + 1}. {member}
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
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <p className="mb-2 text-sm font-medium text-slate-500">
          Версия 2.0
        </p>

        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Недельный трекер
        </h1>

        <p className="mb-6 text-slate-600">
          Это главная страница приложения. Пока доступна тестовая группа
          «Четиле».
        </p>

        <div className="space-y-3">
          <Link
            href="/g/chetile"
            className="block w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-lg font-semibold text-white transition hover:bg-slate-700"
          >
            Открыть группу Четиле
          </Link>

          <Link
            href="/admin"
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Открыть админ-панель
          </Link>
        </div>
      </div>
    </main>
  );
}
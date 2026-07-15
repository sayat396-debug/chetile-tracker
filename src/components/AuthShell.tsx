import type { ReactNode } from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
};

const benefits = [
  "Создавайте отдельные группы и недельные нормы",
  "Отмечайте прогресс с телефона без сложных таблиц",
  "Смотрите личные результаты и общий рейтинг",
];

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  backHref = "/",
  backLabel = "На главную",
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-sky-50 px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl shadow-slate-300/40">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          <section className="relative overflow-hidden bg-slate-950 p-6 sm:p-9 lg:min-h-[650px] lg:p-12">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />

            <div className="relative flex h-full flex-col">
              <BrandMark inverse />

              <div className="mt-12 max-w-md lg:mt-auto lg:mb-auto">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
                  QadamTrack
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Двигайтесь к цели вместе
                </h2>
                <p className="mt-4 leading-7 text-slate-300">
                  Один понятный трекер для ежедневных отметок, недельных норм и
                  командного прогресса.
                </p>

                <div className="mt-8 space-y-3">
                  {benefits.map((benefit) => (
                    <div
                      key={benefit}
                      className="flex items-start gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-slate-950">
                        ✓
                      </span>
                      <p className="text-sm leading-6 text-slate-200">
                        {benefit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="relative mt-10 text-xs text-slate-500">
                QadamTrack · двигайтесь к цели вместе
              </p>
            </div>
          </section>

          <section className="p-5 sm:p-9 lg:p-12">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
            >
              <span>←</span>
              <span>{backLabel}</span>
            </Link>

            <div className="mt-9 max-w-lg">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 leading-7 text-slate-600">{description}</p>

              <div className="mt-8">{children}</div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

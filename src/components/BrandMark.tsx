type BrandMarkProps = {
  inverse?: boolean;
  compact?: boolean;
};

export default function BrandMark({
  inverse = false,
  compact = false,
}: BrandMarkProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <svg
        viewBox="0 0 128 128"
        role="img"
        aria-label="QadamTrack"
        className={`shrink-0 ${
          compact ? "h-10 w-10" : "h-12 w-12"
        } ${inverse ? "text-white" : "text-slate-950"}`}
      >
        {/* Основная форма буквы Q */}
        <path
          d="M97 91A47 47 0 1 0 31 103"
          fill="none"
          stroke="currentColor"
          strokeWidth="15"
          strokeLinecap="butt"
        />

        {/* Нижние ступени */}
        <path
          d="M24 105V90H39V75H54V63H66V78H54V93H39V108H31V114H24Z"
          fill="currentColor"
        />

        {/* Верхняя ступень и стрелка вверх */}
        <path
          d="M53 75V61H67V50H62L72 40H93V61L83 51V57L68 72V75Z"
          fill="#00C878"
        />

        {/* Хвост буквы Q */}
        <path
          d="M67 79L78 68L111 101H92Z"
          fill="#00C878"
        />
      </svg>

      <div className="min-w-0">
        <p
          className={`truncate font-black tracking-tight ${
            compact ? "text-base" : "text-lg"
          }`}
        >
          <span className={inverse ? "text-white" : "text-slate-950"}>
            Qadam
          </span>
          <span className="text-emerald-500">Track</span>
        </p>

        <p
          className={`truncate text-xs font-medium ${
            inverse ? "text-slate-400" : "text-slate-500"
          }`}
        >
          Шаг за шагом к общей цели
        </p>
      </div>
    </div>
  );
}
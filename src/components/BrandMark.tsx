type BrandMarkProps = {
  inverse?: boolean;
  compact?: boolean;
};

export default function BrandMark({
  inverse = false,
  compact = false,
}: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center rounded-2xl bg-emerald-400 font-black text-slate-950 shadow-sm ${
          compact ? "h-9 w-9 text-base" : "h-11 w-11 text-lg"
        }`}
      >
        Q
      </div>

      <div className="min-w-0">
        <p
          className={`font-black tracking-tight ${
            compact ? "text-base" : "text-lg"
          } ${inverse ? "text-white" : "text-slate-950"}`}
        >
          QadamTrack
        </p>
        <p
          className={`text-xs font-medium ${
            inverse ? "text-slate-400" : "text-slate-500"
          }`}
        >
          Шаг за шагом к общей цели
        </p>
      </div>
    </div>
  );
}

interface Props {
  label: string;
  value: string;
  hint?: string;
}

export function StatTile({ label, value, hint }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-black text-white mt-1">{value}</p>
      {hint && <p className="text-[11px] text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

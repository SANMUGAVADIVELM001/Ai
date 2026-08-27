interface Props {
  value: number; // 0-100
  colorClass?: string;
}

export default function ProgressBar({ value, colorClass = 'bg-brand-500' }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-2.5 rounded-full bg-line overflow-hidden">
      <div className={`h-full rounded-full ${colorClass} transition-all duration-500`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

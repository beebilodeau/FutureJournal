export function StreakPill({ count }: { count: number }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-full bg-dawn-soft px-3 py-1.5 text-sm font-semibold text-ink"
      title={`${count} day streak`}
    >
      <span aria-hidden className="text-dawn">☀</span>
      {count}
      <span className="sr-only">day streak</span>
    </div>
  );
}

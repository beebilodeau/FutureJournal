"use client";

import { useMemo, useState } from "react";
import { useEntries, useNow } from "@/lib/useJournal";
import { formatLong, formatShort, fromKey, todayKey } from "@/lib/dates";
import { outcomeCounts, streak } from "@/lib/stats";
import { store } from "@/lib/store";
import type { Entry } from "@/lib/types";
import { EntryEditor } from "@/components/EntryEditor";
import { ReflectCard, outcomeLabel } from "@/components/ReflectCard";

export default function JournalPage() {
  const now = useNow();
  const { entries, ready } = useEntries();
  const today = todayKey(now);
  const [open, setOpen] = useState<string | null>(null);

  const counts = outcomeCounts(entries);
  const groups = useMemo(() => groupByMonth(entries), [entries]);

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <p className="text-sm font-medium text-dawn">FutureJournal</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">Your journal</h1>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Day streak" value={streak(entries, today)} />
        <Stat label="Days written" value={entries.filter((e) => e.text.trim()).length} />
        <Stat label="Came true" value={counts.happened} sub={counts.partly ? `+${counts.partly} partly` : undefined} />
      </div>

      {ready && entries.length === 0 && (
        <p className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">
          Nothing here yet. Your first entry is tomorrow’s story.
        </p>
      )}

      {groups.map(([month, list]) => (
        <section key={month} className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">{month}</h2>
          <ul className="space-y-2">
            {list.map((e) => (
              <li key={e.date}>
                <EntryRow
                  entry={e}
                  today={today}
                  open={open === e.date}
                  onToggle={() => setOpen(open === e.date ? null : e.date)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EntryRow({
  entry,
  today,
  open,
  onToggle,
}: {
  entry: Entry;
  today: string;
  open: boolean;
  onToggle: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const upcoming = entry.date > today;
  const isToday = entry.date === today;

  return (
    <div className="rounded-3xl border border-line bg-card shadow-sm">
      <button onClick={onToggle} className="flex w-full items-start gap-3 p-4 text-left" aria-expanded={open}>
        <div className="w-12 shrink-0 text-center">
          <p className="text-xs uppercase text-muted">{formatShort(entry.date).split(",")[0]}</p>
          <p className="font-serif text-2xl font-semibold text-ink">{fromKey(entry.date).getDate()}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs">
            {upcoming && <Badge tone="dawn">Tomorrow</Badge>}
            {isToday && <Badge tone="dawn">Today</Badge>}
            {entry.reflection && <Badge tone="plum">{outcomeLabel(entry.reflection.outcome)}</Badge>}
            {!entry.reflection && entry.date <= today && !isToday && <Badge tone="muted">Not reflected</Badge>}
          </div>
          <p className={`mt-1 font-serif text-base leading-snug text-ink ${open ? "" : "line-clamp-2"}`}>
            {entry.text || <span className="text-muted">No words yet</span>}
          </p>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-line p-4">
          <p className="text-sm text-muted">{formatLong(entry.date)}</p>
          {entry.feelings.length > 0 && <p className="text-sm text-muted">Felt: {entry.feelings.join(", ")}</p>}

          {editing ? (
            <>
              <EntryEditor date={entry.date} compact />
              <button onClick={() => setEditing(false)} className="w-full rounded-xl bg-ink py-3 text-sm font-semibold text-paper">
                Done editing
              </button>
            </>
          ) : (
            <>
              {!upcoming && <ReflectCard entry={entry} />}
              <div className="flex gap-2">
                <button onClick={() => setEditing(true)} className="flex-1 rounded-xl border border-line py-2.5 text-sm font-medium text-ink">
                  Edit entry
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete the entry for ${formatLong(entry.date)}?`)) store.remove(entry.date);
                  }}
                  className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3 text-center">
      <p className="font-serif text-2xl font-semibold text-ink">{value}</p>
      <p className="text-xs text-muted">{label}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

function Badge({ tone, children }: { tone: "dawn" | "plum" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "dawn" ? "bg-dawn-soft text-ink" : tone === "plum" ? "bg-plum-soft text-plum" : "bg-paper text-muted";
  return <span className={`rounded-full px-2 py-0.5 font-medium ${cls}`}>{children}</span>;
}

function groupByMonth(entries: Entry[]): [string, Entry[]][] {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const label = fromKey(e.date).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(e);
  }
  return [...map.entries()];
}

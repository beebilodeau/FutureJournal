"use client";

import { useEntries, useNow } from "@/lib/useJournal";
import { formatLong, partOfDay, todayKey, tomorrowKey } from "@/lib/dates";
import { streak } from "@/lib/stats";
import { EntryEditor } from "@/components/EntryEditor";
import { ReflectCard } from "@/components/ReflectCard";
import { StreakPill } from "@/components/StreakPill";

export default function Home() {
  const now = useNow();
  const { entries, ready } = useEntries();
  const today = todayKey(now);
  const tomorrow = tomorrowKey(now);
  const part = partOfDay(now);
  const todays = entries.find((e) => e.date === today && e.text.trim());
  const count = streak(entries, today);
  const firstTime = ready && entries.length === 0;

  const greeting =
    part === "morning" ? "Good morning" : part === "day" ? "Good afternoon" : "Good evening";

  const story = todays && (
    <section className="space-y-3">
      <SectionTitle eyebrow={`Today · ${formatLong(today)}`} title="The day you already wrote" />
      <article className="rounded-3xl border border-line bg-card p-5 shadow-sm">
        <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-ink">{todays.text}</p>
        {todays.feelings.length > 0 && (
          <p className="mt-3 text-sm text-muted">Felt: {todays.feelings.join(", ")}</p>
        )}
      </article>
      {part === "morning" && !todays.reflection && (
        <p className="px-1 text-sm text-muted">
          Read it slowly once. Then go live it. Come back tonight and tell it how it went.
        </p>
      )}
    </section>
  );

  // Daytime: show the reflection only once one exists; the evening view asks for it.
  const reflect = todays && todays.reflection && <ReflectCard entry={todays} />;

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between pt-2">
        <div>
          <p className="text-sm font-medium text-dawn">FutureJournal</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold leading-tight text-ink">
            {greeting}
            {part === "evening" ? ". Let’s write tomorrow." : "."}
          </h1>
        </div>
        {ready && count > 0 && <StreakPill count={count} />}
      </header>

      {firstTime && (
        <div className="rounded-3xl bg-dawn-soft p-5 text-ink">
          <p className="font-serif text-lg font-semibold">Write tomorrow tonight.</p>
          <p className="mt-2 text-sm leading-relaxed">
            Describe tomorrow as if it’s already over and it went the way you wanted. Use past
            tense and real feeling: “I closed my first client today and celebrated with dinner.”
            Tomorrow morning, read it back. Tomorrow night, note how it went.
          </p>
        </div>
      )}

      {part === "evening" ? (
        todays && (
          <section className="space-y-3">
            <SectionTitle
              eyebrow={`Today · ${formatLong(today)}`}
              title={todays.reflection ? "Today, reflected" : "How did today go?"}
            />
            <details className="rounded-3xl border border-line bg-card px-5 py-4 shadow-sm">
              <summary className="cursor-pointer text-sm font-medium text-muted">
                What you wrote last night
              </summary>
              <p className="mt-3 whitespace-pre-wrap font-serif text-lg leading-relaxed text-ink">
                {todays.text}
              </p>
            </details>
            <ReflectCard entry={todays} />
          </section>
        )
      ) : (
        <>
          {story}
          {reflect}
        </>
      )}

      <section className="space-y-3">
        <SectionTitle
          eyebrow={`Tomorrow · ${formatLong(tomorrow)}`}
          title="Write it like it already happened"
        />
        <EntryEditor date={tomorrow} />
      </section>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="px-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-xl font-semibold text-ink">{title}</h2>
    </div>
  );
}

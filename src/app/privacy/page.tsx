import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy · FutureJournal",
  description: "FutureJournal keeps your journal on your device. Nothing is collected.",
};

const UPDATED = "November 27, 2026";
const CONTACT = "privacy@syntheticpush.com";

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "The short version",
    body: (
      <>
        FutureJournal is a journaling and goal-setting app. Your entries stay on your device. We
        don’t collect, store, sell or share your journal or any personal information. There are no
        accounts, ads, analytics or tracking.
      </>
    ),
  },
  {
    title: "Where your entries live",
    body: (
      <>
        On the website (journal.leadinspiregrow.com), entries are saved in your browser’s storage on
        that device. In the Android and iOS apps, they are saved in the app’s private storage on your
        phone. They are never sent to us, and we have no copy. Your entries, affirmations,
        check-offs and settings stay on your device. If your phone’s own backup is turned on (for
        example Google or iCloud backup), your phone may include the app’s data in that backup of your
        device, which is held in your own account under that company’s terms.
      </>
    ),
  },
  {
    title: "Backups",
    body: (
      <>
        A backup file is created only when you tap Download backup or Save backup. It goes where you
        choose (for example your Downloads folder, Google Drive or Files), and from then on it is
        handled by that place’s own privacy terms. Restoring reads the file on your device.
      </>
    ),
  },
  {
    title: "Reminders, app lock and fingerprint",
    body: (
      <>
        The daily reminder is scheduled by your phone itself; no server sends it. If you set an app
        lock, your PIN is stored on the phone only as a one-way scrambled code (a hash), never as the
        PIN itself. Fingerprint or face unlock is handled by your phone’s operating system; the app is
        only told whether it succeeded and never sees your fingerprint or face data.
      </>
    ),
  },
  {
    title: "The Speak button",
    body: (
      <>
        On the website, the Speak button uses your browser’s built-in speech recognition. While it is
        on, your browser sends what you say to its own speech service (in Chrome, that’s Google’s) to
        turn it into text, under that company’s privacy terms. In the apps, the Speak button uses
        your phone’s built-in speech recognition instead (Google’s on most Android phones, Apple’s on
        iPhone), which may send what you say to that company’s service to turn it into text, under its
        privacy terms. The app asks for microphone permission the first time you tap Speak. Either
        way, it’s off unless you tap it, and only the text it gives back is saved, on your device.
      </>
    ),
  },
  {
    title: "Website hosting",
    body: (
      <>
        The website is hosted by Vercel. Like any web host, it receives standard request details,
        such as your IP address and browser type, to deliver the pages. We don’t use these to identify
        you, and the site runs no analytics, ads or tracking scripts. The apps work offline and make
        no network requests of their own.
      </>
    ),
  },
  {
    title: "Deleting your data",
    body: (
      <>
        You can delete any entry in the Journal tab. Clearing your browser’s site data removes
        everything from the website on that device, and uninstalling the app removes everything from
        the app. Because nothing is stored elsewhere, there is nothing else to delete, and we can’t
        recover a journal you remove, so keep a backup if you want one.
      </>
    ),
  },
  {
    title: "Children",
    body: <>FutureJournal is not directed to children under 13, and we don’t knowingly collect information from anyone.</>,
  },
  {
    title: "Changes",
    body: (
      <>
        If this policy changes, for example if we add optional sync in the future, we’ll update this
        page and the date below before the change takes effect, and anything new will be opt-in.
      </>
    ),
  },
  {
    title: "Contact",
    body: (
      <>
        FutureJournal is published by Synthetic Push LLC. Questions:{" "}
        <a href={`mailto:${CONTACT}`} className="font-semibold text-plum underline">
          {CONTACT}
        </a>
        .
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <header className="pt-2">
        <p className="text-sm font-medium text-dawn">FutureJournal</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">Privacy policy</h1>
        <p className="mt-2 text-sm text-muted">Last updated {UPDATED}</p>
      </header>
      {SECTIONS.map((s) => (
        <section key={s.title} className="space-y-1">
          <h2 className="font-serif text-lg font-semibold text-ink">{s.title}</h2>
          <p className="text-sm leading-relaxed text-muted">{s.body}</p>
        </section>
      ))}
      <p className="text-sm">
        <Link href="/about/" className="font-semibold text-plum underline">
          Back to How it works
        </Link>
      </p>
    </div>
  );
}

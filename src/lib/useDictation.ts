"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal types for the Web Speech API (Chrome ships it as webkitSpeechRecognition).
interface SpeechAlt {
  transcript: string;
}
interface SpeechResult {
  isFinal: boolean;
  0: SpeechAlt;
}
interface SpeechEvent {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechResult };
}
interface Recognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognizerCtor = new () => Recognizer;

function getCtor(): RecognizerCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type DictationState = "idle" | "listening" | "blocked" | "error";

/**
 * Tap to talk. Each pause ends a phrase, which is handed to `onPhrase`; it keeps
 * listening until you tap again (Android's speech service stops at every pause,
 * so we quietly start it again).
 */
export function useDictation(onPhrase: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<DictationState>("idle");
  const [interim, setInterim] = useState("");
  const rec = useRef<Recognizer | null>(null);
  const wanted = useRef(false);
  const quietEnds = useRef(0);
  const heard = useRef(false);
  const onPhraseRef = useRef(onPhrase);
  onPhraseRef.current = onPhrase;

  useEffect(() => setSupported(getCtor() !== null), []);

  const startOnce = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.continuous = false;
    r.interimResults = true;
    heard.current = false;
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const t = res[0].transcript;
        if (res.isFinal) {
          if (t.trim()) {
            heard.current = true;
            onPhraseRef.current(t.trim());
          }
        } else {
          live += t;
        }
      }
      setInterim(live.trim());
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wanted.current = false;
        setState("blocked");
      } else if (e.error === "audio-capture" || e.error === "network") {
        wanted.current = false;
        setState("error");
      }
      // "no-speech" and "aborted" just end the round; onend decides what's next.
    };
    r.onend = () => {
      setInterim("");
      quietEnds.current = heard.current ? 0 : quietEnds.current + 1;
      // Keep going until the user taps stop, or about 3 silent rounds in a row.
      if (wanted.current && quietEnds.current < 3) {
        try {
          r.start();
          heard.current = false;
          return;
        } catch {
          // fall through to stop
        }
      }
      wanted.current = false;
      rec.current = null;
      setState((s) => (s === "listening" ? "idle" : s));
    };
    rec.current = r;
    try {
      r.start();
      setState("listening");
    } catch {
      setState("error");
    }
  }, []);

  const start = useCallback(() => {
    if (rec.current) return;
    wanted.current = true;
    quietEnds.current = 0;
    startOnce();
  }, [startOnce]);

  const stop = useCallback(() => {
    wanted.current = false;
    rec.current?.stop();
  }, []);

  useEffect(() => () => {
    wanted.current = false;
    rec.current?.abort();
  }, []);

  return { supported, state, interim, start, stop };
}

/**
 * Turn a spoken phrase into a sentence that fits where it lands: a capital
 * letter after a full stop, and a full stop at the end if the speech service
 * didn't add one.
 */
export function formatPhrase(before: string, phrase: string): string {
  let p = phrase.replace(/\s+/g, " ").trim();
  if (!p) return "";
  const prev = before.trimEnd();
  const startsSentence = prev === "" || /[.!?]$/.test(prev) || /\n\s*$/.test(before);
  if (startsSentence) p = p[0].toUpperCase() + p.slice(1);
  if (!/[.!?,;:]$/.test(p)) p += ".";
  const lead = before === "" || /\s$/.test(before) ? "" : prev && !/[.!?,;:]$/.test(prev) ? ". " : " ";
  // If we're closing the previous sentence for them, the new one starts fresh.
  if (lead === ". ") p = p[0].toUpperCase() + p.slice(1);
  return lead + p;
}

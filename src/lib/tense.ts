// Gentle nudge toward past tense. Future journaling works best when the
// entry reads as something that already happened ("I closed the deal"),
// not as a wish ("I will close the deal").

const PATTERNS: { re: RegExp; tip: string }[] = [
  { re: /\b(i|we|they|he|she|it)'ll\b/gi, tip: "“I’ll call” → “I called”" },
  { re: /\bwill\b/gi, tip: "“will finish” → “finished”" },
  { re: /\bwon't\b/gi, tip: "“won’t worry” → “didn’t worry”" },
  { re: /\bgoing to\b/gi, tip: "“going to start” → “started”" },
  { re: /\bgonna\b/gi, tip: "“gonna try” → “did it”" },
  { re: /\b(hope|hoping) (to|that)\b/gi, tip: "“hope to land” → “landed”" },
  { re: /\b(want|wanting) to\b/gi, tip: "“want to walk” → “walked”" },
  { re: /\b(plan|planning) to\b/gi, tip: "“plan to email” → “emailed”" },
  { re: /\b(try|trying) to\b/gi, tip: "“try to rest” → “rested”" },
  { re: /\btomorrow\b/gi, tip: "write it as “today”" },
  { re: /\b(might|maybe|hopefully)\b/gi, tip: "say it like it’s settled" },
];

export interface TenseHint {
  phrase: string;
  tip: string;
}

export function tenseHints(text: string, max = 3): TenseHint[] {
  const seen = new Set<string>();
  const hints: TenseHint[] = [];
  for (const { re, tip } of PATTERNS) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m) {
      const phrase = m[0].toLowerCase();
      if (seen.has(tip)) continue;
      seen.add(tip);
      hints.push({ phrase, tip });
      if (hints.length >= max) break;
    }
  }
  return hints;
}

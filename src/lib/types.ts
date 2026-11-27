export type Outcome = "happened" | "partly" | "not-yet";

/** One sentence of the entry and whether it came true. */
export interface Check {
  text: string;
  done: boolean;
}

export interface Reflection {
  outcome: Outcome;
  note: string;
  at: string; // ISO timestamp
  /** The came-true check-off: the entry split into parts, each ticked or not. */
  checks?: Check[];
}

export interface Entry {
  /** The day this entry describes (YYYY-MM-DD), not the day it was written. */
  date: string;
  text: string;
  feelings: string[];
  createdAt: string;
  updatedAt: string;
  reflection?: Reflection;
}

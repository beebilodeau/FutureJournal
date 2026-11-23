export type Outcome = "happened" | "partly" | "not-yet";

export interface Reflection {
  outcome: Outcome;
  note: string;
  at: string; // ISO timestamp
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

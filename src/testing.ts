import * as cssWhat from "css-what";
import queriesToErrors from "./queries-to-errors.js";
import { mentionedWords, requiredWordSets } from "./compile-queries.js";
import {
  asQuery,
  categoryMessages,
  entries,
  lookupKey,
  type BadWordCategory,
  type BadWordEntry,
} from "./rules/no-bad-words.js";
import type { ParsedToken } from "./types/index.js";

export { categoryMessages, entries, lookupKey };
export type { BadWordCategory, BadWordEntry };

export const runEntry = (
  entry: BadWordEntry,
  sentences: ParsedToken[][],
): ReturnType<typeof queriesToErrors> =>
  queriesToErrors([asQuery(entry)], sentences);

export const requiredAlternativesOf = (entry: BadWordEntry): Set<string>[] =>
  requiredWordSets(cssWhat.parse(entry.selector));

export const wordsOf = (entry: BadWordEntry): Set<string> =>
  mentionedWords(cssWhat.parse(entry.selector));

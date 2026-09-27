import * as cssWhat from "css-what";
import { mentionedWords, requiredWordSets } from "../src/compile-queries.js";
import {
  categoryMessages,
  entries,
  type BadWordEntry,
} from "../src/rules/no-bad-words.js";

export const parsed = new Map(
  entries.map((entry) => [entry, cssWhat.parse(entry.selector)]),
);

const parse = (entry: BadWordEntry) =>
  parsed.get(entry) ?? cssWhat.parse(entry.selector);

export const wordsOf = (entry: BadWordEntry) => mentionedWords(parse(entry));

export const requiredAlternativesOf = (entry: BadWordEntry) =>
  requiredWordSets(parse(entry));

export const requiredWordsOf = (entry: BadWordEntry) =>
  new Set(
    requiredAlternativesOf(entry).flatMap((alternative) => [...alternative]),
  );

export const byWord = entries.reduce((index, entry) => {
  wordsOf(entry).forEach((word) => {
    const bucket = index.get(word);
    if (bucket) {
      bucket.push(entry);
    } else {
      index.set(word, [entry]);
    }
  });
  return index;
}, new Map<string, BadWordEntry[]>());

export const containments = () => {
  const required = new Map(
    entries.map((entry) => [entry, requiredWordsOf(entry)]),
  );
  const pairs: { broad: BadWordEntry; narrow: BadWordEntry }[] = [];
  entries.forEach((broad) => {
    const broadWords = required.get(broad) ?? new Set<string>();
    if (broadWords.size === 0) {
      return;
    }

    entries.forEach((narrow) => {
      const narrowWords = required.get(narrow) ?? new Set<string>();
      if (
        broad !== narrow &&
        broadWords.size < narrowWords.size &&
        [...broadWords].every((word) => narrowWords.has(word))
      ) {
        pairs.push({ broad, narrow });
      }
    });
  });
  return pairs;
};

export const fixOf = ({ suggestions, message, category }: BadWordEntry) => {
  if (suggestions?.every((suggestion) => suggestion === "")) {
    return "delete it";
  }

  return suggestions?.join(", ") ?? message ?? categoryMessages[category];
};

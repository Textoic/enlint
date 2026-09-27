import { byWord, requiredAlternativesOf, wordsOf } from "./entry-index.js";
import parse from "./nlp.js";
import type { BadWordEntry } from "../src/rules/no-bad-words.js";

export const phraseWords = (phrase: string) => {
  const words = new Set<string>();
  parse(phrase)
    .flat()
    .forEach(({ form, lemma }) => {
      words.add(form.toLowerCase());
      if (lemma) {
        words.add(lemma.toLowerCase());
      }
    });
  return words;
};

export const contentWords = (phrase: string) => {
  const words = new Set<string>();
  parse(phrase)
    .flat()
    .forEach(({ form, lemma, xpos, feats }) => {
      if (xpos === "MARK" || xpos === "PUNCT" || feats.PronType != null) {
        return;
      }

      words.add((lemma ?? form).toLowerCase());
      words.add(form.toLowerCase());
    });
  return words;
};

export type Verdict =
  | { case: "covered"; entries: BadWordEntry[] }
  | { case: "widen"; entries: BadWordEntry[] }
  | { case: "abstract"; word: string; entries: BadWordEntry[] }
  | { case: "new" };

export type Triage = {
  phrase: string;
  verdict: Verdict;
  related: BadWordEntry[];
};

const ABSTRACT_AT = 2;

const relatedTo = (words: Set<string>, content: Set<string>) => {
  const related = new Set<BadWordEntry>();
  const collect = (word: string) =>
    byWord.get(word)?.forEach((entry) => related.add(entry));
  content.forEach(collect);
  words.forEach(collect);
  return related;
};

const compareCoverage = (related: Set<BadWordEntry>, words: Set<string>) => {
  const broader: BadWordEntry[] = [];
  const narrower: BadWordEntry[] = [];
  related.forEach((entry) => {
    const alternatives = requiredAlternativesOf(entry).filter(
      (alternative) => alternative.size > 0,
    );
    if (alternatives.length === 0) {
      return;
    }

    if (
      alternatives.some((alternative) =>
        [...alternative].every((word) => words.has(word)),
      )
    ) {
      broader.push(entry);
      return;
    }

    if (
      alternatives.every((alternative) =>
        [...words].every((word) => alternative.has(word)),
      )
    ) {
      narrower.push(entry);
    }
  });

  return { broader, narrower };
};

export default (phrase: string): Triage => {
  const words = phraseWords(phrase);
  const content = contentWords(phrase);
  const related = relatedTo(words, content);
  const { broader, narrower } = compareCoverage(related, words);
  const ordered = [...related];

  if (broader.length > 0) {
    return {
      phrase,
      verdict: { case: "covered", entries: broader },
      related: ordered,
    };
  }

  if (narrower.length > 0) {
    return {
      phrase,
      verdict: { case: "widen", entries: narrower },
      related: ordered,
    };
  }

  const [pile] = [...content]
    .map((word) => ({ word, entries: byWord.get(word) ?? [] }))
    .filter(({ entries }) => entries.length >= ABSTRACT_AT)
    .sort((a, b) => b.entries.length - a.entries.length);
  if (pile) {
    return {
      phrase,
      verdict: { case: "abstract", word: pile.word, entries: pile.entries },
      related: ordered,
    };
  }

  return { phrase, verdict: { case: "new" }, related: ordered };
};

export const describe = (entry: BadWordEntry) =>
  [
    `  ${entry.phrase} [${entry.category}]`,
    `    selector: ${entry.selector}`,
    `    fix: ${
      entry.suggestions
        ? entry.suggestions.every((suggestion) => suggestion === "")
          ? "delete the span"
          : entry.suggestions.map((s) => JSON.stringify(s)).join(", ")
        : (entry.message ?? "(category default)")
    }`,
    `    words: ${[...wordsOf(entry)].join(", ")}`,
  ].join("\n");

const list = (entries: BadWordEntry[]) =>
  entries.map(({ phrase }) => `"${phrase}"`).join(", ");

export const summarize = ({ verdict }: Triage) => {
  if (verdict.case === "covered") {
    return `covered by ${list(verdict.entries)}`;
  }

  if (verdict.case === "widen") {
    return `broader than ${list(verdict.entries)}`;
  }

  if (verdict.case === "abstract") {
    return `${verdict.entries.length} rules already turn on "${verdict.word}"`;
  }

  return "nothing similar on the list";
};

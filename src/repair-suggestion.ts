import type { ParsedToken, Suggestion } from "./types/index.js";

const isComma = (token?: ParsedToken) => token?.feats?.PunctType === "Comm";

const isTerminal = (token?: ParsedToken) =>
  token?.feats?.PunctType === "Peri" ||
  token?.feats?.PunctType === "Qest" ||
  token?.feats?.PunctType === "Excl";

const COMPLEMENTIZERS = new Set(["that", "whether"]);

const isComplementizer = (
  token: ParsedToken | undefined,
  next: ParsedToken | undefined,
) =>
  token != null &&
  token.xpos === "MARK" &&
  COMPLEMENTIZERS.has(token.form.toLowerCase()) &&
  next != null &&
  next.xpos !== "VERB";

const DETERMINERS = new Set(["a", "an", "the"]);

const isDeterminer = (token?: ParsedToken) =>
  token != null && DETERMINERS.has(token.form.toLowerCase());

const VOWEL_SOUNDED_H = /^h(?:our|onest|onou?r)/u;

const articleFor = (word: string): "a" | "an" | null => {
  const letters = word.toLowerCase().replace(/[^a-z]/gu, "");
  if (letters.length < 2) {
    return null;
  }

  if (/^[A-Z]{2}/u.test(word)) {
    return null;
  }

  if (VOWEL_SOUNDED_H.test(letters)) {
    return "an";
  }

  if (letters.startsWith("u") || letters.startsWith("eu")) {
    return null;
  }

  if (/^[aeio]/u.test(letters)) {
    return "an";
  }

  return /^[bcdfghjklmnpqrstvwxyz]/u.test(letters) ? "a" : null;
};

const matchCase = (replacement: string, original: string) =>
  /^[A-Z]/u.test(original)
    ? `${replacement.charAt(0).toUpperCase()}${replacement.slice(1)}`
    : replacement;

const capitalize = (word: string) =>
  `${word.charAt(0).toUpperCase()}${word.slice(1)}`;

const endOf = (token: ParsedToken) => token.misc.at + token.form.length;

export type Span = {
  tokens: ParsedToken[];
  tree: number[];
  range: [number, number];
  text: string;
};

type Neighbourhood = {
  tokens: ParsedToken[];
  first: number;
  last: number;
  before: ParsedToken;
  after: ParsedToken;
  opensSentence: boolean;
};

const withoutCommas = ({
  first,
  last,
  before,
  after,
  opensSentence,
}: Neighbourhood) => {
  const commaBefore = isComma(before);
  const commaAfter = isComma(after);
  if (commaBefore && commaAfter) {
    return { from: first - 1, to: last + 1 };
  }

  if (commaAfter && opensSentence) {
    return { from: first, to: last + 1 };
  }

  if (commaBefore && (after == null || isTerminal(after))) {
    return { from: first - 1, to: last };
  }

  return { from: first, to: last };
};

const strandedComplementizer = (
  tokens: ParsedToken[],
  to: number,
  opensSentence: boolean,
) => opensSentence && isComplementizer(tokens[to + 1], tokens[to + 2]);

const gapLeftBy = (
  tokens: ParsedToken[],
  from: number,
  to: number,
): [number, number] => {
  const outerBefore = tokens[from - 1];
  const outerAfter = tokens[to + 1];
  if (outerBefore != null) {
    return [endOf(outerBefore), endOf(tokens[to])];
  }

  if (outerAfter != null) {
    return [tokens[from].misc.at, outerAfter.misc.at];
  }

  return [tokens[from].misc.at, endOf(tokens[to])];
};

const promotesNextWord = (
  { tokens, first, opensSentence }: Neighbourhood,
  outerAfter: ParsedToken,
) =>
  opensSentence &&
  outerAfter != null &&
  /^[a-z]/u.test(outerAfter.form) &&
  /^[A-Z]/u.test(tokens[first].form);

const repairDeletion = (place: Neighbourhood): Suggestion => {
  const { tokens, opensSentence } = place;
  const { from, to: trimmed } = withoutCommas(place);
  const to = strandedComplementizer(tokens, trimmed, opensSentence)
    ? trimmed + 1
    : trimmed;

  const [start, end] = gapLeftBy(tokens, from, to);
  const outerAfter = tokens[to + 1];
  return promotesNextWord(place, outerAfter)
    ? { range: [start, endOf(outerAfter)], text: capitalize(outerAfter.form) }
    : { range: [start, end], text: "" };
};

const swappedDeterminer = (
  before: ParsedToken,
  replacement: string,
  firstWord: string,
  end: number,
): Suggestion | undefined =>
  DETERMINERS.has(firstWord.toLowerCase()) && isDeterminer(before)
    ? {
        range: [before.misc.at, end],
        text: matchCase(replacement, before.form),
      }
    : undefined;

const agreedArticle = (
  before: ParsedToken,
  replacement: string,
  firstWord: string,
  end: number,
): Suggestion | undefined => {
  const article = before == null ? "" : before.form.toLowerCase();
  if (article !== "a" && article !== "an") {
    return undefined;
  }

  const wanted = articleFor(firstWord);
  return wanted == null || wanted === article
    ? undefined
    : {
        range: [before.misc.at, end],
        text: `${matchCase(wanted, before.form)} ${replacement}`,
      };
};

export default ({ tokens, tree, range, text }: Span): Suggestion => {
  const first = Math.min(...tree);
  const last = Math.max(...tree);
  const [start, end] = range;
  const replacement = text;

  const place: Neighbourhood = {
    tokens,
    first,
    last,
    before: tokens[first - 1],
    after: tokens[last + 1],
    opensSentence: tokens.slice(0, first).every(({ xpos }) => xpos === "PUNCT"),
  };

  if (replacement === "") {
    return repairDeletion(place);
  }

  const [firstWord = ""] = replacement.split(/\s+/u);
  return (
    swappedDeterminer(place.before, replacement, firstWord, end) ??
    agreedArticle(place.before, replacement, firstWord, end) ?? {
      range: [start, end],
      text: replacement,
    }
  );
};

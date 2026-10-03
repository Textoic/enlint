import type { ParsedToken } from "./types/index.js";

export type TellKind =
  | "noun-fragment"
  | "teaser"
  | "announcement"
  | "which-tail"
  | "precise-figure";

export type Tell = { kind: TellKind; start: number; end: number };

const isWord = ({ xpos }: ParsedToken) => xpos !== "PUNCT";

const formOf = ({ form }: ParsedToken) => form.toLowerCase();

const endOf = ({ form, misc: { at } }: ParsedToken) => at + form.length;

const spanOf = (kind: TellKind, from: ParsedToken, to: ParsedToken): Tell => ({
  kind,
  start: from.misc.at,
  end: endOf(to),
});

const lastWord = (tokens: ParsedToken[]) => [...tokens].reverse().find(isWord);

const wholeSentence = (kind: TellKind, tokens: ParsedToken[]): Tell[] => {
  const first = tokens.find(isWord);
  const last = lastWord(tokens);
  return first && last ? [spanOf(kind, first, last)] : [];
};

const punctuationOf = (tokens: ParsedToken[]) =>
  tokens.map(({ feats: { PunctType } }) => PunctType);

const SHORTEST_FRAGMENT = 4;

const RELATIVIZERS = new Set(["that", "where", "which", "who", "whose"]);

const isCommonNoun = ({ xpos, feats }: ParsedToken) =>
  xpos === "NOUN" && feats.PronType == null;

const LONGEST_FRAGMENT = 12;

const hangsAClause = (tokens: ParsedToken[], root: ParsedToken) => {
  const verbs = tokens.filter(({ xpos }) => xpos === "VERB");
  const words = tokens.filter(isWord);
  return (
    words.length <= LONGEST_FRAGMENT &&
    verbs.every(({ id }) => id > root.id) &&
    lastWord(tokens)?.xpos === "VERB" &&
    (verbs.length === 1 ||
      tokens.some((token) => RELATIVIZERS.has(formOf(token))))
  );
};

const endsPlainly = (tokens: ParsedToken[]) => {
  const marks = punctuationOf(tokens);
  return (
    marks[marks.length - 1] === "Peri" &&
    !marks.includes("Colo") &&
    !marks.includes("Quot")
  );
};

const nounFragment = (tokens: ParsedToken[]): Tell[] => {
  const root = tokens.find(({ head }) => head === -1);
  return root != null &&
    isCommonNoun(root) &&
    tokens.filter(isWord).length >= SHORTEST_FRAGMENT &&
    endsPlainly(tokens) &&
    hangsAClause(tokens, root)
    ? wholeSentence("noun-fragment", tokens)
    : [];
};

const textOf = (tokens: ParsedToken[]) =>
  tokens
    .filter(isWord)
    .map(formOf)
    .join(" ")
    .replace(/ (['’])/gu, "$1");

const TEASERS = [
  /\bone more (?:thing|effect|reason|point|benefit|trick|detail|catch|problem|step|idea|bonus)\b/u,
  /\b(?:and|but) (?:it|that|this)(?:['’]s| is) the (?:one|part|bit) (?:i|you|we)\b/u,
  /\bthe best part\b/u,
  /\bhere(?:['’]s| is) the (?:thing|kicker|catch|twist|secret|deal)\b/u,
];

const teaser = (tokens: ParsedToken[]): Tell[] => {
  const text = textOf(tokens);
  return TEASERS.some((pattern) => pattern.test(text))
    ? wholeSentence("teaser", tokens)
    : [];
};

const OPENS_ANNOUNCEMENT = /^here(?:['’]s| is| are)\b/u;

const announcement = (tokens: ParsedToken[]): Tell[] =>
  OPENS_ANNOUNCEMENT.test(textOf(tokens)) &&
  punctuationOf(tokens).includes("Colo")
    ? wholeSentence("announcement", tokens)
    : [];

const LINKS = new Set(["is", "was", "'s", "’s"]);

const POINTERS = new Set(["the", "what", "why", "where", "how", "exactly"]);

const opensWhichTail = (tokens: ParsedToken[], at: number) =>
  tokens[at].feats.PunctType === "Comm" &&
  formOf(tokens[at + 1] ?? tokens[at]) === "which" &&
  LINKS.has(formOf(tokens[at + 2] ?? tokens[at])) &&
  POINTERS.has(formOf(tokens[at + 3] ?? tokens[at]));

const whichTail = (tokens: ParsedToken[]): Tell[] => {
  const opening = tokens.find((_, at) => opensWhichTail(tokens, at));
  const last = lastWord(tokens);
  return opening && last ? [spanOf("which-tail", opening, last)] : [];
};

const LONG_DECIMAL = /^\d+\.\d{3,}$/u;

const DECIMAL = /^\d+\.\d+$/u;

const MULTIPLIERS = new Set(["times", "x", "×", "*"]);

const showsArithmetic = (tokens: ParsedToken[], at: number) =>
  DECIMAL.test(tokens[at].form) &&
  MULTIPLIERS.has(formOf(tokens[at + 1] ?? tokens[at])) &&
  DECIMAL.test(tokens[at + 2]?.form ?? "");

const preciseFigures = (tokens: ParsedToken[]): Tell[] =>
  tokens.flatMap((token, at) => {
    if (showsArithmetic(tokens, at)) {
      return [spanOf("precise-figure", token, tokens[at + 2])];
    }

    const insideArithmetic = at >= 2 && showsArithmetic(tokens, at - 2);
    return LONG_DECIMAL.test(token.form) && !insideArithmetic
      ? [spanOf("precise-figure", token, token)]
      : [];
  });

const DETECTORS = [
  nounFragment,
  teaser,
  announcement,
  whichTail,
  preciseFigures,
];

export default (sentences: ParsedToken[][]): Tell[] =>
  sentences.flatMap((tokens) =>
    DETECTORS.flatMap((detector) => detector(tokens)),
  );

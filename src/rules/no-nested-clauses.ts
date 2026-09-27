import parseToSubtree from "../parse-to-subtree.js";
import { ErrorId, type LintError, type ParsedToken } from "../types/index.js";

const MAX_NESTED_CLAUSES = 1;

const isVerb = ({ xpos }: ParsedToken) => xpos === "VERB";

const isNoun = ({ xpos }: ParsedToken) => xpos === "NOUN";

const relativePronouns = new Set(["that", "who", "whom", "whose", "which"]);

const isRelativeClauseMarker = (token: ParsedToken) =>
  ["NOUN", "MARK"].includes(token.xpos) &&
  token.feats.PronType === "Rel" &&
  relativePronouns.has(token.lemma ?? token.form.toLowerCase());

const carriesRelative = (token: ParsedToken, sawRelative: boolean) =>
  isRelativeClauseMarker(token) || (sawRelative && !isVerb(token));

const nestedClauses = (tokens: ParsedToken[], noun: ParsedToken) => {
  const head = tokens[noun.head];
  const first = Math.min(noun.id, head.id);
  const last = Math.max(noun.id, head.id);
  const isBetween = (id: number) => id > first && id < last;
  const walk = (id: number, sawRelative: boolean): number => {
    const token = tokens[id];
    const closed = sawRelative && isVerb(token) ? 1 : 0;
    const below = token.misc.children
      .filter(isBetween)
      .map((child) => walk(child, carriesRelative(token, sawRelative)));
    return closed + Math.max(0, ...below);
  };

  return walk(noun.id, false);
};

const isSeparatedFromItsVerb = (tokens: ParsedToken[], noun: ParsedToken) =>
  noun.head > noun.id && isVerb(tokens[noun.head]) && noun.head - noun.id > 1;

const buildError = (
  tokens: ParsedToken[],
  noun: ParsedToken,
  clauses: number,
): LintError => {
  const phrase = parseToSubtree(tokens, noun.id);
  const first = tokens[Math.min(...phrase)];
  const last = tokens[Math.max(...phrase)];
  return {
    start: first.misc.at,
    end: last.misc.at + last.form.length,
    message: `${clauses} clauses sit between "${noun.form}" and its verb, so the reader has to hold the subject in mind to the end. Give each clause its own sentence.`,
    id: ErrorId.NO_NESTED_CLAUSES,
  };
};

const applyRule = (tokens: ParsedToken[]) =>
  tokens
    .filter((token) => isNoun(token) && isSeparatedFromItsVerb(tokens, token))
    .map((noun) => ({ noun, clauses: nestedClauses(tokens, noun) }))
    .filter(({ clauses }) => clauses > MAX_NESTED_CLAUSES)
    .map(({ noun, clauses }) => buildError(tokens, noun, clauses));

export default (sentences: ParsedToken[][]) =>
  sentences.reduce(
    (errors: LintError[], tokens) => [...errors, ...applyRule(tokens)],
    [],
  );

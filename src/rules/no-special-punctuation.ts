import { ErrorId, type LintError, type ParsedToken } from "../types/index.js";

const EN_DASH = "–";

const isPunctuation = ({ xpos }: ParsedToken) => xpos === "PUNCT";

const enDashError = (at: number): LintError => ({
  start: at,
  end: at + 1,
  suggestions: [{ range: [at, at + 1] as [number, number], text: "-" }],
  message: `Replace the en dash '–' with a hyphen '-'.`,
  id: ErrorId.NO_SPECIAL_PUNCTUATION,
});

const JOINERS = new Set([
  "and",
  "but",
  "or",
  "so",
  "then",
  "yet",
  "nor",
  "because",
  "which",
  "who",
  "that",
  "while",
  "when",
  "where",
  "if",
  "though",
  "although",
  "as",
  "since",
  "until",
  "unless",
]);

const isFiniteVerb = ({ xpos, feats: { VerbForm } }: ParsedToken) =>
  xpos === "VERB" && VerbForm !== "Part";

const isDash = ({ form }: ParsedToken) => form === "—";

const isNoun = ({ xpos }: ParsedToken) => xpos === "NOUN";

const isModifier = ({ xpos }: ParsedToken) => xpos === "ADJ";

const isAdverb = ({ xpos }: ParsedToken) => xpos === "ADV";

const hasItsOwnSubject = (clause: ParsedToken[]) => {
  const noun = clause.findIndex((token) => !isModifier(token));
  const afterNouns = clause.findIndex(
    (token, at) => at >= noun && !isNoun(token),
  );
  const verb = clause.findIndex(
    (token, at) => at >= afterNouns && !isAdverb(token),
  );
  return (
    noun >= 0 &&
    afterNouns > noun &&
    verb >= afterNouns &&
    isFiniteVerb(clause[verb])
  );
};

const BRACKETS_AND_QUESTIONS = new Set(["(", ")", "[", "]", "?"]);

const isPlainStatement = (tokens: ParsedToken[]) =>
  !tokens.some(({ form }) => BRACKETS_AND_QUESTIONS.has(form));

const opensAStatement = ([first, ...rest]: ParsedToken[]) =>
  /^[A-Za-z]/u.test(first.form) &&
  !JOINERS.has(first.form.toLowerCase()) &&
  hasItsOwnSubject([first, ...rest]);

const splitsTwoStatements = (tokens: ParsedToken[], id: number) =>
  tokens.filter(isDash).length === 1 &&
  isPlainStatement(tokens) &&
  tokens.slice(0, id).some(isFiniteVerb) &&
  opensAStatement(tokens.slice(id + 1));

const capitalised = (form: string) =>
  `${form.charAt(0).toUpperCase()}${form.slice(1)}`;

type Swap = { range: [number, number]; text: string };

const fullStopSwap = (
  [start, end]: [number, number],
  nextToken: ParsedToken,
): Swap | null =>
  end === nextToken.misc.at
    ? {
        range: [start, end + nextToken.form.length],
        text: `. ${capitalised(nextToken.form)}`,
      }
    : null;

const emDashError = (tokens: ParsedToken[], id: number): LintError => {
  const previousToken = tokens[id - 1];
  const nextToken = tokens[id + 1];
  const { at } = tokens[id].misc;
  const range: [number, number] = [
    Math.max(previousToken.misc.at + previousToken.form.length, at - 1),
    Math.min(nextToken.misc.at, at + 2),
  ];
  const stop = splitsTwoStatements(tokens, id)
    ? fullStopSwap(range, nextToken)
    : null;

  return {
    start: at,
    end: at + 1,
    suggestions: [stop ?? { range, text: ", " }],
    message: `Rewrite the sentence to replace the dash with a full stop '.' if the next sentence is a separate thought, a colon ':' if the dash is introducing a thought or parentheses if there are two dashes enclosing an aside.`,
    id: ErrorId.NO_SPECIAL_PUNCTUATION,
  };
};

const joinsTwoStatements = (
  tokens: ParsedToken[],
  nextToken: ParsedToken,
  id: number,
) =>
  tokens.slice(0, id).some((token) => !isPunctuation(token)) &&
  !isPunctuation(nextToken);

const applyDashRule = (
  tokens: ParsedToken[],
  at: number,
  id: number,
  form: string,
) => {
  if (form === EN_DASH) {
    return [enDashError(at)];
  }

  const nextToken = tokens[id + 1];
  const previousToken = tokens[id - 1];
  if (nextToken == null || previousToken == null) {
    return [];
  }

  return joinsTwoStatements(tokens, nextToken, id)
    ? [emDashError(tokens, id)]
    : [];
};

const applyRule = (tokens: ParsedToken[]) =>
  tokens
    .filter(({ xpos }) => xpos === "PUNCT")
    .reduce((errors: LintError[], { form, misc: { at }, id }) => {
      if (["—", EN_DASH].includes(form)) {
        return errors.concat(applyDashRule(tokens, at, id, form));
      }

      return errors;
    }, []);

export default (sentences: ParsedToken[][]) =>
  sentences.reduce(
    (errors: LintError[], entities) => [...errors, ...applyRule(entities)],
    [],
  );

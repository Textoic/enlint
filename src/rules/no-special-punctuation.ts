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

const emDashError = (
  previousToken: ParsedToken,
  nextToken: ParsedToken,
  at: number,
): LintError => {
  const range: [number, number] = [
    Math.max(previousToken.misc.at + previousToken.form.length, at - 1),
    Math.min(nextToken.misc.at, at + 2),
  ];

  return {
    start: at,
    end: at + 1,
    suggestions: [{ range, text: ", " }],
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
    ? [emDashError(previousToken, nextToken, at)]
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

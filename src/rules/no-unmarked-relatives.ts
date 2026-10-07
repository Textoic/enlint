import {
  lastVerbOfGroup,
  unmarkedRelatives,
  type UnmarkedRelative,
} from "../clauses.js";
import { ErrorId, type LintError, type ParsedToken } from "../types/index.js";

const endOf = ({ form, misc: { at } }: ParsedToken) => at + form.length;

const buildError = (
  tokens: ParsedToken[],
  { antecedent, opening, verb }: UnmarkedRelative,
): LintError => {
  const closing = lastVerbOfGroup(tokens, verb);
  const clause = tokens
    .slice(opening.id, closing.id + 1)
    .map(({ form }) => form)
    .join(" ");
  return {
    start: antecedent.misc.at,
    end: endOf(closing),
    message: `"${clause}" is a relative clause about "${antecedent.form}" with nothing to mark where it starts. Write "${antecedent.form} that ${clause}".`,
    id: ErrorId.NO_UNMARKED_RELATIVES,
    suggestions: [{ range: [opening.misc.at, opening.misc.at], text: "that " }],
  };
};

export default (sentences: ParsedToken[][]) =>
  sentences.flatMap((tokens) =>
    unmarkedRelatives(tokens).map((relative) => buildError(tokens, relative)),
  );

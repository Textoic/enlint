import { clauseLinks, type ClauseLink } from "../clauses.js";
import { ErrorId, type LintError, type ParsedToken } from "../types/index.js";

export const MAX_CLAUSE_LINKS = 3;

const isWord = ({ xpos }: ParsedToken) => xpos !== "PUNCT";

const endOf = ({ form, misc: { at } }: ParsedToken) => at + form.length;

const named = ({ word, at }: ClauseLink) =>
  word === "" ? `a clause with no marker at "${at.form}"` : `"${word}"`;

const buildError = (tokens: ParsedToken[], links: ClauseLink[]): LintError => {
  const words = tokens.filter(isWord);
  return {
    start: words[0].misc.at,
    end: endOf(words[words.length - 1]),
    message: `This sentence joins clauses ${links.length} times: ${links.map(named).join(", ")}. A reader follows ${MAX_CLAUSE_LINKS} joins at most. End the sentence at one of them and start a new one.`,
    id: ErrorId.NO_CONVOLUTED_SENTENCES,
  };
};

export default (sentences: ParsedToken[][]) =>
  sentences
    .map((tokens) => ({ tokens, links: clauseLinks(tokens) }))
    .filter(({ links }) => links.length > MAX_CLAUSE_LINKS)
    .map(({ tokens, links }) => buildError(tokens, links));

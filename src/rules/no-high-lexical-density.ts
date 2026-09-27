import {
  ErrorId,
  type Config,
  type LexicalDensityOptions,
  type LintError,
  type ParsedToken,
} from "../types/index.js";

const defaultOptions: Required<LexicalDensityOptions> = {
  nounPercentage: 40,
  adjectivePercentage: 20,
  nounAndAdjectivePercentage: 50,
  minimumWords: 16,
};

const isWord = ({ xpos }: ParsedToken) => xpos !== "PUNCT";

const isPlainNoun = ({ xpos, feats: { PronType } }: ParsedToken) =>
  xpos === "NOUN" && PronType == null;

const isPlainAdjective = ({ xpos, feats: { PronType } }: ParsedToken) =>
  xpos === "ADJ" && PronType == null;

const optionsOf = (config: Config): Required<LexicalDensityOptions> => {
  const given = config[ErrorId.NO_HIGH_LEXICAL_DENSITY];
  const chosen: LexicalDensityOptions = typeof given === "object" ? given : {};
  return {
    nounPercentage: chosen.nounPercentage ?? defaultOptions.nounPercentage,
    adjectivePercentage:
      chosen.adjectivePercentage ?? defaultOptions.adjectivePercentage,
    nounAndAdjectivePercentage:
      chosen.nounAndAdjectivePercentage ??
      defaultOptions.nounAndAdjectivePercentage,
    minimumWords: chosen.minimumWords ?? defaultOptions.minimumWords,
  };
};

type Measure = { share: number; limit: number };

const measuresOf = (
  tokens: ParsedToken[],
  options: Required<LexicalDensityOptions>,
): Measure[] => {
  const words = tokens.filter(isWord);
  const nouns = words.filter(isPlainNoun).length;
  const adjectives = words.filter(isPlainAdjective).length;
  const share = (count: number) => (count / words.length) * 100;
  return [
    { share: share(nouns), limit: options.nounPercentage },
    { share: share(adjectives), limit: options.adjectivePercentage },
    {
      share: share(nouns + adjectives),
      limit: options.nounAndAdjectivePercentage,
    },
  ];
};

const buildError = (tokens: ParsedToken[]): LintError => {
  const words = tokens.filter(isWord);
  const last = words[words.length - 1];
  return {
    start: tokens[0].misc.at,
    end: last.misc.at + last.form.length,
    message: `This sentence is too dense. Simplify it into shorter sentences carrying less ideas/information/facts each, and remove unnecessary adjectives and nouns.`,
    id: ErrorId.NO_HIGH_LEXICAL_DENSITY,
  };
};

const applyRule = (
  tokens: ParsedToken[],
  options: Required<LexicalDensityOptions>,
) => {
  const words = tokens.filter(isWord);
  if (words.length < Math.max(options.minimumWords, 1)) {
    return [];
  }

  const over = measuresOf(tokens, options).filter(
    ({ share, limit }) => share > limit,
  );
  return over.length === 0 ? [] : [buildError(tokens)];
};

export default (sentences: ParsedToken[][], config: Config) => {
  const options = optionsOf(config);
  return sentences.reduce(
    (errors: LintError[], tokens) => [...errors, ...applyRule(tokens, options)],
    [],
  );
};

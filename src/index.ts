import {
  ErrorId,
  type AdpositionType,
  type Config,
  type LexicalDensityOptions,
  type LexicalFeatures,
  type LintError,
  type MorphCase,
  type NominalNumber,
  type ParsedText,
  type ParsedToken,
  type PosTag,
  type PronounType,
  type PunctuationType,
  type Rule,
  type RuleOptions,
  type Suggestion,
  type Tense,
  type TokenPosition,
  type VerbForm,
  type VerbMood,
  type VerbPerson,
} from "./types/index.js";
import noAbsolutePhrases from "./rules/no-absolute-phrases.js";
import noBadSentenceStructures from "./rules/no-bad-sentence-structures.js";
import noBadWords, {
  type BadWordCategory,
  type BadWordEntry,
} from "./rules/no-bad-words.js";
import noExplainedAntonyms from "./rules/no-explained-antonyms.js";
import noExplainedIntensifiers from "./rules/no-explained-intensifiers.js";
import noHighLexicalDensity from "./rules/no-high-lexical-density.js";
import noMixedDialects from "./rules/no-mixed-dialects.js";
import noNegatedContrasts from "./rules/no-negated-contrasts.js";
import noNestedClauses from "./rules/no-nested-clauses.js";
import noNounClusters from "./rules/no-noun-clusters.js";
import noPassiveSentences from "./rules/no-passive-sentences.js";
import noSimiles from "./rules/no-similes.js";
import noSpecialPunctuation from "./rules/no-special-punctuation.js";

export { ErrorId };
export type {
  AdpositionType,
  BadWordCategory,
  BadWordEntry,
  Config,
  LexicalDensityOptions,
  LexicalFeatures,
  LintError,
  MorphCase,
  NominalNumber,
  ParsedText,
  ParsedToken,
  PosTag,
  PronounType,
  PunctuationType,
  Rule,
  RuleOptions,
  Suggestion,
  Tense,
  TokenPosition,
  VerbForm,
  VerbMood,
  VerbPerson,
};

const {
  NO_ABSOLUTE_PHRASES,
  NO_BAD_SENTENCE_STRUCTURES,
  NO_BAD_WORDS,
  NO_EXPLAINED_ANTONYMS,
  NO_EXPLAINED_INTENSIFIERS,
  NO_HIGH_LEXICAL_DENSITY,
  NO_MIXED_DIALECTS,
  NO_NEGATED_CONTRASTS,
  NO_NESTED_CLAUSES,
  NO_NOUN_CLUSTERS,
  NO_PASSIVE_SENTENCES,
  NO_SIMILES,
  NO_SPECIAL_PUNCTUATION,
} = ErrorId;

const rules: [ErrorId, Rule][] = [
  [NO_PASSIVE_SENTENCES, noPassiveSentences],

  [NO_EXPLAINED_ANTONYMS, noExplainedAntonyms],
  [NO_EXPLAINED_INTENSIFIERS, noExplainedIntensifiers],

  [NO_NOUN_CLUSTERS, noNounClusters],
  [NO_HIGH_LEXICAL_DENSITY, noHighLexicalDensity],
  [NO_NESTED_CLAUSES, noNestedClauses],
  [NO_SIMILES, noSimiles],
  [NO_SPECIAL_PUNCTUATION, noSpecialPunctuation],
  [NO_BAD_SENTENCE_STRUCTURES, noBadSentenceStructures],
  [NO_NEGATED_CONTRASTS, noNegatedContrasts],
  [NO_ABSOLUTE_PHRASES, noAbsolutePhrases],

  [NO_BAD_WORDS, noBadWords],
  [NO_MIXED_DIALECTS, noMixedDialects],
];

export const defaults: Config = {
  locale: "en-US",
  [NO_ABSOLUTE_PHRASES]: true,
  [NO_BAD_SENTENCE_STRUCTURES]: true,
  [NO_BAD_WORDS]: true,
  [NO_EXPLAINED_ANTONYMS]: true,
  [NO_EXPLAINED_INTENSIFIERS]: true,
  [NO_HIGH_LEXICAL_DENSITY]: true,
  [NO_MIXED_DIALECTS]: false,
  [NO_NEGATED_CONTRASTS]: true,
  [NO_NESTED_CLAUSES]: true,
  [NO_NOUN_CLUSTERS]: false,
  [NO_PASSIVE_SENTENCES]: true,
  [NO_SIMILES]: true,
  [NO_SPECIAL_PUNCTUATION]: false,
};

const overlaps = (one: LintError, other: LintError) =>
  one.start < other.end && other.start < one.end;

const offersReplacement = ({ suggestions }: LintError) =>
  (suggestions ?? []).length > 0;

const widthOf = ({ start, end }: LintError) => end - start;

const widestFirst = (one: LintError, other: LintError) =>
  widthOf(other) - widthOf(one) || one.start - other.start;

const byPosition = (one: LintError, other: LintError) =>
  one.start - other.start || one.end - other.end;

const supersedes = (keeper: LintError, problem: LintError) =>
  overlaps(keeper, problem) &&
  (offersReplacement(keeper) || keeper.id === problem.id);

const settled = (problems: LintError[]): LintError[] =>
  [...problems]
    .sort(widestFirst)
    .reduce(
      (kept: LintError[], problem) =>
        kept.some((keeper) => supersedes(keeper, problem))
          ? kept
          : [...kept, problem],
      [],
    )
    .sort(byPosition);

export default (sentences: ParsedToken[][], config: Config = defaults) =>
  settled(
    rules.reduce(
      (lintErrors: LintError[], [id, rule]) =>
        config[id] ? lintErrors.concat(rule(sentences, config)) : lintErrors,
      [],
    ),
  );

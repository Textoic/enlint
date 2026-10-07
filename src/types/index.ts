import type * as cssWhat from "css-what";
import type {
  AdpositionType,
  LexicalFeatures,
  MorphCase,
  NominalNumber,
  ParsedText,
  ParsedToken,
  PosTag,
  PronounType,
  PunctuationType,
  Tense,
  TokenPosition,
  VerbForm,
  VerbMood,
  VerbPerson,
} from "./input.js";

export type {
  AdpositionType,
  LexicalFeatures,
  MorphCase,
  NominalNumber,
  ParsedText,
  ParsedToken,
  PosTag,
  PronounType,
  PunctuationType,
  Tense,
  TokenPosition,
  VerbForm,
  VerbMood,
  VerbPerson,
};

export const ErrorId = {
  NO_ABSOLUTE_PHRASES: "no-absolute-phrases",
  NO_BAD_SENTENCE_STRUCTURES: "no-bad-sentence-structures",
  NO_BAD_WORDS: "no-bad-words",
  NO_CONVOLUTED_SENTENCES: "no-convoluted-sentences",
  NO_EXPLAINED_ANTONYMS: "no-explained-antonyms",
  NO_EXPLAINED_INTENSIFIERS: "no-explained-intensifiers",
  NO_HIGH_LEXICAL_DENSITY: "no-high-lexical-density",
  NO_MIXED_DIALECTS: "no-mixed-dialects",
  NO_NEGATED_CONTRASTS: "no-negated-contrasts",
  NO_NESTED_CLAUSES: "no-nested-clauses",
  NO_NOUN_CLUSTERS: "no-noun-clusters",
  NO_PASSIVE_SENTENCES: "no-passive-sentences",
  NO_SIMILES: "no-similes",
  NO_SPECIAL_PUNCTUATION: "no-special-punctuation",
  NO_UNMARKED_RELATIVES: "no-unmarked-relatives",
} as const;

export type ErrorId = (typeof ErrorId)[keyof typeof ErrorId];

export type Suggestion = {
  range: [number, number];
  text: string;
};

export type LintError = {
  id: ErrorId;
  start: number;
  end: number;
  message: string;
  suggestions?: Suggestion[];
  case?: string;
};

export const CaseRuleId = {
  NO_BAD_WORDS: ErrorId.NO_BAD_WORDS,
  NO_EXPLAINED_ANTONYMS: ErrorId.NO_EXPLAINED_ANTONYMS,
  NO_EXPLAINED_INTENSIFIERS: ErrorId.NO_EXPLAINED_INTENSIFIERS,
} as const;

export type CaseRuleId = (typeof CaseRuleId)[keyof typeof CaseRuleId];

export type IgnoredCases = { [id in CaseRuleId]?: string[] };

export type LexicalDensityOptions = {
  nounPercentage?: number;
  adjectivePercentage?: number;
  nounAndAdjectivePercentage?: number;
  minimumWords?: number;
};

export type RuleOptions = {
  "no-high-lexical-density": LexicalDensityOptions;
};

export type Config = {
  locale?: string;
  ignore?: IgnoredCases;
} & {
  [id in ErrorId]?: id extends keyof RuleOptions
    ? boolean | RuleOptions[id]
    : boolean;
};

export type Rule = (sentences: ParsedToken[][], config: Config) => LintError[];

export type Query = {
  selector: string;
  suggestions?: string[];
  message: string;
  id: ErrorId;
  case?: string;
};

export type RuleMatch = {
  selectorIndex: number;
  tree: number[];
};

export type CompiledQueries = {
  queries: Query[];
  parsed: cssWhat.Selector[][][];
  required: string[][][];
  index: Map<string, number[]>;
  always: number[];
};

export type Node = Record<string, unknown> &
  ParsedToken & {
    tagName?: string;
    feats: Record<string, unknown>;
    misc: Record<string, unknown>;
  };

export type NodeTestFunction = (node: Node) => boolean;

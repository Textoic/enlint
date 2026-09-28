import { antonyms } from "./antonyms.js";
import { defaults } from "./index.js";
import {
  categoryMessages,
  entries,
  type BadWordCategory,
} from "./rules/no-bad-words.js";
import { intensifierDictionary } from "./rules/no-explained-intensifiers.js";
import { CaseRuleId, ErrorId } from "./types/index.js";

export type RuleExample = { text: string; suggestion?: string };

export type RuleInfo = {
  id: ErrorId;
  name: string;
  summary: string;
  description: string;
  enabledByDefault: boolean;
  examples: RuleExample[];
  hasCases: boolean;
};

export type RuleCase = {
  key: string;
  label: string;
  suggestions: string[];
  group?: string;
};

type RuleText = Omit<RuleInfo, "id" | "enabledByDefault" | "hasCases">;

const ruleTexts: Record<ErrorId, RuleText> = {
  [ErrorId.NO_ABSOLUTE_PHRASES]: {
    name: "Absolute phrases",
    summary: "A noun and a participle hung off the main clause.",
    description:
      "Absolute phrases put the modifier ahead of the action and make the reader wait for the point. Turn the phrase into its own clause or sentence.",
    examples: [
      {
        text: "His hands shaking, he opened the envelope.",
        suggestion: "His hands shook as he opened the envelope.",
      },
    ],
  },
  [ErrorId.NO_BAD_SENTENCE_STRUCTURES]: {
    name: "Bad sentence structures",
    summary: "Stock shapes such as “not just X but Y”.",
    description:
      "Some sentence shapes are fillers: they announce a contrast or a build-up that the content does not need. State both halves plainly.",
    examples: [
      {
        text: "Will you be my partner, not just in life, but in every sense of the word?",
      },
    ],
  },
  [ErrorId.NO_BAD_WORDS]: {
    name: "Bad words",
    summary: "Clichés, filler, hedges and words common in AI writing.",
    description:
      "A list of words and expressions that dilute prose: clichés, empty phrases, hedges, formalisms, redundancies and the vocabulary that marks machine-written text. Most come with a shorter replacement.",
    examples: [
      { text: "We need to delve into the data.", suggestion: "explore" },
      { text: "At this point in time we agree.", suggestion: "now" },
      { text: "It was an added bonus.", suggestion: "a bonus" },
    ],
  },
  [ErrorId.NO_EXPLAINED_ANTONYMS]: {
    name: "Explained antonyms",
    summary: "“not X” where a single word says the same.",
    description:
      "A negated word makes the reader build the opposite themselves. When a clear antonym exists, use it. Gradable or ambiguous words are left alone.",
    examples: [
      { text: "I do not agree.", suggestion: "disagree" },
      { text: "The door was not visible.", suggestion: "invisible" },
    ],
  },
  [ErrorId.NO_EXPLAINED_INTENSIFIERS]: {
    name: "Explained intensifiers",
    summary: "“very X” where a stronger word exists.",
    description:
      "“Very” and “really” prop up a weak word. Replace the pair with a word that carries the intensity on its own.",
    examples: [
      { text: "The room was very dirty.", suggestion: "filthy" },
      { text: "The results were really bad.", suggestion: "awful" },
    ],
  },
  [ErrorId.NO_HIGH_LEXICAL_DENSITY]: {
    name: "High lexical density",
    summary: "Sentences made mostly of nouns and adjectives.",
    description:
      "Past a point the reader holds too many things at once. The usual cause is a verb turned into a noun and given modifiers. Give the action back to a verb.",
    examples: [
      {
        text: "The implementation of the new policy framework required extensive consultation with regional stakeholder groups and a comprehensive assessment methodology drawn from prior work.",
      },
    ],
  },
  [ErrorId.NO_MIXED_DIALECTS]: {
    name: "Mixed dialects",
    summary: "British and American spellings in the same text.",
    description:
      "Pick one dialect and keep to it. The rule follows the configured locale.",
    examples: [{ text: "The colour of the car park.", suggestion: "color" }],
  },
  [ErrorId.NO_NEGATED_CONTRASTS]: {
    name: "Negated contrasts",
    summary: "Defining something by what it is not.",
    description:
      "“X, not Y” and “not just X, but also Y” make the reader hold the wrong idea before discarding it. Keep the positive half.",
    examples: [
      {
        text: "The span is the phrase, not a stray overlap.",
        suggestion: "The span is the phrase.",
      },
    ],
  },
  [ErrorId.NO_NESTED_CLAUSES]: {
    name: "Nested clauses",
    summary: "Clauses stacked between a subject and its verb.",
    description:
      "Two or more unfinished clauses between a subject and its verb force the reader to hold every subject until the verbs arrive.",
    examples: [
      {
        text: "The report that the analyst who the board hired drafted was lost.",
      },
    ],
  },
  [ErrorId.NO_NOUN_CLUSTERS]: {
    name: "Noun clusters",
    summary: "Four or more nouns in a row.",
    description:
      "Long chains of nouns hide how the words relate. Break the chain with prepositions or a verb (ASD-STE100 rule 2.1).",
    examples: [{ text: "Runway light connection resistance calibration." }],
  },
  [ErrorId.NO_PASSIVE_SENTENCES]: {
    name: "Passive sentences",
    summary: "Full passives, with an active rewrite.",
    description:
      "A passive with its agent present hides who acted until the end. Put the actor first.",
    examples: [
      {
        text: "The piano is played by John.",
        suggestion: "John plays the piano.",
      },
    ],
  },
  [ErrorId.NO_SIMILES]: {
    name: "Similes",
    summary: "Comparisons with “like” or “as”.",
    description:
      "A simile asks the reader to translate an image back into a fact. Say the fact.",
    examples: [{ text: "He fought like a lion." }],
  },
  [ErrorId.NO_SPECIAL_PUNCTUATION]: {
    name: "Special punctuation",
    summary: "Em and en dashes between words.",
    description:
      "The em dash is the single most model-skewed mark in modern prose. Use a comma, a colon or a full stop instead.",
    examples: [
      { text: "The result was clear — we had won.", suggestion: ", " },
    ],
  },
};

const caseRuleIds: string[] = Object.values(CaseRuleId);

export const hasCases = (id: string): id is CaseRuleId =>
  caseRuleIds.includes(id);

export const ruleCatalog: RuleInfo[] = Object.values(ErrorId).map((id) => ({
  id,
  ...ruleTexts[id],
  enabledByDefault: defaults[id] === true,
  hasCases: hasCases(id),
}));

export const ruleInfo = (id: string): RuleInfo | undefined =>
  ruleCatalog.find((rule) => rule.id === id);

const categoryNames: Record<BadWordCategory, string> = {
  ai: "AI writing",
  cliche: "Clichés",
  empty: "Empty phrases",
  "explained-verb": "Explained verbs",
  formalism: "Formalisms",
  hedge: "Hedges",
  opinion: "Opinion markers",
  redundancy: "Redundancies",
  variation: "Inelegant variations",
};

const readableSuggestion = (suggestion: string) =>
  suggestion.replace(/:inflect\((\w+)\)/gu, "$1") || "(delete)";

const badWordCases = (): RuleCase[] =>
  entries.map(({ phrase, category, suggestions, message }) => ({
    key: phrase,
    label: phrase,
    suggestions: suggestions?.map(readableSuggestion) ?? [
      message ?? categoryMessages[category],
    ],
    group: categoryNames[category],
  }));

const intensifierCases = (): RuleCase[] =>
  Object.entries(intensifierDictionary).map(([lemma, suggestions]) => ({
    key: lemma,
    label: `very ${lemma}`,
    suggestions,
  }));

const antonymCases = (): RuleCase[] =>
  Object.entries(antonyms).map(([lemma, byTag]) => ({
    key: lemma,
    label: `not ${lemma}`,
    suggestions: [...new Set(Object.values(byTag))],
  }));

const casesByRule: Record<CaseRuleId, () => RuleCase[]> = {
  [CaseRuleId.NO_BAD_WORDS]: badWordCases,
  [CaseRuleId.NO_EXPLAINED_ANTONYMS]: antonymCases,
  [CaseRuleId.NO_EXPLAINED_INTENSIFIERS]: intensifierCases,
};

export const casesOf = (id: string): RuleCase[] =>
  hasCases(id) ? casesByRule[id]() : [];

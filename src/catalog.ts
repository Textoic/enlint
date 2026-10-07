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
      {
        text: "Her voice trembling, she read the verdict aloud.",
        suggestion: "Her voice trembled as she read the verdict aloud.",
      },
      {
        text: "Its engine roaring, the truck climbed the hill.",
        suggestion: "The truck's engine roared as it climbed the hill.",
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
      { text: "It is not just a tool, but a way of life." },
      { text: "This is not merely a bug, but a design flaw." },
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
  [ErrorId.NO_CONVOLUTED_SENTENCES]: {
    name: "Convoluted sentences",
    summary: "More than three clause joins in one sentence.",
    description:
      "Each “and”, “so”, “because”, “who” or “whether” hangs another clause on the sentence. Past three, the reader loses which clause explains which. The length of the sentence is not what is counted.",
    examples: [
      {
        text: "He stayed because the car that she drove broke down, and nobody knew when the bus left or whether it ran.",
      },
      {
        text: "She called when the train stopped, but he was out because the dog that he walks had run off.",
      },
      {
        text: "We paid what they asked, and the car that we bought broke down before we got home, so I wrote to them.",
      },
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
      { text: "The plan is not legal.", suggestion: "illegal" },
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
      { text: "It was very cold outside.", suggestion: "freezing" },
    ],
  },
  [ErrorId.NO_HIGH_LEXICAL_DENSITY]: {
    name: "High lexical density",
    summary: "Long, noun-heavy sentences with several nominalizations.",
    description:
      "A high share of nouns and adjectives alone does not make a sentence difficult. This rule also looks for several known action nouns, a prepositional complement, and a finite verb. It skips enumerations. Try expressing the actions as verbs.",
    examples: [
      {
        text: "The implementation of the new policy framework required extensive consultation with regional stakeholder groups and a comprehensive assessment methodology drawn from prior work.",
      },
      {
        text: "The evaluation of the proposed modification to the regional distribution network necessitated careful consideration of infrastructure investment requirements and the prioritization of maintenance activities.",
      },
      {
        text: "Successful completion of the migration depended on the standardization of data collection procedures and the elimination of redundant verification steps across departments.",
      },
    ],
  },
  [ErrorId.NO_MIXED_DIALECTS]: {
    name: "Mixed dialects",
    summary: "British and American spellings in the same text.",
    description:
      "Pick one dialect and keep to it. The rule follows the configured locale.",
    examples: [
      { text: "The colour of the car park.", suggestion: "color" },
      {
        text: "We organised the program around the color theme.",
        suggestion: "organized",
      },
      { text: "Our favourite color is gray.", suggestion: "favorite" },
    ],
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
      { text: "It's a feature, not a bug.", suggestion: "It's a feature." },
      {
        text: "The problem is the process, not the people.",
        suggestion: "The problem is the process.",
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
      { text: "The house that the man who the bank sued built was sold." },
      {
        text: "The email that the intern who the manager trained sent was deleted.",
      },
    ],
  },
  [ErrorId.NO_NOUN_CLUSTERS]: {
    name: "Noun clusters",
    summary: "Four or more nouns in a row.",
    description:
      "Long chains of nouns hide how the words relate. Break the chain with prepositions or a verb (ASD-STE100 rule 2.1).",
    examples: [
      { text: "Runway light connection resistance calibration." },
      { text: "The customer account data migration schedule slipped." },
      { text: "Check the engine oil pressure warning light." },
    ],
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
      {
        text: "The report was written by the committee.",
        suggestion: "The committee wrote the report.",
      },
      {
        text: "The decision was made by the board.",
        suggestion: "The board made the decision.",
      },
    ],
  },
  [ErrorId.NO_SIMILES]: {
    name: "Similes",
    summary: "Comparisons with “like” or “as”.",
    description:
      "A simile asks the reader to translate an image back into a fact. Say the fact.",
    examples: [
      { text: "He fought like a lion." },
      { text: "He slept like a baby." },
      { text: "The deadline loomed like a storm cloud." },
    ],
  },
  [ErrorId.NO_SPECIAL_PUNCTUATION]: {
    name: "Special punctuation",
    summary: "Em and en dashes between words.",
    description:
      "The em dash is the single most model-skewed mark in modern prose. Use a comma, a colon or a full stop instead.",
    examples: [
      { text: "The result was clear — we had won.", suggestion: ", " },
      { text: "We had one goal — ship by Friday.", suggestion: ", " },
      { text: "Read pages 10–20 before class.", suggestion: "-" },
    ],
  },
  [ErrorId.NO_UNMARKED_RELATIVES]: {
    name: "Unmarked relatives",
    summary: "A relative clause with no “that” in front of it.",
    description:
      "A clause that describes the noun before it, with its own subject and nothing to mark where it starts. The reader takes the two nouns for one phrase until the verb arrives. Put “that” between them.",
    examples: [
      {
        text: "You work inside rules another person can check.",
        suggestion: "You work inside rules that another person can check.",
      },
      {
        text: "The book you asked for is here.",
        suggestion: "The book that you asked for is here.",
      },
      {
        text: "She kept the letters he wrote.",
        suggestion: "She kept the letters that he wrote.",
      },
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

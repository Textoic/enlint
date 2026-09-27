import * as cssWhat from "css-what";
import queriesToErrors from "../src/queries-to-errors.js";
import parse from "./nlp.js";
import { asQuery, type BadWordEntry } from "../src/rules/no-bad-words.js";

export type Example = { text: string; fixed: string };

export const attributes: Record<string, string[] | null> = {
  form: null,
  lemma: null,
  xpos: ["NOUN", "VERB", "ADJ", "ADV", "MARK", "PUNCT", "INTJ", "X"],
  AdpType: ["Prep", "Post"],
  Case: ["Nom", "Acc"],
  Mood: ["Pot", "Nec", "Cnd"],
  Number: ["Sing", "Plur"],
  Person: ["1", "2", "3"],
  PronType: ["Art", "Dem", "Prs", "Tot", "Neg", "Rel", "Ind"],
  PunctType: [
    "Peri",
    "Qest",
    "Excl",
    "Quot",
    "Brck",
    "Comm",
    "Colo",
    "Semi",
    "Dash",
  ],
  Tense: ["Pres", "Past"],
  VerbForm: ["Fin", "Part"],
  at: null,
  children: null,
};

export const eachAttribute = (
  selectors: cssWhat.Selector[][],
  visit: (name: string, value: string) => void,
) => {
  selectors.forEach((selector) =>
    selector.forEach((token) => {
      if (token.type === cssWhat.SelectorType.Attribute) {
        visit(token.name, token.value);
      } else if (
        token.type === cssWhat.SelectorType.Pseudo &&
        Array.isArray(token.data) &&
        token.data.length > 0 &&
        typeof token.data[0] !== "string"
      ) {
        eachAttribute(token.data as cssWhat.Selector[][], visit);
      }
    }),
  );
};

export const selectorProblems = (selector: string): string[] => {
  let parsed: cssWhat.Selector[][];
  try {
    parsed = cssWhat.parse(selector);
  } catch (error) {
    return [
      `the selector is not valid css-select syntax: ${
        error instanceof Error ? error.message : String(error)
      }`,
    ];
  }

  const problems: string[] = [];
  eachAttribute(parsed, (name, value) => {
    if (!(name in attributes)) {
      problems.push(
        `[${name}] is not an attribute the input contract defines; the only ones available are ${Object.keys(
          attributes,
        ).join(", ")}`,
      );
      return;
    }

    const allowed = attributes[name];
    if (allowed != null && !allowed.includes(value)) {
      problems.push(
        `[${name}=${value}] is not a legal value; ${name} must be one of ${allowed.join(", ")}`,
      );
    }
  });
  return problems;
};

export type Draft = BadWordEntry & { examples: Example[] };

export const run = (entry: BadWordEntry, text: string) =>
  queriesToErrors([asQuery(entry)], parse(text));

const normalize = (text: string) =>
  text
    .replace(/\s+/gu, " ")
    .replace(/\s+([,.;:!?])/gu, "$1")
    .trim()
    .toLowerCase();

export const applySuggestion = (
  text: string,
  {
    range: [start, end],
    text: replacement,
  }: { range: [number, number]; text: string },
) => `${text.slice(0, start)}${replacement}${text.slice(end)}`;

const ARTIFACTS: [string, RegExp][] = [
  [
    "an article that disagrees with the word after it",
    /\b[Aa]n\s+(?!hour|honest|honou?r|heir)[bcdfgjklmnpqrstvwxyz][a-z]|\b[Aa]\s+(?!one\b|once\b|eu)[aeio][a-z]/u,
  ],
  ["two determiners in a row", /\b(?:the|a|an)\s+(?:the|a|an)\b/iu],
  ["a sentence starting with punctuation", /^\s*[,;:.]/u],
  ["a stray or doubled comma", /\s,|,\s*,/u],
  ["a doubled space", /\s{2}/u],
  ["a stranded complementizer at the start", /^\s*(?:that|which|whether)\b/iu],
];

export const artifacts = (text: string) =>
  ARTIFACTS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);

export const introducedArtifacts = (before: string, after: string) => {
  const had = new Set(artifacts(before));
  return artifacts(after).filter((artifact) => !had.has(artifact));
};

export type ExampleResult = {
  example: Example;
  problems: string[];
  matched?: string;
  produced: string[];
};

const anchors = (phrase: string) => {
  const tokens = parse(
    phrase.replace(/\([^)]*\)/gu, " ").replace(/[/*]/gu, " "),
  ).flat();
  const words = (subset: typeof tokens) =>
    new Set(
      subset.flatMap(({ form, lemma }) =>
        [form, lemma].filter(Boolean).map((word) => word!.toLowerCase()),
      ),
    );

  const content = words(
    tokens.filter(
      ({ xpos, feats }) =>
        xpos !== "MARK" && xpos !== "PUNCT" && feats.PronType == null,
    ),
  );

  return content.size > 0 ? content : words(tokens);
};

const anchorProblem = (
  entry: Draft,
  matched: string,
  phraseAnchors: Set<string>,
) => {
  const spanWords = new Set(
    parse(matched)
      .flat()
      .flatMap(({ form, lemma }) =>
        [form, lemma].filter(Boolean).map((word) => word!.toLowerCase()),
      ),
  );
  return [...phraseAnchors].some((word) => spanWords.has(word))
    ? []
    : [
        `the selector matched "${matched}", which shares no word with "${entry.phrase}". It is firing on something else in the sentence.`,
      ];
};

const fixProblem = (entry: Draft, example: Example, produced: string[]) => {
  if (!entry.suggestions) {
    return normalize(example.fixed) === normalize(example.text)
      ? [
          `the fix for "${example.text}" is identical to the original, so the example does not show the advice being followed.`,
        ]
      : [];
  }

  return produced.some(
    (result) => normalize(result) === normalize(example.fixed),
  )
    ? []
    : [
        `applying the replacement to "${example.text}" gives ${produced
          .map((result) => `"${result.trim()}"`)
          .join(
            " or ",
          )}, but the example claims the fix is "${example.fixed}". Either the span is wrong (it runs from the leftmost matched token to the rightmost, swallowing anything in between) or the replacement is.`,
      ];
};

const escapeProblem = (entry: Draft, example: Example) =>
  run(entry, example.fixed).length > 0
    ? [
        `the fixed text "${example.fixed}" still matches the rule, so the rewrite does not escape it.`,
      ]
    : [];

const verifyExample = (
  entry: Draft,
  example: Example,
  phraseAnchors: Set<string>,
): ExampleResult => {
  const problems: string[] = [];

  const broken = artifacts(example.text);
  if (broken.length > 0) {
    return {
      example,
      produced: [],
      problems: [
        `the sentence "${example.text}" is not grammatical: it has ${broken.join(
          " and ",
        )}. If the expression starts with "a", "an" or "the", that article is part of how the expression is written down, not something to insert on top of whatever article the sentence already has.`,
      ],
    };
  }

  const errors = run(entry, example.text);
  if (errors.length === 0) {
    return {
      example,
      produced: [],
      problems: [
        `the selector does not match "${example.text}". Either the example does not really use the phrase, or the selector expects a tree shape artisan does not produce for it.`,
      ],
    };
  }

  const [error] = errors;
  const matched = example.text.slice(error.start, error.end);
  const produced = (error.suggestions ?? []).map((suggestion) =>
    applySuggestion(
      example.text,
      suggestion as { range: [number, number]; text: string },
    ),
  );

  problems.push(
    ...anchorProblem(entry, matched, phraseAnchors),
    ...fixProblem(entry, example, produced),
    ...escapeProblem(entry, example),
  );

  return { example, problems, matched, produced };
};

export const verifyExamples = (
  entry: BadWordEntry,
  examples: Example[],
): ExampleResult[] => {
  const phraseAnchors = anchors(entry.phrase);
  return examples.map((example) =>
    verifyExample({ ...entry, examples }, example, phraseAnchors),
  );
};

export type Verification = {
  problems: string[];
  results: ExampleResult[];
  ok: boolean;
};

export default (entry: Draft): Verification => {
  const broken = selectorProblems(entry.selector);
  const problems = [...broken];
  if (!entry.suggestions && !entry.message) {
    problems.push(
      "the entry offers neither a replacement nor a message, so it would fall back to the category default. Pick one.",
    );
  }

  if (entry.suggestions && entry.message) {
    problems.push(
      "the entry has both a replacement and a message. Use suggestions when the whole span can be swapped mechanically, and a message when the fix reaches outside the span, but not both.",
    );
  }

  if (entry.examples.length < 2) {
    problems.push(
      `only ${entry.examples.length} example given; every entry needs at least two, and they should differ in more than their nouns.`,
    );
  }

  const results =
    broken.length > 0 ? [] : verifyExamples(entry, entry.examples);

  return {
    problems,
    results,
    ok:
      problems.length === 0 &&
      results.length > 0 &&
      results.every(({ problems }) => problems.length === 0),
  };
};

export const report = ({ problems, results }: Verification) =>
  [
    ...problems.map((problem) => `- ${problem}`),
    ...results.flatMap(({ example, problems }) =>
      problems.map((problem) => `- example "${example.text}": ${problem}`),
    ),
  ].join("\n");

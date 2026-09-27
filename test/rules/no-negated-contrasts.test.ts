import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint, { defaults } from "../../src/index.js";
import nlp from "../nlp.js";
import type { LintError } from "../../src/types/index.js";

const config = {
  ...defaults,
  "no-bad-sentence-structures": false,
  "no-bad-words": false,
  "no-explained-antonyms": false,
  "no-high-lexical-density": false,
};

const tests = [
  ["", [], "an empty string"],
  ["The report was not lost.", [], "a plain negation with nothing to contrast"],
  [
    "He left, not knowing what to do.",
    [],
    "a negated participle, which is an adjunct rather than a contrast",
  ],
  [
    "If the article does not need to be inside the span, leave it out; it is not what makes the phrase bad.",
    [],
    "a semicolon that does not follow the negated chunk",
  ],
  [
    "Readers do not need to know that someone is as busy as a bee, it has been said a million times.",
    [],
    "a comma splice whose second clause restates nothing",
  ],
  [
    "the reported span is the phrase, not a stray overlap elsewhere in the sentence",
    [
      {
        id: "no-negated-contrasts",
        start: 31,
        end: 78,
        suggestions: [{ range: [31, 78], text: "" }],
      },
    ],
    "a negated tail, which is deleted",
  ],
  [
    "We need speed, not perfection.",
    [
      {
        id: "no-negated-contrasts",
        start: 13,
        end: 29,
        suggestions: [{ range: [13, 29], text: "" }],
      },
    ],
    "a negated tail before the full stop",
  ],
  [
    "The report, not the memo, was lost.",
    [
      {
        id: "no-negated-contrasts",
        start: 10,
        end: 25,
        suggestions: [{ range: [10, 25], text: "" }],
      },
    ],
    "a negated aside between two commas",
  ],
  [
    "Do not worry, it will be fine.",
    [],
    "an imperative followed by a reason, which restates nothing",
  ],
  [
    "He can't drive, but he can ride a bike.",
    [],
    "two clauses joined by but, where the second has its own subject",
  ],
  [
    "The plan is not finished, it needs another week.",
    [],
    "a comma splice whose clauses have different subjects",
  ],
  [
    "It stores objects that have spatial extent (AABBs, not points) for several reasons.",
    [
      {
        id: "no-negated-contrasts",
        start: 49,
        end: 61,
        suggestions: [{ range: [49, 61], text: "" }],
      },
    ],
    "a negated tail inside brackets, which stops at the bracket",
  ],
  [
    "She brought coffee, not tea, to the meeting this morning.",
    [
      {
        id: "no-negated-contrasts",
        start: 18,
        end: 28,
        suggestions: [{ range: [18, 28], text: "" }],
      },
    ],
    "a negated aside whose closing comma hangs outside its subtree",
  ],
  [
    "It isn't the deficit, but the debt.",
    [{ id: "no-negated-contrasts", start: 3, end: 34 }],
    "a contracted negation, which is reported from the whole word",
  ],
  [
    "The decision rests with the voters, not the judges",
    [
      {
        id: "no-negated-contrasts",
        start: 34,
        end: 50,
        suggestions: [{ range: [34, 50], text: "" }],
      },
    ],
    "a negated tail inside a prepositional phrase",
  ],
  [
    "He is not just a teacher, but also a coach",
    [{ id: "no-negated-contrasts", start: 6, end: 42 }],
    "not just X, but also Y",
  ],
  [
    "The village is not just quaint, but also cheap.",
    [{ id: "no-negated-contrasts", start: 15, end: 46 }],
    "not just X, but also Y where the minimizer hangs off the adjective",
  ],
  [
    "This is not merely a setback but a catastrophe.",
    [{ id: "no-negated-contrasts", start: 8, end: 46 }],
    "not merely X but Y, with no comma",
  ],
  [
    "It is not the deficit, but the debt.",
    [{ id: "no-negated-contrasts", start: 6, end: 35 }],
    "not X, but Y, with nothing minimizing X",
  ],
  [
    "The thing that blows up is not the deficit; it's the debt",
    [{ id: "no-negated-contrasts", start: 27, end: 57 }],
    "a restatement after a semicolon, which artisan splits into two sentences",
  ],
  [
    "The problem is not the cost, it's the delay.",
    [{ id: "no-negated-contrasts", start: 15, end: 43 }],
    "a restatement after a comma",
  ],
  [
    "She did not walk, she ran.",
    [{ id: "no-negated-contrasts", start: 8, end: 25 }],
    "a restatement whose contrast is a verb",
  ],
] as [text: string, errors: LintError[], name: string][];

const shapes = [
  [
    "We need speed, not perfection.",
    "Cut the negated tail and keep what is true",
    "the negated tail",
  ],
  [
    "He is not just a teacher, but also a coach",
    'Instead of "not just X, but also Y"',
    "the minimized contrast",
  ],
  [
    "The problem is not the cost, it's the delay.",
    "Say what the thing is instead of what it is not",
    "the restatement",
  ],
] as [text: string, opening: string, name: string][];

describe("no-negated-contrasts messages", () => {
  shapes.forEach(([text, opening, name]) => {
    it(`explains ${name}`, () => {
      const [error] = lint(nlp(text), config);
      assert.ok(
        error?.message.startsWith(opening),
        `expected the message for "${text}" to start with "${opening}", got "${error?.message}"`,
      );
    });
  });
});

describe("no-negated-contrasts", () => {
  tests.forEach(([text, expected, name]) => {
    it(name, () => {
      const actual = lint(nlp(text), config);
      assert.deepEqual(
        actual,
        expected.map((error, index) => ({
          ...error,
          message: actual[index]?.message,
        })),
      );
    });
  });
});

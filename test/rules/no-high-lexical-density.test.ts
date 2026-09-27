import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint, { defaults } from "../../src/index.js";
import nlp from "../nlp.js";
import type { Config, LintError } from "../../src/types/index.js";

const off = {
  ...defaults,
  "no-bad-words": false,
  "no-noun-clusters": false,
  "no-passive-sentences": false,
};

const config: Config = { ...off, "no-high-lexical-density": true };

const measuring: Config = {
  ...off,
  "no-high-lexical-density": { minimumWords: 8 },
};

const tests = [
  ["", [], "an empty string", config],
  [
    "We built the thing and it works well enough for now.",
    [],
    "a sentence carried by verbs",
    config,
  ],
  [
    "Costs rose.",
    [],
    "a short sentence, which the minimum word count spares",
    config,
  ],
  [
    "The implementation of the new policy framework required extensive consultation with regional stakeholder groups.",
    [{ id: "no-high-lexical-density", start: 0, end: 111 }],
    "too many nouns",
    measuring,
  ],
  [
    "Rapid organizational transformation demands robust strategic alignment across diverse operational units.",
    [{ id: "no-high-lexical-density", start: 0, end: 103 }],
    "too many nouns and too many adjectives",
    measuring,
  ],
  [
    "We built the thing and it works well enough for now.",
    [{ id: "no-high-lexical-density", start: 0, end: 51 }],
    "a plain sentence that a strict threshold rejects",
    {
      ...off,
      "no-high-lexical-density": { nounPercentage: 5, minimumWords: 8 },
    },
  ],
  [
    "The implementation of the new policy framework required extensive consultation with regional stakeholder groups.",
    [],
    "a dense sentence that a loose threshold allows",
    {
      ...off,
      "no-high-lexical-density": {
        minimumWords: 8,
        nounPercentage: 90,
        adjectivePercentage: 90,
        nounAndAdjectivePercentage: 90,
      },
    },
  ],
  [
    "The implementation of the new policy framework required extensive consultation with regional stakeholder groups.",
    [],
    "a dense sentence too short for the default floor to measure",
    config,
  ],
  [
    "The implementation of the new policy framework required extensive consultation with regional stakeholder groups and a comprehensive assessment methodology drawn from prior work.",
    [{ id: "no-high-lexical-density", start: 0, end: 176 }],
    "a dense sentence long enough for the default floor to measure",
    config,
  ],
  [
    "Costs rose.",
    [{ id: "no-high-lexical-density", start: 0, end: 10 }],
    "a short sentence that a lowered minimum measures",
    { ...off, "no-high-lexical-density": { minimumWords: 2 } },
  ],
] as [text: string, errors: LintError[], name: string, config: Config][];

describe("no-high-lexical-density", () => {
  tests.forEach(([text, expected, name, given]) => {
    it(name, () => {
      const actual = lint(nlp(text), given);
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

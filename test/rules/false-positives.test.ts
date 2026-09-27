import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint from "../../src/index.js";
import nlp from "../trained-nlp.js";
import fallback from "../nlp.js";
import { cases } from "../false-positive-cases.js";

const regressions = Object.entries(cases).flatMap(([rule, texts]) =>
  texts.map((text) => ({ rule, text })),
);

for (const [provider, parse] of Object.entries({ trained: nlp, fallback })) {
  describe(`reported false positives with ${provider} tagging`, () => {
    regressions.forEach(({ rule, text }) => {
      it(`${rule}: ${text}`, () => {
        const errors = lint(parse(text), { [rule]: true });
        assert.deepEqual(
          errors.filter(({ id }) => id === rule),
          [],
        );
      });
    });
  });
}

const retained = [
  ["no-negated-contrasts", "He did not just act, but also promised."],
  [
    "no-high-lexical-density",
    "The implementation of the new policy framework required extensive consultation with regional stakeholder groups and a comprehensive assessment methodology drawn from prior work.",
  ],
  ["no-absolute-phrases", "His sword drawn, he waited."],
  ["no-absolute-phrases", "He typed a reply, his fingers trembling slightly"],
  [
    "no-nested-clauses",
    "The report that the analyst who the board hired drafted was lost",
  ],
  [
    "no-nested-clauses",
    "The plan for the report that the analyst who the board hired drafted was lost",
  ],
  ["no-noun-clusters", "The customer service quality control team met today."],
  ["no-negated-contrasts", "She did not walk, she ran."],
  ["no-negated-contrasts", "He is not just a teacher, but also a coach"],
  ["no-negated-contrasts", "We need speed, not perfection."],
];

describe("retained positives with trained tagging", () => {
  retained.forEach(([rule, text]) => {
    it(`${rule}: ${text}`, () => {
      const errors = lint(nlp(text), { [rule]: true });
      assert.equal(errors.filter(({ id }) => id === rule).length, 1);
    });
  });
});

const negativeRestatements = [
  "He did not walk, he did not run.",
  "The problem is not the cost; it is not the delay.",
  "The problem is not the cost; it is never the delay.",
  "They did not resist, but were still punished.",
];

describe("negative and concessive clauses", () => {
  negativeRestatements.forEach((text) => {
    it(text, () => {
      const errors = lint(nlp(text), { "no-negated-contrasts": true });
      assert.deepEqual(
        errors.filter(({ id }) => id === "no-negated-contrasts"),
        [],
      );
    });
  });
});

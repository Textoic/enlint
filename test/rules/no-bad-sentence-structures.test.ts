import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint, { defaults } from "../../src/index.js";
import nlp from "../nlp.js";
import type { LintError } from "../../src/types/index.js";

const config = {
  ...defaults,
  "no-negated-contrasts": false,
  "no-high-lexical-density": false,
  "no-bad-words": false,
};

const tests = [
  ["", [], "an empty string"],
  [
    "Will you be my partner, not just in life, but in every sense of the word?",
    [
      {
        start: 28,
        end: 73,
        message:
          "Instead of 'not just X but Y', rewrite this section to say 'X and Y'.",
        id: "no-bad-sentence-structures",
      },
    ],
    "not just in X but in Y",
  ],
] as [text: string, errors: LintError[], name: string][];

describe("no-bad-sentence-structures", () => {
  tests.forEach(([text, expected, name]) => {
    it(name, () => {
      const actual = lint(nlp(text), config);
      assert.deepEqual(
        actual,
        expected.map((error, i) => ({ ...error, message: actual[i]?.message })),
      );
    });
  });
});

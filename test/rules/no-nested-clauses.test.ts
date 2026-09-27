import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint, { defaults } from "../../src/index.js";
import nlp from "../nlp.js";
import type { Config, LintError } from "../../src/types/index.js";

const config: Config = {
  ...defaults,
  "no-bad-words": false,
  "no-passive-sentences": false,
  "no-nested-clauses": true,
};

const tests = [
  ["", [], "an empty string"],
  ["The report was lost", [], "a subject next to its verb"],
  [
    "The report that the analyst drafted was lost",
    [],
    "one clause between the subject and its verb",
  ],
  [
    "The report that the analyst who the board hired drafted was lost",
    [{ id: "no-nested-clauses", start: 0, end: 55 }],
    "two clauses between the subject and its verb",
  ],
  [
    "We lost the report that the analyst who the board hired drafted",
    [],
    "the same clauses after the verb, where they cost the reader nothing",
  ],
  [
    "The letter that the clerk who the mayor trusted signed arrived late",
    [{ id: "no-nested-clauses", start: 0, end: 54 }],
    "two clauses with a different verb and subject",
  ],
] as [text: string, errors: LintError[], name: string][];

describe("no-nested-clauses", () => {
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

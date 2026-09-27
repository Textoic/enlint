import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint, { defaults } from "../../src/index.js";
import nlp from "../nlp.js";
import type { LintError } from "../../src/types/index.js";

const tests = [
  ["", [], "an empty string"],
  ["steel is optional", [], "one noun"],
  ["stainless steel is optional", [], "two nouns"],
  ["steel protection strips are optional", [], "three nouns"],
  [
    "stainless steel protection strips are optional",
    [{ id: "no-noun-clusters", start: 0, end: 33 }],
    "four nouns",
  ],
  [
    "stainless steel corrosion protection strips are optional",
    [{ id: "no-noun-clusters", start: 0, end: 43 }],
    "five nouns",
  ],
] as [text: string, errors: LintError[], name: string][];

const config = { ...defaults, "no-noun-clusters": true };

describe("no-noun-clusters", () => {
  tests.forEach(([text, expected, name]) => {
    it(name, () => {
      const actual = lint(nlp(text), config);
      assert.deepEqual(
        actual,
        expected.map((token, i) => ({ ...token, message: actual[i].message })),
      );
    });
  });
});

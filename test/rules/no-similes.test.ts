import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint from "../../src/index.js";
import nlp from "../nlp.js";
import type { LintError } from "../../src/types/index.js";

const tests = [
  ["", [], "an empty string"],
  ["I like that", [], "like as a verb"],
  ["I feel like a juggler", [], "feel+like are a valid phrasal verb"],
  ["like a hurricane", [], "standalone simile without verb is valid"],
  [
    "he was targeted like a missile",
    [{ id: "no-similes", start: 16, end: 30 }],
    "actual similes",
  ],
] as [text: string, errors: LintError[], name: string][];

describe("no-similes", () => {
  tests.forEach(([text, expected, name]) => {
    it(name, () => {
      const actual = lint(nlp(text));
      assert.deepEqual(
        actual,
        expected.map((error, i) => ({ ...error, message: actual[i]?.message })),
      );
    });
  });
});

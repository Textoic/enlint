import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint from "../../src/index.js";
import { caseFrom } from "../case-from.js";
import nlp from "../nlp.js";
import type { LintError } from "../../src/types/index.js";

const tests = [
  ["", [], "an empty string"],
  ["HUGE mistake", [], "an already intense adjective"],
  [
    "a very big mistake",
    [
      {
        id: "no-explained-intensifiers",
        start: 2,
        end: 10,
        suggestions: [{ range: [2, 10], text: "huge" }],
      },
    ],
    "intensifier + adjective that has a stronger alternative",
  ],
  [
    "your load is really heavy, fren",
    [
      {
        id: "no-explained-intensifiers",
        start: 13,
        end: 25,
        suggestions: [
          { range: [13, 25], text: "massive" },
          { range: [13, 25], text: "impenetrable" },
          { range: [13, 25], text: "powerful" },
        ],
      },
    ],
    "an adjective that has three potential suggestions",
  ],
  [
    "your art is very postmodern, haha",
    [],
    "an adjective that has no intensified replacement",
  ],
] as [text: string, errors: LintError[], name: string][];

describe("no-explained-intensifiers", () => {
  tests.forEach(([text, expected, name]) => {
    it(name, () => {
      const actual = lint(nlp(text));
      assert.deepEqual(
        actual,
        expected.map((token, i) => ({
          ...token,
          message: actual[i].message,
          ...caseFrom(actual[i]),
        })),
      );
    });
  });
});

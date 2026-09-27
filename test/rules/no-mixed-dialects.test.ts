import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint from "../../src/index.js";
import nlp from "../nlp.js";
import type { Config, LintError } from "../../src/types/index.js";

const tests = [
  ["", undefined, [], "an empty string"],
  ["it's there", { "no-mixed-dialects": true }, [], "no dialects"],
  [
    "where's my driver's license?",
    { "no-mixed-dialects": true },
    [],
    "a valid American spelling, defaulting to en-US",
  ],
  [
    "where's my driver's licence?",
    { "no-mixed-dialects": true },
    [
      {
        id: "no-mixed-dialects",
        start: 20,
        end: 27,
        suggestions: [{ range: [20, 27], text: "license" }],
      },
    ],
    "an invalid American spelling, defaulting to en-US",
  ],
  [
    "you are my favorite",
    { locale: "en-US", "no-mixed-dialects": true },
    [],
    "a valid American spelling",
  ],
  [
    "you are my favourite",
    { locale: "en-US", "no-mixed-dialects": true },
    [
      {
        id: "no-mixed-dialects",
        start: 11,
        end: 20,
        suggestions: [{ range: [11, 20], text: "favorite" }],
      },
    ],
    "an invalid American spelling",
  ],
  [
    "you are my favourite",
    { locale: "en-GB", "no-mixed-dialects": true },
    [],
    "a valid British spelling",
  ],
  [
    "you are my favorite",
    { locale: "en-GB", "no-mixed-dialects": true },
    [
      {
        id: "no-mixed-dialects",
        start: 11,
        end: 19,
        suggestions: [{ range: [11, 19], text: "favourite" }],
      },
    ],
    "an invalid British spelling",
  ],
  [
    "fairy floss",
    { locale: "en-AU", "no-mixed-dialects": true },
    [],
    "a valid Australian spelling",
  ],
  [
    "cotton candy",
    { locale: "en-AU", "no-mixed-dialects": true },
    [
      {
        id: "no-mixed-dialects",
        start: 0,
        end: 12,
        suggestions: [{ range: [0, 12], text: "fairy floss" }],
      },
    ],
    "an invalid Australian spelling",
  ],
  [
    "cancelled",
    { locale: "en-CA", "no-mixed-dialects": true },
    [],
    "a valid Canadian spelling",
  ],
  [
    "canceled",
    { locale: "en-CA", "no-mixed-dialects": true },
    [
      {
        id: "no-mixed-dialects",
        start: 0,
        end: 8,
        suggestions: [{ range: [0, 8], text: "cancelled" }],
      },
    ],
    "an invalid Canadian spelling",
  ],
] as [text: string, config: Config, errors: LintError[], name: string][];

describe("no-mixed-dialects", () => {
  tests.forEach(([text, config, expected, name]) => {
    it(name, () => {
      const actual = lint(nlp(text), config);
      assert.deepEqual(
        actual,
        expected.map((token, i) => ({ ...token, message: actual[i].message })),
      );
    });
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint from "../../src/index.js";
import nlp from "../nlp.js";
import type { LintError } from "../../src/types/index.js";

const tests = [
  ["", [], "an empty string"],
  ["not", [], "an orphaned 'not'"],
  [
    "not beautiful",
    [
      {
        start: 0,
        end: 13,
        suggestions: [{ range: [0, 13], text: "ugly" }],
        id: "no-explained-antonyms",
      },
    ],
    "only the negated antonym",
  ],
  [
    "I can't agree",
    [
      {
        start: 2,
        end: 13,
        id: "no-explained-antonyms",
        suggestions: [{ range: [2, 13], text: "disagree" }],
      },
    ],
    "a negated verb after a modal",
  ],
  ["just say no", [], "a negative as the verb argument"],
  [
    "Chad writes only in affirmative",
    [],
    "a sentence that has no explained negatives",
  ],
  [
    "the champion is not favored",
    [],
    "a sentence that has a negative but it is acting as a verb",
  ],
  [
    "the creature is not harmful",
    [
      {
        id: "no-explained-antonyms",
        start: 16,
        end: 27,
        suggestions: [{ range: [16, 27], text: "harmless" }],
      },
    ],
    "a sentence that has an explained negative",
  ],
  [
    "a not entirely disingenuous scammer",
    [],
    "explained negatives that are actual words",
  ],
  ["the not nonchalant man", [], "explained negatives that are actual words"],
  ["a not illegal wiretap", [], "explained negatives that are actual words"],
  [
    "he is not an amoral person",
    [],
    "explained negatives that are actual words",
  ],
  [
    "there are not impossible odds in his favor",
    [],
    "explained negatives that are actual words",
  ],
  ["he is not unlike his father", [], "a doubly-negated marker"],
  [
    "she does not like that",
    [
      {
        id: "no-explained-antonyms",
        start: 4,
        end: 17,
        suggestions: [{ range: [4, 17], text: "dislikes" }],
      },
    ],
    "a negative modifying a verb with an antonym",
  ],
  [
    "he's not agreeable in these matters",
    [
      {
        end: 18,
        suggestions: [{ range: [5, 18], text: "disagreeable" }],
        start: 5,
        id: "no-explained-antonyms",
      },
    ],
    "an adjective that has an argument",
  ],
  [
    "it will not be easy",
    [
      {
        end: 19,
        start: 8,
        id: "no-explained-antonyms",
        message: "Rewrite using 'hard' instead of 'not easy'",
      },
    ],
    "a modal + not + verb + adjective pattern",
  ],
  [
    "But I don’t know how to trust what I'm seeing",
    [],
    "a negated verb whose antonym said the opposite",
  ],
  [
    "He somehow didn't know when to stop.",
    [],
    "the same pairing where the rewrite read as deliberate",
  ],
  ["Not like that.", [], "a fragment with no auxiliary to carry the tense"],
  [
    "I don't feel like I owe you.",
    [],
    "a marker after a negated verb, which the negation does not reach",
  ],
  [
    "The room did not feel comfortable",
    [
      {
        start: 13,
        end: 33,
        id: "no-explained-antonyms",
        message: "Rewrite using 'uncomfortable' instead of 'not comfortable'",
      },
    ],
    "an adjective after a negated verb, which the negation does reach",
  ],
] as [text: string, errors: LintError[], name: string][];

describe("no-explained-antonyms", () => {
  tests.forEach(([text, expected, name]) => {
    it(name, () => {
      const actual = lint(nlp(text));
      assert.deepEqual(
        actual,
        expected.map((token, i) => ({ ...token, message: actual[i]?.message })),
      );
    });
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint from "../../src/index.js";
import { caseFrom } from "../case-from.js";
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
  ["I can't agree", [], "a modal cannot be replaced by an inflected antonym"],
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
  [
    "It wasn't fair.",
    [
      {
        start: 3,
        end: 14,
        suggestions: [{ range: [3, 14], text: "was unfair" }],
        id: "no-explained-antonyms",
      },
    ],
    "a contracted negation, whose n belongs to the clitic",
  ],
  [
    "They Aren’t fair.",
    [
      {
        start: 5,
        end: 16,
        suggestions: [{ range: [5, 16], text: "Are unfair" }],
        id: "no-explained-antonyms",
      },
    ],
    "a contraction with a curly apostrophe and a capital",
  ],
  [
    "It can't be fair.",
    [{ start: 6, end: 16, id: "no-explained-antonyms" }],
    "a 'can't', whose n belongs to 'can'",
  ],
  ["It isn't really fair.", [], "an adverb between the negation and the word"],
  [
    "She doesn't really agree.",
    [],
    "an adverb on the negated verb, which the antonym would drop",
  ],
  ["It won't be very easy.", [], "an adverb on the predicate"],
  ["It's not fair at all.", [], "'at all', which needs the negation"],
  ["She doesn't agree anymore.", [], "'anymore', which needs the negation"],
  [
    "IT WASN'T FAIR.",
    [
      {
        start: 3,
        end: 14,
        suggestions: [{ range: [3, 14], text: "WAS UNFAIR" }],
        id: "no-explained-antonyms",
      },
    ],
    "an all-caps contraction",
  ],
  [
    "If people associated to 'otherwise-good-ideologies' are banned from speaking about their ideas, why not ban those ideologies directly?",
    [],
    "a negated verb that does not link to the adverb after it",
  ],
] as [text: string, errors: LintError[], name: string][];

describe("no-explained-antonyms", () => {
  tests.forEach(([text, expected, name]) => {
    it(name, () => {
      const actual = lint(nlp(text));
      assert.deepEqual(
        actual,
        expected.map((token, i) => ({
          ...token,
          message: actual[i]?.message,
          ...caseFrom(actual[i]),
        })),
      );
    });
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint from "../../src/index.js";
import fallback from "../nlp.js";
import trained from "../trained-nlp.js";
import type { Config } from "../../src/types/index.js";

const config: Config = { "no-unmarked-relatives": true };

type Parse = typeof fallback;

const providers: [string, Parse][] = [
  ["the rules alone", fallback],
  ["the trained tagger", trained],
];

const rewritten = (parse: Parse, text: string) => {
  const [error] = lint(parse(text), config);
  const [{ range, text: inserted }] = error.suggestions ?? [];
  return `${text.slice(0, range[0])}${inserted}${text.slice(range[1])}`;
};

const reported = [
  [
    "You get art by working inside rules another person can check.",
    "rules another person can check",
    "You get art by working inside rules that another person can check.",
  ],
  [
    "She kept the letters he wrote.",
    "letters he wrote",
    "She kept the letters that he wrote.",
  ],
  [
    "The book you asked for is here.",
    "book you asked",
    "The book that you asked for is here.",
  ],
  [
    "Thomas Bernhard is the example I keep reaching for.",
    "example I keep",
    "Thomas Bernhard is the example that I keep reaching for.",
  ],
  [
    "The war the book promised shows up in the other volumes.",
    "war the book promised",
    "The war that the book promised shows up in the other volumes.",
  ],
  [
    "Let me imagine things the way I want to.",
    "way I want",
    "Let me imagine things the way that I want to.",
  ],
  [
    "It is a floor somebody made a mess on.",
    "floor somebody made",
    "It is a floor that somebody made a mess on.",
  ],
];

const quiet = [
  ["", "an empty string"],
  [
    "You work inside rules that another person can check.",
    "a relative clause marked with that",
  ],
  ["The man who left owns the house.", "a relative clause marked with who"],
  ["I told the boy he needs books.", "a clause that is told to the noun"],
  ["Thanks to the ironies of life I found the answer.", "a fronted phrase"],
  ["Some I found interesting.", "an object set in front of its clause"],
  ["As a teacher she works hard.", "a fronted phrase with an article"],
  ["Last year we moved.", "a fronted time"],
  ["For a while he stayed home.", "a fronted span of time"],
  ["These specify which noun we are referring to.", "an indirect question"],
  ["A writer copies what he reads.", "a free relative"],
  ["The dog barked and the cat ran.", "two main clauses"],
];

providers.forEach(([provider, parse]) => {
  describe(`no-unmarked-relatives with ${provider}`, () => {
    reported.forEach(([text, span, fixed]) => {
      it(`reports "${span}"`, () => {
        const errors = lint(parse(text), config);
        assert.deepEqual(
          errors.map(({ id, start, end }) => [id, text.slice(start, end)]),
          [["no-unmarked-relatives", span]],
        );
        assert.equal(rewritten(parse, text), fixed);
      });
    });

    quiet.forEach(([text, name]) => {
      it(`stays quiet on ${name}`, () => {
        assert.deepEqual(lint(parse(text), config), []);
      });
    });

    it("leaves the findings inside its span in place", () => {
      const errors = lint(parse("She kept the letters he utilized."), {
        ...config,
        "no-bad-words": true,
      });
      assert.deepEqual(
        errors.map(({ id }) => id),
        ["no-unmarked-relatives", "no-bad-words"],
      );
    });

    it("is off unless asked for", () => {
      const errors = lint(parse("She kept the letters he wrote."));
      assert.equal(
        errors.some(({ id }) => id === "no-unmarked-relatives"),
        false,
      );
    });
  });
});

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
    "They kept the note she could read without taking the paper down.",
    "note she could read",
    "They kept the note that she could read without taking the paper down.",
  ],
  [
    "The paper she took down is gone.",
    "paper she took",
    "The paper that she took down is gone.",
  ],
  [
    "The sugar he stirred his tea without was missing.",
    "sugar he stirred",
    "The sugar that he stirred his tea without was missing.",
  ],
  [
    "The note she gave the man without taking the paper down was short.",
    "note she gave",
    "The note that she gave the man without taking the paper down was short.",
  ],
  [
    "She packed her notes in the case we bought.",
    "case we bought",
    "She packed her notes in the case that we bought.",
  ],
  [
    "She packed a case we bought.",
    "case we bought",
    "She packed a case that we bought.",
  ],
  [
    "Take notes in case the book you asked for arrives.",
    "book you asked",
    "Take notes in case the book that you asked for arrives.",
  ],
  [
    "I am wondering how much money he earned she had spent.",
    "money he earned",
    "I am wondering how much money that he earned she had spent.",
  ],
  [
    "A lot of the time we spent was wasted.",
    "time we spent",
    "A lot of the time that we spent was wasted.",
  ],
  [
    "The time we spent, which was wasted, is gone.",
    "time we spent",
    "The time that we spent, which was wasted, is gone.",
  ],
  [
    "I wonder how much attention the editor I hired paid.",
    "editor I hired",
    "I wonder how much attention the editor that I hired paid.",
  ],
  [
    "I wonder how the book I bought was damaged.",
    "book I bought",
    "I wonder how the book that I bought was damaged.",
  ],
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
  [
    "She exists, as far as I can tell, so the book can be longer and so the author can show us how sensitive he is about family stuff.",
    "the retained degree adjective sensitive",
  ],
  [
    "I'm not reading the book to be impressed by how well-rounded a fictional detective is.",
    "the retained degree adjective well-rounded",
  ],
  ["I know how sensitive he is.", "a fronted predicate before a pronoun"],
  [
    "I know how well-rounded a detective is.",
    "a fronted predicate before an article",
  ],
  [
    "A person clearing the board can read it without taking the paper down.",
    "a participial modifier misparsed as the opening of a relative subject",
  ],
  [
    "My proposal puts each removal date beside the notice, where a person clearing the board can read it without taking the paper down.",
    "the retained synthetic-preflight sentence",
  ],
  [
    "Hold a blue hat and a silver scarf in memory in case they matter later.",
    "the retained benchmark's in case conjunction",
  ],
  ["Take an umbrella in case it rains.", "a precaution clause"],
  ["In case she calls, take notes.", "a fronted precaution clause"],
  ["Keep a copy just in case we need it.", "just in case"],
  ["", "an empty string"],
  [
    "That audience deserves the thought too, not a performance of how many unusual words the writer knows.",
    "a quantity question with an adjective modifier",
  ],
  [
    "The hat gets a color and a shape, the cloak gets a color and a length, and I am already wondering how much attention I am supposed to pay to the scarf.",
    "a quantity question attached through how",
  ],
  [
    "A lot of the time they just guess and keep reading, which means they never really knew who Dorvan was.",
    "a fronted time phrase before a comma relative",
  ],
  [
    "They extend beyond the hat, which gives me something fairly specific to picture, though I could do without knowing exactly how far they stick out.",
    "the degree adverb in how far",
  ],
  [
    "Even that takes a moment to say, but at least I don't have to picture a person deploying a vocabulary somewhere.",
    "the degree adverb in at least",
  ],
  ["At most we wait an hour.", "the degree adverb in at most"],
  [
    "That sounds obvious, yet plenty of prose makes a show of choosing the grander word when the ordinary one would do.",
    "an adjective before anaphoric one",
  ],
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

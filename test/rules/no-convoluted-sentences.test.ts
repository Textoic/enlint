import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint from "../../src/index.js";
import { clauseLinks } from "../../src/clauses.js";
import fallback from "../nlp.js";
import trained from "../trained-nlp.js";
import type { Config } from "../../src/types/index.js";

const config: Config = { "no-convoluted-sentences": true };

type Parse = typeof fallback;

const providers: [string, Parse][] = [
  ["the rules alone", fallback],
  ["the trained tagger", trained],
];

const wordsOf = (parse: Parse, text: string) =>
  parse(text).map((sentence) => clauseLinks(sentence).map(({ word }) => word));

const written =
  "A review calls a page painterly and a reader who was bored starts to think the boredom was a personal failure, so the next writer keeps the sofa and the exact nap of the fabric, because the review never asked whether anybody needed the nap.";

const counted = [
  ["The dog barked.", [], "one clause"],
  ["The dog barked and the cat ran.", ["and"], "two main clauses"],
  ["Tom and Ann left.", [], "two nouns joined by and"],
  ["He packed a coat and a hat.", [], "two objects joined by and"],
  ["And the cat ran.", [], "a coordinator that opens the sentence"],
  ["She left because he was late.", ["because"], "a reason"],
  ["If it rains we stay.", ["if"], "a condition in front"],
  ["He wants to leave.", [], "an infinitive"],
  ["She bought that house last year.", [], "that pointing at a noun"],
  ["He said that the book was long.", ["that"], "that opening a clause"],
  ["What does it cost?", [], "a question word that opens a question"],
  ["I know what it costs.", ["what"], "a question word inside the sentence"],
  ["It was so good that we stayed.", ["that"], "so grading an adjective"],
  ["He left so that we could talk.", ["so"], "so that counted once"],
  [
    "He works as a nurse and his wife teaches as a tutor since the factory closed.",
    ["and", "since"],
    "as in front of a noun phrase",
  ],
  [
    "After a while he began to hear screams, but he could not tell where they came from.",
    ["but", "where"],
    "after and while as a preposition and a noun",
  ],
  ["Because of who I am and how I am.", ["who", "and", "how"], "because of"],
  ["He once said the plan was fine.", [], "once as an adverb"],
  ["He bores her once they are married.", ["once"], "once opening a clause"],
  ["He ate as much as he could.", ["as"], "as much as"],
  [
    "I ran as fast as I could, as far as I could.",
    ["as", "as"],
    "two comparisons",
  ],
  ["I spend so much time here that she worries.", ["that"], "so much that"],
  ["She kept the letters he wrote.", [""], "a relative clause with no marker"],
] as [text: string, words: string[], name: string][];

providers.forEach(([provider, parse]) => {
  describe(`clauseLinks with ${provider}`, () => {
    counted.forEach(([text, words, name]) => {
      it(name, () => {
        assert.deepEqual(wordsOf(parse, text), [words]);
      });
    });
  });
});

const long =
  "The old report from the northern office of the company with the red logo arrived on a wet Monday morning in a brown envelope with three stamps and a note from the clerk at the front desk of the main building.";

const convoluted =
  "She called when the train stopped, but he was out because the dog that he walks had run off.";

providers.forEach(([provider, parse]) => {
  describe(`no-convoluted-sentences with ${provider}`, () => {
    it("reports the whole sentence when it has more than three links", () => {
      const errors = lint(parse(convoluted), config);
      assert.deepEqual(
        errors.map(({ id, start, end }) => [id, start, end]),
        [["no-convoluted-sentences", 0, convoluted.length - 1]],
      );
      assert.match(errors[0].message, /"when", "but", "because", "that"/u);
    });

    it("reports the sentence the rule was written for", () => {
      assert.deepEqual(
        lint(parse(written), config).map(({ id }) => id),
        ["no-convoluted-sentences"],
      );
    });

    it("stays quiet on three links", () => {
      assert.deepEqual(
        lint(
          parse(
            "She left because he was late, and nobody asked why he stayed.",
          ),
          config,
        ),
        [],
      );
    });

    it("stays quiet on a long sentence with one clause", () => {
      assert.deepEqual(lint(parse(long), config), []);
    });

    it("reports each convoluted sentence of a text by its own span", () => {
      const text = `The dog barked. ${convoluted}`;
      const errors = lint(parse(text), config);
      assert.deepEqual(
        errors.map(({ start, end }) => text.slice(start, end)),
        [convoluted.slice(0, -1)],
      );
    });
  });
});

it("names every link of the sentence the rule was written for", () => {
  assert.deepEqual(wordsOf(fallback, written), [
    ["and", "who", "so", "because", "whether"],
  ]);
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import queriesToErrors from "../src/queries-to-errors.js";
import { ErrorId } from "../src/types/index.js";
import nlp from "./nlp.js";

const applied = (
  selector: string,
  suggestion: string,
  text: string,
): string | null => {
  const errors = queriesToErrors(
    [
      {
        selector,
        suggestions: [suggestion],
        message: "test",
        id: ErrorId.NO_BAD_WORDS,
      },
    ],
    nlp(text),
  );
  if (errors.length === 0) {
    return null;
  }

  const [{ suggestions }] = errors;
  const [{ range, text: replacement }] = suggestions ?? [
    { range: [0, 0], text: "" },
  ];
  return `${text.slice(0, range[0])}${replacement}${text.slice(range[1])}`;
};

const tests: [string, string, string, string, string][] = [
  [
    "deletes the comma that set off a phrase opening the sentence",
    "[form=in i] > [form=opinion i]",
    "",
    "In my opinion, the new policy will fail.",
    "The new policy will fail.",
  ],
  [
    "deletes both commas around a parenthetical",
    "[form=for i] > [form=part i] > [form=most i]",
    "",
    "The new policy, for the most part, reduced overhead.",
    "The new policy reduced overhead.",
  ],
  [
    "deletes the comma before a phrase that ends the sentence",
    "[form=for i] > [form=part i] > [form=most i]",
    "",
    "Most users found the interface intuitive, for the most part.",
    "Most users found the interface intuitive.",
  ],
  [
    "keeps a comma that belongs to the clause before the span",
    "[lemma=be] > [form=it i] ~ [form=clear i] > [form=to i] > [form=me i]",
    "",
    "After reviewing the data, it is clear to me the strategy failed.",
    "After reviewing the data, the strategy failed.",
  ],
  [
    "takes the complementizer the deleted hedge licensed",
    "[lemma=seem] > [form=it i] ~ [form=to i] > [form=me i]",
    "",
    "It seems to me that the deadline is unrealistic.",
    "The deadline is unrealistic.",
  ],
  [
    "leaves a demonstrative that alone",
    "[lemma=be] > [form=it i] ~ [form=clear i] > [form=to i] > [form=me i]",
    "",
    "It is clear to me that will fail.",
    "That will fail.",
  ],
  [
    "corrects an article the replacement no longer agrees with",
    "[lemma=bonus] > [form=added i]",
    "bonus",
    "We received an added bonus of extra time.",
    "We received a bonus of extra time.",
  ],
  [
    "corrects an article in the other direction",
    "[form=thrilling i]",
    "exciting",
    "She felt a thrilling sense of anticipation.",
    "She felt an exciting sense of anticipation.",
  ],
  [
    "keeps the article's capital when it starts the sentence",
    "[form=thrilling i]",
    "exciting",
    "A thrilling match ended the season.",
    "An exciting match ended the season.",
  ],
  [
    "leaves an article before a u-word alone",
    "[form=singular i]",
    "unique",
    "It was a singular achievement.",
    "It was a unique achievement.",
  ],
  [
    "does not double the determiner when the replacement brings one",
    "[lemma=nature] > [form=multifaceted i]",
    "the complex quality",
    "The multifaceted nature of poverty defies easy answers.",
    "The complex quality of poverty defies easy answers.",
  ],
  [
    "leaves a replacement that needs no repair untouched",
    "[lemma=utilize]",
    ":inflect(use)",
    "We utilized the new tool.",
    "We used the new tool.",
  ],
];

describe("repair-suggestion", () => {
  tests.forEach(([description, selector, suggestion, text, expected]) => {
    it(description, () => {
      assert.equal(applied(selector, suggestion, text), expected);
    });
  });
});

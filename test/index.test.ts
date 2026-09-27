import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint, { defaults } from "../src/index.js";
import nlp from "./nlp.js";
import type { LintError } from "../src/types/index.js";

const tests = [
  ["", [], "an empty string"],
  ["Chad writes good", [], "no errors"],
  ["How does it compare with other countries?", [], "no errors"],
  [
    "The colour faded.",
    [],
    "an opt-in rule stays silent under the default config",
  ],
  [
    "utilize this tool",
    [
      {
        id: "no-bad-words",
        start: 0,
        end: 7,
        suggestions: [{ range: [0, 7], text: "use" }],
      },
    ],
    "one error",
  ],
  [
    "he added insult to injury",
    [
      {
        id: "no-bad-words",
        start: 3,
        end: 25,
        suggestions: [{ range: [3, 25], text: "aggravated" }],
      },
    ],
    "one error",
  ],
  [
    "The disaster happened as a result of the not accurate forecasts",
    [
      {
        start: 22,
        end: 36,
        id: "no-bad-words",
        suggestions: [{ range: [22, 36], text: "because" }],
      },
      {
        start: 41,
        end: 53,
        id: "no-explained-antonyms",
        suggestions: [{ range: [41, 53], text: "inaccurate" }],
      },
    ],
    "two separate errors in the same sentence",
  ],
  [
    "He was pestered by the not occupied academics",
    [
      {
        start: 0,
        end: 45,
        id: "no-passive-sentences",
        suggestions: [
          { range: [0, 45], text: "The not occupied academics pestered him" },
        ],
      },
    ],
    "two overlapping errors: a passive and an explained antonym",
  ],
  [
    "im being bullied by a gay man on roblox for stanning minghao",
    [
      {
        start: 0,
        end: 60,
        id: "no-passive-sentences",
        suggestions: [
          {
            range: [0, 60],
            text: "A gay man on roblox for stanning minghao is bullying me",
          },
        ],
      },
    ],
    "a passive that spans the whole sentence",
  ],
  [
    "It appears that you might be wrong",
    [{ start: 0, end: 15, id: "no-bad-words" }],
    "an error that requires a rewrite",
  ],
  [
    "We're aware of an issue and digging into the problem with the highest priority.",
    [
      {
        start: 2,
        end: 14,
        id: "no-bad-words",
        suggestions: [{ range: [2, 14], text: " know about" }],
      },
    ],
    "an error that is contracted and therefore needs a space before it to be correct ('re aware of' => ' know about')",
  ],
] as [text: string, errors: LintError[], name: string][];

describe("lint", () => {
  tests.forEach(([text, expected, name]) => {
    it(name, () => {
      const actual = lint(nlp(text));
      assert.deepEqual(
        actual,
        expected.map((error, i) => ({ ...error, message: actual[i]?.message })),
      );
    });
  });

  it("disabled rules", () => {
    assert.deepEqual(lint(nlp("utilize this tool"), {}), []);
  });

  it("runs a rule that defaults to off when the config asks for it", () => {
    const [error] = lint(nlp("The colour faded."), {
      ...defaults,
      "no-mixed-dialects": true,
    });
    assert.equal(error?.id, "no-mixed-dialects");
  });
});

const sentenceWide = "no-high-lexical-density";

describe("overlapping problems", () => {
  const density = {
    ...defaults,
    "no-bad-words": true,
    "no-special-punctuation": true,
  };

  it("a sentence-wide problem that offers no fix keeps the fixes inside it", () => {
    const errors = lint(
      nlp(
        "Utilization of the leverage metric facilitates the optimization of portfolio risk exposure across the fund manager allocation process.",
      ),
      density,
    );
    assert.ok(
      errors.some(({ id }) => id === sentenceWide),
      "the density problem should still be reported",
    );
    assert.ok(
      errors.some(({ id }) => id === "no-bad-words"),
      "a word-level fix inside the sentence must survive the sentence-wide problem",
    );
  });

  it("keeps every fix inside the sentence, not an arbitrary subset of them", () => {
    const errors = lint(
      nlp(
        "Utilization of the leverage metric facilitates the optimization of portfolio risk exposure across the fund manager allocation process.",
      ),
      density,
    );
    const words = errors.filter(({ id }) => id === "no-bad-words");
    const alone = lint(
      nlp(
        "Utilization of the leverage metric facilitates the optimization of portfolio risk exposure across the fund manager allocation process.",
      ),
      { ...density, [sentenceWide]: false },
    ).filter(({ id }) => id === "no-bad-words");
    assert.deepEqual(
      words.map(({ start, end }) => [start, end]),
      alone.map(({ start, end }) => [start, end]),
      "turning the sentence-wide rule on must not change which word-level fixes are reported",
    );
  });

  it("a problem that offers a fix still supersedes the shorter ones it covers", () => {
    const errors = lint(nlp("He was pestered by the not occupied academics"), {
      ...defaults,
      [sentenceWide]: false,
    });
    assert.deepEqual(
      errors.map(({ id }) => id),
      ["no-passive-sentences"],
      "the passive offers a whole-clause replacement, so the antonym inside it is superseded",
    );
  });

  it("does not report the same rule twice over overlapping spans", () => {
    const errors = lint(
      nlp("He wanted not just a sense of purpose but a sense of belonging."),
      { ...defaults, [sentenceWide]: false },
    );
    const words = errors.filter(({ id }) => id === "no-bad-words");
    const overlapping = words.filter((one) =>
      words.some(
        (other) =>
          other !== one && one.start < other.end && other.start < one.end,
      ),
    );
    assert.deepEqual(
      overlapping,
      [],
      "overlapping same-rule problems collapse",
    );
  });
});

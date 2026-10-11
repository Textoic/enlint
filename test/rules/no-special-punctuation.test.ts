import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint, { defaults } from "../../src/index.js";
import nlp from "../nlp.js";
import type { LintError } from "../../src/types/index.js";

const tests = [
  ["", [], "an empty string"],
  ["What if she—", [], "allow em dashes as interrupted conversation"],
  [
    "there he was—still and silent",
    [
      {
        start: 12,
        end: 13,
        suggestions: [{ range: [12, 13], text: ", " }],
        id: "no-special-punctuation",
      },
    ],
    "avoid em dashes between two characters",
  ],
  [
    "Below ~0.5–1% you should be suspicious",
    [
      {
        start: 10,
        end: 11,
        suggestions: [{ range: [10, 11], text: "-" }],
        id: "no-special-punctuation",
      },
    ],
    "replace an en dash with the hyphen it was standing in for",
  ],
  [
    "The talks ran 1990 – 1995 in secret",
    [
      {
        start: 19,
        end: 20,
        suggestions: [{ range: [19, 20], text: "-" }],
        id: "no-special-punctuation",
      },
    ],
    "replace an en dash whatever it sits between",
  ],
  [
    'He said "no" — then he left',
    [
      {
        start: 13,
        end: 14,
        suggestions: [{ range: [12, 15], text: ", " }],
        id: "no-special-punctuation",
      },
    ],
    "flag an em dash whose left neighbour is a closing quote",
  ],
  [
    "Voice is about restraint — the best narrators say less",
    [
      {
        start: 25,
        end: 26,
        suggestions: [{ range: [24, 30], text: ". The" }],
        id: "no-special-punctuation",
      },
    ],
    "end the sentence where a second statement follows the dash, and swallow the spaces on both sides",
  ],
  [
    "Voice is about restraint — and the best narrators say less",
    [
      {
        start: 25,
        end: 26,
        suggestions: [{ range: [24, 27], text: ", " }],
        id: "no-special-punctuation",
      },
    ],
    "keep the comma where a joining word follows the dash",
  ],
  ...[
    "They cut the budget — a decision the board regretted",
    "She found the letter — the one her mother wrote in 1950",
    "The judges read sixty essays — essays written by a model",
    "The house was quiet — too quiet for a place children lived in",
    "Is the plan dead — the team thinks so?",
    "(the plan failed — the team quit)",
  ].map((text): [string, LintError[], string] => [
    text,
    [
      {
        start: text.indexOf("—"),
        end: text.indexOf("—") + 1,
        suggestions: [
          {
            range: [text.indexOf("—") - 1, text.indexOf("—") + 2],
            text: ", ",
          },
        ],
        id: "no-special-punctuation",
      } as LintError,
    ],
    `keep the comma in "${text}"`,
  ]),
  [
    "The best narrators — the quiet ones — say less",
    [
      {
        start: 19,
        end: 20,
        suggestions: [{ range: [18, 21], text: ", " }],
        id: "no-special-punctuation",
      },
      {
        start: 36,
        end: 37,
        suggestions: [{ range: [35, 38], text: ", " }],
        id: "no-special-punctuation",
      },
    ],
    "keep the commas around an aside set between two dashes",
  ],
  [
    "And the so-called movement — there is no such thing",
    [
      {
        start: 27,
        end: 28,
        suggestions: [{ range: [26, 29], text: ", " }],
        id: "no-special-punctuation",
      },
    ],
    "keep the comma where no statement comes before the dash",
  ],
  [
    '"What if she—" he stopped himself',
    [],
    "leave an interrupted line alone when the dash runs into the closing quote",
  ],
  [
    "The run finished — `checkRows` passed",
    [
      {
        start: 17,
        end: 18,
        suggestions: [{ range: [16, 19], text: ", " }],
        id: "no-special-punctuation",
      },
    ],
    "stop at the code span the parser masked instead of swallowing it",
  ],
] as [text: string, errors: LintError[], name: string][];

const config = { ...defaults, "no-special-punctuation": true };

describe("no-special-punctuation", () => {
  tests.forEach(([text, expected, name]) => {
    it(name, () => {
      const actual = lint(nlp(text), config);
      assert.deepEqual(
        actual,
        expected.map((error, i) => ({ ...error, message: actual[i]?.message })),
      );
    });
  });
});

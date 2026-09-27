import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint, { defaults } from "../../src/index.js";
import nlp from "../nlp.js";
import type { LintError } from "../../src/types/index.js";

const tests = [
  ["", [], "an empty string"],
  ["it's there", [], "no absolute phrases"],
  [
    "He typed a reply, his fingers trembling slightly",
    [
      {
        id: "no-absolute-phrases",
        start: 16,
        end: 39,
      },
    ],
    "a right-floating absolute phrase",
  ],
  [
    "Fingers crossed tightly, she waited.",
    [],
    "an ambiguous regular past form without explicit participle features",
  ],
  [
    "His hands shaking, he opened the envelope.",
    [
      {
        id: "no-absolute-phrases",
        start: 0,
        end: 17,
      },
    ],
    "a left-floating absolute phrase with a gerund",
  ],
  [
    "She waited, arms crossed.",
    [],
    "a trailing regular past form without explicit participle features",
  ],
  [
    "She waited, and paced.",
    [],
    "an ordinary coordinated clause, not an absolute phrase",
  ],
  [
    "He typed a reply, and his fingers trembled slightly.",
    [],
    "an ordinary coordinated clause with a tense-ambiguous verb",
  ],
  [
    "Pressing her back against the wall, she listened.",
    [],
    "a dangling participle with no subject of its own is not an absolute phrase",
  ],
  [
    "The sun hung low on the horizon, painting the sky in shades of gold and crimson.",
    [],
    "a subjectless trailing participle sharing the main clause's subject is not an absolute phrase",
  ],
  [
    "Wages stagnated, conditions were appalling, and artisan skills were devalued.",
    [],
    "a member of an explicit coordinated list of clauses is not an absolute phrase",
  ],
  [
    "Airway Remodeling: unlike destructive remodeling, asthma features membrane thickening.",
    [],
    "a compound noun that is lexically a gerund is not an absolute phrase",
  ],
  [
    "My recommendation: anyone doing ongoing work under your direction — convert to W-2.",
    [],
    "a label followed by a dash and an unrelated clause is not an absolute phrase",
  ],
  [
    "The result: when using CTB, subjects look approximately exponential.",
    [],
    "a subordinate clause introduced by a relative marker is not an absolute phrase",
  ],
  [
    "My dad seemed relaxed for once, which is rare given how much stress his business puts him under throughout the year.",
    [],
    "a supplementary relative clause does not steal root status from the real main clause",
  ],
  [
    "Third, watch for the moral-economy language — 'it costs too much,' 'they changed the deal on us.'",
    [],
    "a second quoted example is not an absolute phrase",
  ],
  [
    "He just changed, he said.",
    [],
    "a trailing reporting clause is not an absolute phrase",
  ],
  [
    "A single detached leaf, even genuine and pretty, is usually worth a few hundred to low thousands unless it's a fully painted miniature.",
    [],
    "an appositive aside is not an absolute phrase",
  ],
  [
    "Our mum used to do the same thing, drive us mental with it, but now I find myself actually missing it.",
    [],
    "an infinitive coordinated under 'to' is not an absolute phrase",
  ],
  [
    "Prison officials noted that despite his young age, Lane showed a troubling disregard for institutional rules and the safety of those around him.",
    [],
    "a clause introduced by a preposition marker used adverbially is not an absolute phrase",
  ],
  [
    "As Phelps departed the Olympic pool for the final time, the sporting world acknowledged the conclusion of an era.",
    [],
    "a fronted subordinate clause introduced by a bare marker is not an absolute phrase",
  ],
  [
    "Local schools incorporated discussions about his life and values into curricula, ensuring younger generations would understand the contributions he had made to their region.",
    [],
    "a subjectless trailing gerund is not an absolute phrase",
  ],
  [
    "Some of them laughed, some of them looked confused, but many leaned forward.",
    [],
    "a coordinated clause nested under a coordinated-list member is not an absolute phrase",
  ],
  [
    "that is, the greater the prediction error, the more severe the anxiety symptoms, providing a novel explanation for the anxiety symptoms seen in autism.",
    [],
    "a comparative-correlative clause attached as a participle's subject is not an absolute phrase",
  ],
  [
    "some faces altered with greed, others paled with disappointment.",
    [],
    "an asyndetic pair of clauses with an indefinite-pronoun subject is not an absolute phrase",
  ],
  [
    "they sat in the senate, they presided in the councils of the realm.",
    [],
    "a repeated personal-pronoun subject across asyndetic clauses is not an absolute phrase",
  ],
  [
    "I popped into town a little later, I walked it once, and cycled it.",
    [],
    "a personal-pronoun subject matching the main clause's own subject is not an absolute phrase",
  ],
  [
    "You know, it being Christmas Eve and all.",
    [],
    "a colloquial tag clause with a personal-pronoun subject is not an absolute phrase",
  ],
  [
    "If I have 32 pods running on a machine, each with 1cpu requested, what stops one of those pods using an unfair share?",
    [],
    "a totive-pronoun subject ('each') is not an absolute phrase",
  ],
] as [text: string, errors: LintError[], name: string][];

const config = {
  ...defaults,
  "no-bad-words": false,
  "no-high-lexical-density": false,
};

describe("no-absolute-phrases", () => {
  tests.forEach(([text, expected, name]) => {
    it(name, () => {
      const actual = lint(nlp(text), config);
      assert.deepEqual(
        actual,
        expected.map((token, i) => ({ ...token, message: actual[i]?.message })),
      );
    });
  });
});

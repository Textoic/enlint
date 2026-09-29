import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint, { defaults } from "../../src/index.js";
import nlp from "../nlp.js";
import trained from "../trained-nlp.js";
import density from "../../src/rules/no-high-lexical-density.js";
import type { Config, LintError } from "../../src/types/index.js";

const off = {
  ...defaults,
  "no-bad-words": false,
  "no-noun-clusters": false,
  "no-passive-sentences": false,
};

const config: Config = { ...off, "no-high-lexical-density": true };

const measuring: Config = {
  ...off,
  "no-high-lexical-density": { minimumWords: 8 },
};

const tests = [
  ["", [], "an empty string", config],
  [
    "We built the thing and it works well enough for now.",
    [],
    "a sentence carried by verbs",
    config,
  ],
  [
    "Costs rose.",
    [],
    "a short sentence, which the minimum word count spares",
    config,
  ],
  [
    "The implementation of the new policy framework required extensive consultation with regional stakeholder groups.",
    [{ id: "no-high-lexical-density", start: 0, end: 111 }],
    "too many nouns",
    measuring,
  ],
  [
    "Rapid organizational transformation demands robust strategic alignment across diverse operational units.",
    [],
    "a parse without a finite verb cannot establish a sentence",
    measuring,
  ],
  [
    "We built the thing and it works well enough for now.",
    [],
    "percentages alone cannot reject a plain sentence",
    {
      ...off,
      "no-high-lexical-density": { nounPercentage: 5, minimumWords: 8 },
    },
  ],
  [
    "The implementation of the new policy framework required extensive consultation with regional stakeholder groups.",
    [],
    "a dense sentence that a loose threshold allows",
    {
      ...off,
      "no-high-lexical-density": {
        minimumWords: 8,
        nounPercentage: 90,
        adjectivePercentage: 90,
        nounAndAdjectivePercentage: 90,
      },
    },
  ],
  [
    "The implementation of the new policy framework required extensive consultation with regional stakeholder groups.",
    [],
    "a dense sentence too short for the default floor to measure",
    config,
  ],
  [
    "The implementation of the new policy framework required extensive consultation with regional stakeholder groups and a comprehensive assessment methodology drawn from prior work.",
    [{ id: "no-high-lexical-density", start: 0, end: 176 }],
    "a dense sentence long enough for the default floor to measure",
    config,
  ],
  [
    "Costs rose.",
    [],
    "lowering the minimum does not reject a plain sentence",
    { ...off, "no-high-lexical-density": { minimumWords: 2 } },
  ],
] as [text: string, errors: LintError[], name: string, config: Config][];

describe("no-high-lexical-density", () => {
  tests.forEach(([text, expected, name, given]) => {
    it(name, () => {
      const actual = lint(nlp(text), given);
      assert.deepEqual(
        actual,
        expected.map((error, index) => ({
          ...error,
          message: actual[index]?.message,
        })),
      );
    });
  });
});

const clearExamples = [
  "Noon",
  "## Noon",
  "Neytopia tells the lives of a ruthless goddess, a lost space traveler, a raven and a revolutionary.",
  "But there were other political parties: the Socialist Revolutionaries, the North Liberation Party, the National Democrats and more.",
  "Artisans crafted weapons, soldiers pillaged, military officers advanced their careers, citizens felt safe, slavers gained property they traded at markets for landowners to have cheap labor.",
  "His pincer maneuvers, supply line disruptions and propaganda all proved effective: he routed several divisions losing only a few men.",
  "He dragged me to that-that god-awful cage for two thousand and forty-eight long miserable fucking years!",
  "The raven ran his sword through the leader's ribs, splitting the leader's heart in two.",
  "Implementation, consultation, assessment, evaluation, coordination, preparation, organization, management, administration, inspection, documentation, registration, communication, investigation, negotiation and supervision.",
  "We discussed implementation, consultation, assessment, evaluation, coordination, preparation, organization, management, administration, inspection, documentation, registration, communication, investigation, negotiation and supervision.",
  "The implementation of the new policy framework and the assessment of the regional consultation and management process",
  "We put the new policy into practice after we spoke with local groups and checked what had worked before.",
  "The apartment on the third floor had a large kitchen, a quiet bedroom, a balcony and a view of the station.",
  "The apartment on the third floor had a spacious kitchen, a quiet bedroom, a sunny balcony and a large basement.",
  "The list includes implementation of policy, consultation with residents, assessment of risks, documentation of results and supervision of staff.",
  "We discussed implementation of policy, consultation with residents, assessment of risks, documentation of results and supervision of staff.",
  "We discussed implementation of the new regional policy and consultation with the residents of the nearby villages.",
  "Departments worked together to put the policy into practice, spoke with residents and checked how it would affect the environment.",
  "We examined the proposed changes, considered the evidence and spoke at length with people who would be affected.",
];

const denseExamples = [
  "The implementation of the new policy framework required extensive consultation with regional stakeholder groups and a comprehensive assessment methodology drawn from prior work.",
  "The implementation of the regional policy required coordination between departments, consultation with residents and assessment of the environmental consequences.",
  "The evaluation of the proposed changes required careful consideration of the available evidence and extensive consultation with the affected communities.",
];

for (const [name, parse] of [
  ["fallback", nlp],
  ["trained", trained],
] as const) {
  describe(`density precision with ${name}`, () => {
    for (const text of clearExamples) {
      it(`allows ${text}`, () => {
        assert.deepEqual(density(parse(text), config), []);
      });
    }

    it("keeps fragments clear even with zero percentage thresholds", () => {
      assert.deepEqual(
        density(parse("Noon"), {
          "no-high-lexical-density": {
            minimumWords: 1,
            nounPercentage: 0,
            adjectivePercentage: 0,
            nounAndAdjectivePercentage: 0,
          },
        }),
        [],
      );
    });

    for (const text of denseExamples) {
      it(`reports ${text}`, () => {
        const errors = density(parse(text), config);
        assert.equal(errors.length, 1);
        assert.equal(
          text.slice(errors[0].start, errors[0].end),
          text.slice(0, -1),
        );
      });
    }
  });
}

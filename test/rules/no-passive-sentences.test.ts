import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint from "../../src/index.js";
import nlp from "../nlp.js";
import type { LintError } from "../../src/types/index.js";

const tests = [
  ["", [], "an empty string"],
  ["Orange man bad", [], "no-passive-sentence in a sentence with no verbs"],
  [
    "John plays the piano",
    [],
    "no-passive-sentence in a simple active sentence",
  ],
  [
    "He wasn't an enemy of the state, it was impossible",
    [],
    "no-passive-sentence in a past sentence with two clauses",
  ],
  ["Am I getting fired?", [], "a question"],
  ["the piano is played", [], "a simple present passive with no agent"],
  [
    "Things are made to happen now",
    [],
    "a simple present passive with no agent",
  ],
  ["Things are made to happen.", [], "a simple present passive with no agent"],
  [
    "John was stopped by.",
    [],
    "a simple present passive with no agent but with marker",
  ],
  [
    "the piano is played by John",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 27,
        suggestions: [{ range: [0, 27], text: "John plays the piano" }],
      },
    ],
    "a simple present passive with agent",
  ],
  [
    "the scandal was uncovered by the reporter",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 41,
        suggestions: [
          { range: [0, 41], text: "The reporter uncovered the scandal" },
        ],
      },
    ],

    "a simple past passive with agent",
  ],
  [
    "the fly was being eaten by him",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 30,
        suggestions: [{ range: [0, 30], text: "He was eating the fly" }],
      },
    ],
    "a continuous past passive with agent",
  ],
  [
    "Everywhere skill and competition had a place in the old world, they have been replaced by meritless handouts.",
    [
      {
        id: "no-passive-sentences",
        start: 63,
        end: 108,
        suggestions: [
          { range: [63, 108], text: "meritless handouts have replaced them" },
        ],
      },
    ],
    "a past clause object of a previous active clause",
  ],
  [
    "I am not amused by it at all",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 28,
        suggestions: [{ range: [0, 28], text: "It at all does not amuse me" }],
      },
    ],
    "complements after the agent",
  ],
  [
    "Their life, their thought and speech are lent them by males",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 59,
        suggestions: [
          {
            range: [0, 59],
            text: "Males lend them their life, their thought and speech",
          },
        ],
      },
    ],
    "a conjunct passive subject",
  ],
  [
    "The person presenting the discussion is usually accused by each side of favoring the other side",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 95,
        suggestions: [
          {
            range: [0, 95],
            text: "Each side of favoring the other side usually accuses the person presenting the discussion",
          },
        ],
      },
    ],
    "a sentence where a prepositional argument of the verb is incorrectly tagged as child of the passive agent",
  ],
  [
    "It's not protected by free speech",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 33,
        suggestions: [
          { range: [0, 33], text: "Free speech does not protect it" },
        ],
      },
    ],
    "a negative passive",
  ],
  [
    "During the next week, his home is haunted by reporters",
    [
      {
        id: "no-passive-sentences",
        start: 22,
        end: 54,
        suggestions: [{ range: [22, 54], text: "reporters haunt his home" }],
      },
    ],
    "a passive preceded by a verb complement",
  ],
  [
    "But the problem couldn't be solved by a few night disappearances",
    [
      {
        id: "no-passive-sentences",
        start: 4,
        end: 64,
        suggestions: [
          {
            range: [4, 64],
            text: "a few night disappearances could't solve the problem",
          },
        ],
      },
    ],
    "a passive that has a modal + negation",
  ],
  [
    "Failure to obey any of his ‘sacred commandments’ is punished by death, as you have already seen.”",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 69,
        suggestions: [
          {
            range: [0, 69],
            text: "Death punishes failure to obey any of his ‘sacred commandments’",
          },
        ],
      },
    ],
    "a passive subject that has appositive punctuation",
  ],
  [
    "It probably has not been announced by different messiahs",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 56,
        suggestions: [
          {
            range: [0, 56],
            text: "Different messiahs have probably not announced it",
          },
        ],
      },
    ],
    "a passive sentence where the passive root has complements and is not the be verb",
  ],
  [
    "I was identified by me",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 22,
        suggestions: [{ range: [0, 22], text: "I identified me" }],
      },
    ],
    "a passive sentence where the agent and subject are the first person pronouns",
  ],
  [
    "She was identified by her",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 25,
        suggestions: [{ range: [0, 25], text: "She identified her" }],
      },
    ],
    "a passive sentence where the agent and subject are the third person female pronouns",
  ],
  [
    "He was identified by him",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 24,
        suggestions: [{ range: [0, 24], text: "He identified him" }],
      },
    ],
    "a passive sentence where the agent and subject are the third person male pronouns",
  ],
  [
    "We were identified by us",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 24,
        suggestions: [{ range: [0, 24], text: "We identified us" }],
      },
    ],
    "a passive sentence where the agent and subject are the first person plurals",
  ],
  [
    "They were identified by them",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 28,
        suggestions: [{ range: [0, 28], text: "They identified them" }],
      },
    ],
    "a passive sentence where the agent is the third person plural",
  ],
  [
    "This authorization was signed by you.",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 36,
        suggestions: [
          { range: [0, 36], text: "You signed this authorization" },
        ],
      },
    ],
    "a passive sentence where the agent is the second person pronoun",
  ],
  [
    "The abyss was opened by Cthulhu",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 31,
        suggestions: [{ range: [0, 31], text: "Cthulhu opened the abyss" }],
      },
    ],
    "a passive sentence where the agent is an unknown Agent",
  ],
  [
    "The meme was manufactured by the believing",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 42,
        suggestions: [
          { range: [0, 42], text: "The believing manufactured the meme" },
        ],
      },
    ],
    "a passive sentence where the agent is a forced noun with determiner",
  ],
  [
    "he was taken down by the guards",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 31,
        suggestions: [{ range: [0, 31], text: "The guards took down him" }],
      },
    ],
    "a passive sentence that is a phrasal verb",
  ],
  [
    "Spain was visited by many tourists",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 34,
        suggestions: [{ range: [0, 34], text: "Many tourists visited Spain" }],
      },
    ],
    "a passive sentence where the subject is a proper noun that maintains its casing when it becomes the object",
  ],
  [
    "Ultimately, however, the product testing world is a reflection of the wider world of tech, which is dominated by white, urban, professional men",
    [
      {
        start: 91,
        end: 118,
        id: "no-passive-sentences",
      },
    ],
    "a passive child to the word 'is' as root and a relative pronoun as passive subject",
  ],
  [
    "“At the end of the day, the reason most of these platforms are dominated by men is because all the venture capitalists and engineers and other founders are mostly men,” Koning says",
    [
      {
        start: 1,
        end: 22,
        id: "no-bad-words",
        suggestions: [{ range: [1, 27], text: "The" }],
      },
      {
        start: 35,
        end: 79,
        id: "no-passive-sentences",
        suggestions: [
          { range: [35, 79], text: "men dominate most of these platforms" },
        ],
      },
    ],
    "a passive that is also a relative marked by a pronoun",
  ],
  [
    "All his choices, all his surroundings, have been determined by someone who isn’t there",
    [
      {
        start: 0,
        end: 86,
        id: "no-passive-sentences",
        suggestions: [
          {
            range: [0, 86],
            text: "Someone who isn’t there has determined all his choices, all his surroundings",
          },
        ],
      },
    ],
    "a passive that has an unmarked conjunct as the passive subject",
  ],
  [
    "They aren’t published by powerful media companies",
    [
      {
        start: 0,
        end: 49,
        id: "no-passive-sentences",
        suggestions: [
          {
            range: [0, 49],
            text: "Powerful media companies do not publish them",
          },
        ],
      },
    ],
    "a passive that has a be-verb passive root with a contracted not",
  ],
  [
    "As Yglesias notes in his post, though popular awareness of climate change has improved, the kind of urgency that elites (correctly) feel isn’t yet shared by the public:",
    [
      {
        start: 88,
        end: 167,
        id: "no-passive-sentences",
        suggestions: [
          {
            range: [88, 167],
            text: "the public does not yet share the kind of urgency that elites (correctly) feel",
          },
        ],
      },
    ],
    "a passive subject that has a marked relative",
  ],
  [
    "The basalt 'scablands' were carved by repeated epic ice age floods",
    [
      {
        start: 0,
        end: 66,
        id: "no-passive-sentences",
        suggestions: [
          {
            range: [0, 66],
            text: "Repeated epic ice age floods carved the basalt 'scablands'",
          },
        ],
      },
    ],
    "a passive agent that has special punctuation",
  ],
  [
    "The work is done by Friday.",
    [],
    "a by-phrase naming a day, which is a deadline rather than an agent",
  ],
  [
    "The description is done by paragraph six.",
    [],
    "a by-phrase naming a place in the text",
  ],
  ["Sales are doubled by 2030.", [], "a by-phrase that is a bare year"],
  [
    "The bug is caused by line 42.",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 28,
        suggestions: [{ range: [0, 28], text: "Line 42 causes the bug" }],
      },
    ],
    "a by-phrase counting a word that is not listed",
  ],
  [
    "The report is written by Sarah.",
    [
      {
        id: "no-passive-sentences",
        start: 0,
        end: 30,
        suggestions: [{ range: [0, 30], text: "Sarah writes the report" }],
      },
    ],
    "an agent with no Number, which agrees as a singular",
  ],
] as [text: string, errors: LintError[], name: string][];

describe("no-passive-sentences", () => {
  tests.forEach(([text, expected, name]) => {
    it(name, () => {
      const actual = lint(nlp(text));
      assert.deepEqual(
        actual,
        expected.map((token, i) => ({ ...token, message: actual[i].message })),
      );
    });
  });
});

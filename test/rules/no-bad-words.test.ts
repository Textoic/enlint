import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as cssWhat from "css-what";
import lint from "../../src/index.js";
import nlp from "../nlp.js";
import { containments } from "../../scripts/entry-index.js";
import { attributes, eachAttribute } from "../../scripts/entry-verify.js";
import { entries, lookupKey } from "../../src/rules/no-bad-words.js";
import type { LintError } from "../../src/types/index.js";

const tests = [
  ["", [], "an empty string"],
  ["it's there", [], "nothing on the list"],
  [
    "unfortunately, they are few and far between",
    [
      {
        id: "no-bad-words",
        start: 24,
        end: 43,
        suggestions: [{ range: [24, 43], text: "scarce" }],
      },
    ],
    "a cliche",
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
    "an inelegant variation",
  ],
  [
    "In my opinion, the policy will fail",
    [
      {
        id: "no-bad-words",
        start: 0,
        end: 13,
        suggestions: [{ range: [0, 18], text: "The" }],
      },
    ],
    "an empty phrase, which is deleted rather than replaced",
  ],
  [
    "the fact that he left",
    [{ id: "no-bad-words", start: 0, end: 13 }],
    "an empty phrase whose entry gives advice instead of a replacement",
  ],
  [
    "At this point in time, we have no plans to hire.",
    [
      {
        id: "no-bad-words",
        start: 0,
        end: 21,
        suggestions: [{ range: [0, 21], text: "now" }],
      },
    ],
    "the broad 'at a point in time' leaves the replacement for 'this' in place",
  ],
  [
    "From the point of view of the users, the change is welcome.",
    [{ id: "no-bad-words", start: 0, end: 25 }],
    "the advice for 'from the point of view of' wins over deleting the shorter phrase",
  ],
] as [text: string, errors: LintError[], name: string][];

describe("no-bad-words", () => {
  tests.forEach(([text, expected, name]) => {
    it(name, () => {
      const actual = lint(nlp(text));
      assert.deepEqual(
        actual,
        expected.map((error, i) => ({ ...error, message: actual[i]?.message })),
      );
    });
  });
});

describe("no-bad-words entries", () => {
  it("is sorted by lookup key, so the list can be scanned by eye", () => {
    const keys = entries.map(({ phrase }) => lookupKey(phrase));
    const sorted = [...keys].sort((a, b) => a.localeCompare(b, "en"));
    const firstUnsorted = keys.findIndex((key, i) => key !== sorted[i]);
    assert.equal(
      firstUnsorted,
      -1,
      firstUnsorted === -1
        ? ""
        : `"${keys[firstUnsorted]}" is out of order; expected "${sorted[firstUnsorted]}"`,
    );
  });

  it("has no duplicate phrases", () => {
    const seen = new Set<string>();
    const duplicates = entries
      .map(({ phrase }) => phrase)
      .filter((phrase) =>
        seen.has(phrase) ? true : (seen.add(phrase), false),
      );
    assert.deepEqual(duplicates, []);
  });

  const reviewed = [
    ["a pivotal moment", "a crucial/pivotal/vital/key role/moment", "advice"],
    ["a sense of", "a sense of anticipation", "advice"],
    ["a sense of (noun)", "a sense of anticipation", "advice"],
    ["a sense of (noun)", "make a lot of sense", "advice"],
    ["a stark contrast", "stand in stark contrast", "advice"],
    ["a testament to", "be a testament to", "span"],
    ["a turning point", "mark a turning point", "advice"],
    ["add a layer", "add a layer of complexity", "span"],
    ["at a point in time", "at that point in time", "advice"],
    ["at a point in time", "at this point in time", "advice"],
    ["become/get smaller/shorter", "become/get smaller/shorter than", "span"],
    ["become/get taller/bigger", "become/get taller/bigger than", "span"],
    ["commitment to", "a commitment to excellence", "advice"],
    ["delve", "delve into", "span"],
    ["enduring", "an enduring legacy", "advice"],
    ["enduring", "symbolize its ongoing/enduring/lasting", "advice"],
    [
      "emphasize",
      "emphasize/underscore/highlight the need/potential",
      "advice",
    ],
    [
      "highlight",
      "emphasize/underscore/highlight the need/potential",
      "advice",
    ],
    ["honest", "to be honest", "span"],
    ["interplay", "a complex interplay", "span"],
    ["it is worth noting", "it seems important to note", "advice"],
    ["landscape", "evolving landscape", "advice"],
    ["meticulous", "meticulous attention", "span"],
    ["multifaceted", "a multifaceted nature", "span"],
    ["navigate", "ability to navigate", "advice"],
    ["navigate", "navigate the complex", "advice"],
    ["pave the way", "pave the way for the future", "advice"],
    ["pivotal", "a crucial/pivotal/vital/key role/moment", "advice"],
    ["pivotal", "a pivotal moment", "advice"],
    ["pivotal", "play a pivotal/crucial role", "advice"],
    ["profound", "most profound", "span"],
    ["quietly", "speak/say quietly", "advice"],
    ["realm", "in the realm of", "span"],
    ["resonate", "resonate with", "span"],
    ["shed light", "shed light on", "span"],
    [
      "underscore",
      "emphasize/underscore/highlight the need/potential",
      "advice",
    ],
    ["unwavering", "an unwavering commitment", "advice"],
  ];

  it("has no unreviewed rule sitting under a broader one", () => {
    const found = containments()
      .map(({ broad, narrow }) => `${broad.phrase} < ${narrow.phrase}`)
      .sort();
    assert.deepEqual(
      found,
      reviewed.map(([broad, narrow]) => `${broad} < ${narrow}`).sort(),
    );
  });

  it("gives every entry a replacement or a message", () => {
    const silent = entries.filter(
      ({ suggestions, message, category }) =>
        !suggestions && !message && !category,
    );
    assert.deepEqual(silent, []);
  });

  it("only selects on attributes the input contract defines", () => {
    const problems: string[] = [];
    entries.forEach(({ phrase, selector }) =>
      eachAttribute(cssWhat.parse(selector), (name, value) => {
        if (!(name in attributes)) {
          problems.push(`${phrase}: unknown attribute [${name}]`);
          return;
        }

        const allowed = attributes[name];
        if (allowed != null && !allowed.includes(value)) {
          problems.push(
            `${phrase}: [${name}=${value}] is not one of ${allowed.join(", ")}`,
          );
        }
      }),
    );
    assert.deepEqual(problems, []);
  });
});

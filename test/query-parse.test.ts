import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as cssWhat from "css-what";
import queryParse from "../src/query-parse.js";
import nlp from "./nlp.js";

const tests = [
  ["Chad writes good", [], [], "no selectors"],
  [
    "Chad writes good",
    ["[Person=3]"],
    [{ selectorIndex: 0, tree: [1] }],
    "no selectors",
  ],
  ["utilize this tool", ["[form=test i]"], [], "a non-matching selector"],
  [
    "test",
    ["[form=test i]"],
    [{ selectorIndex: 0, tree: [0] }],
    "a matching selector by form",
  ],
  [
    "test",
    [":matches([form=works i], [form=test i], [form=fails i])"],
    [{ selectorIndex: 0, tree: [0] }],
    "a matching selector by form using :matches",
  ],
  [
    "tell John",
    ["[xpos=NOUN]"],
    [{ selectorIndex: 0, tree: [1] }],
    "a matching selector by tag",
  ],
  [
    "I told John",
    ["[lemma=tell]"],
    [{ selectorIndex: 0, tree: [1] }],
    "a matching selector by lemma",
  ],
  [
    "check these out",
    ["[lemma=check] > [form=out i]"],
    [{ selectorIndex: 0, tree: [0, 2] }],
    "a 2-level dependency relation",
  ],
  [
    "looking for jobs",
    ["[lemma=look] > [form=for i] > [lemma=job]"],
    [{ selectorIndex: 0, tree: [0, 1, 2] }],
    "query-parse witha a 3-level dependency relation",
  ],
  [
    "looking for jobs",
    [
      "[lemma=look] > [form=up i]",
      "[lemma=look] > [form=down i]",
      "[lemma=look] > [form=for i] > [lemma=job]",
    ],
    [{ selectorIndex: 2, tree: [0, 1, 2] }],
    "a matching selector having other selectors",
  ],
  [
    "it could definitely be a reason why they failed",
    [
      "[Mood] > [lemma=be] > [lemma=reason] > :matches([form=why i], [form=for i])",
    ],
    [{ selectorIndex: 0, tree: [1, 3, 5, 6] }],
    "a complex query",
  ],
  [
    "It's fun to edit",
    [
      "[xpos=VERB] > [form=it i] ~ :matches([xpos=NOUN], [xpos=ADJ], [xpos=ADV]) > [form=to i] > [xpos=VERB]",
    ],
    [{ selectorIndex: 0, tree: [1, 0, 2, 3, 4] }],
    "a complex query",
  ],
  [
    "I was lost but now I am found",
    ["[lemma=be] > [form=i i] ~ [lemma=lose]"],
    [{ selectorIndex: 0, tree: [1, 0, 2] }],
    "a complex query",
  ],
  [
    "steel reinforcement corrosion protection rods",
    [
      "[lemma=rod] > [lemma=steel] ~ [form=reinforcement i] ~ [lemma=corrosion] ~ [form=protection i]",
    ],
    [{ selectorIndex: 0, tree: [4, 0, 1, 2, 3] }],
    "a complex query requiring multiple siblings",
  ],
  [
    "she really likes you",
    ["[lemma=like] > [Number=Sing][PronType=Prs] ~ [PronType=Prs]"],
    [{ selectorIndex: 0, tree: [2, 0, 3] }],
    "a sibling with multiple attributes",
  ],
  [
    "she likes you",
    ["[lemma=like] > :matches([PronType=Prs], [xpos=NOUN]) ~ [PronType=Prs]"],
    [{ selectorIndex: 0, tree: [1, 0, 2] }],
    "a sibling with a pseudoselector",
  ],
  [
    "you have been doing it",
    ["[lemma=have] [lemma=do]"],
    [{ selectorIndex: 0, tree: [1, 3] }],
    "a descendant",
  ],
] as [
  text: string,
  selectors: string[],
  expected: { selectorIndex: number; tree: number[] }[],
  name: string,
][];

describe("query-parse", () => {
  tests.forEach(([text, selectors, expected, name]) => {
    it(name, () => {
      const actual = queryParse(nlp(text)[0], selectors.map(cssWhat.parse));
      assert.deepEqual(actual, expected);
    });
  });
});

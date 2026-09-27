import assert from "node:assert/strict";
import { describe, it } from "node:test";
import similes from "../../src/rules/no-similes.js";
import nounClusters from "../../src/rules/no-noun-clusters.js";
import absolutes from "../../src/rules/no-absolute-phrases.js";
import fallback from "../nlp.js";
import trained from "../trained-nlp.js";

const cases = [
  {
    rule: similes,
    negatives: [
      "including genuine anti-Stalinist intellectuals like Spender and Silone",
      "things like B♭–E♭–A♭",
      "Figures like Josef Muller-Brockmann, Emil Ruder, and Armin Hofmann",
      'forms like "am certain"',
      "Zao Wou-Ki bridged Abstract Expressionism and Chinese landscape painting decades ago, but contemporary artists like Zheng Chongbin are pushing further — using ink's material properties (flow, absorption, transparency) as conceptual content, not just medium.",
      "Elvin is cycling a 4/4 that tilts toward a rolling triplet feel, and Tyner's voicings are stacked fourths rooted on F: things like B♭–E♭–A♭ over the pedal, or E♭–A♭–D♭ for a Phrygian color.",
      "The offer \"here's a chart and 150 words about LLM self-consistency, use it however you like, link optional\" has a very good one, because you're solving their problem rather than adding to it.",
    ],
    positives: [
      "he was targeted like a missile",
      "The evening settled like a duvet over bones.",
      "I landed on the pavement like a sack of unwrapped potatoes.",
      "He swallowed the meal like a wolf.",
      "He swallowed berries like a wolf.",
      "The wind cluster behaves like a drone made of dissonances.",
    ],
  },
  {
    rule: nounClusters,
    negatives: [
      "That last one is because the budget gate sizes wallets from the run",
      "Throughput note worth flagging now:**",
      "so the slice checks 3 batches and the widen checks 25;",
      "pairwise violation rate | 0.00% | **44.81%",
      "steel protection strips are optional",
      "We counted 3 steel protection strips.",
    ],
    positives: [
      "stainless steel protection strips are optional",
      "stainless steel corrosion protection strips are optional",
    ],
  },
  {
    rule: absolutes,
    negatives: [
      "Behavioral contradictions** — saying one thing, doing another.",
      "Behavioral contradictions: saying one thing, doing another.",
      "Pick one industry vertical where you already have a few matches — say, e-commerce businesses doing $1-5M in revenue.",
      "Pick one industry vertical where you already have a few matches: say, e-commerce businesses doing $1-5M in revenue.",
      "Vagal afferents, microbial tryptophan metabolism (kynurenine pathway, indole derivatives activating AhR), short-chain fatty acids crossing the BBB — all real biology.",
    ],
    positives: [
      "He typed a reply, his fingers trembling slightly",
      "His hands shaking, he opened the envelope.",
      "She waited, her hands shaking.",
    ],
  },
];

describe("structural rule precision with both providers", () => {
  for (const parse of [fallback, trained]) {
    for (const { rule, negatives, positives } of cases) {
      for (const text of negatives) {
        it(`leaves ${text} unflagged`, () => {
          assert.deepEqual(rule(parse(text)), []);
          assert.deepEqual(rule(parse(text.replaceAll("*", " "))), []);
        });
      }

      for (const text of positives) {
        it(`reports ${text}`, () => {
          assert.ok(rule(parse(text)).length > 0);
        });
      }
    }
  }
});

describe("similes marked good in corpus review", () => {
  for (const text of [
    "By the fourth time through you will have the architecture, and the music will stop sounding like a shimmer and start sounding like a building.",
    "For the first four minutes he's inside the mode — minor-pentatonic licks, chromatic passing tones, the four-note cell recurring like a prayer bead.",
    "Listen to how Coltrane *announces* each transposition — he lands on the root cleanly, like ringing a bell, before moving on.",
    "The subject is a sighing, chromatically inflected line that sounds like a chorale the moment you hear it;",
    "What makes the piece work is what Bach does with the stretto entries in the last third: voices begin to overlap more tightly, the subject starts chasing itself, and the texture thickens into something that feels like grief pressing inward from all sides.",
    "This is why gagaku often strikes first-time listeners as simultaneously austere and psychedelic: the wind cluster behaves like a drone made of dissonances, but it breathes.",
  ]) {
    it(text, () => {
      assert.ok(similes(fallback(text)).length > 0);
    });
  }
});

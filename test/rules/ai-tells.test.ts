import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint, { defaults } from "../../src/index.js";
import tells from "../../src/tells.js";
import nlp from "../nlp.js";

const kindsIn = (text: string) => tells(nlp(text)).map(({ kind }) => kind);

const spansIn = (text: string) =>
  tells(nlp(text)).map(({ start, end }) => text.slice(start, end));

const flagged = (text: string, id: string) =>
  lint(nlp(text), defaults)
    .filter((error) => error.id === id)
    .map(({ start, end }) => text.slice(start, end));

describe("tells: a noun with a clause hung on it", () => {
  [
    "The open-source pieces every product shares.",
    "The same rules where you already write.",
  ].forEach((text) => {
    it(`finds "${text}"`, () => {
      assert.deepEqual(kindsIn(text), ["noun-fragment"]);
      assert.deepEqual(spansIn(text), [text.slice(0, -1)]);
    });
  });

  [
    "Every product shares these open-source pieces.",
    "No.",
    "A week under the sun.",
    "The rules changed where you already write.",
    "What are the rules you already know?",
  ].forEach((text) => {
    it(`leaves "${text}" alone`, () => {
      assert.deepEqual(kindsIn(text), []);
    });
  });
});

describe("tells: an idea announced and praised", () => {
  [
    "There's one more effect, and it's the one I like best.",
    "And here's the thing nobody tells you.",
    "The best part is the price.",
  ].forEach((text) => {
    it(`finds "${text}"`, () => {
      assert.deepEqual(kindsIn(text), ["teaser"]);
    });
  });

  it("leaves a plain count alone", () => {
    assert.deepEqual(kindsIn("I ate one more apple and left."), []);
  });
});

describe("tells: here is, then a colon", () => {
  it("finds the announcement", () => {
    assert.deepEqual(
      kindsIn(
        "Here's the whole job, and it fits in a Saturday afternoon plus some waiting:",
      ),
      ["announcement"],
    );
  });

  it("leaves here without a colon alone", () => {
    assert.deepEqual(kindsIn("Here is the report you asked for."), []);
  });
});

describe("tells: a tail that comments on its own sentence", () => {
  it("finds it and reports the tail only", () => {
    const text =
      "A small cheque in the right year beats a fat one, which is the bit a page buries in a chart.";
    assert.deepEqual(kindsIn(text), ["which-tail"]);
    assert.deepEqual(spansIn(text), [
      ", which is the bit a page buries in a chart",
    ]);
  });

  it("leaves a which that describes a noun alone", () => {
    assert.deepEqual(kindsIn("He sold the car, which had never run well."), []);
  });
});

describe("tells: figures given too exactly", () => {
  it("finds the arithmetic once and the long decimal", () => {
    const text = "Thirty years is 3.869 times 1.967, near 7.61, or 14.9744.";
    assert.deepEqual(spansIn(text), ["3.869 times 1.967", "14.9744"]);
  });

  it("leaves a rounded figure alone", () => {
    assert.deepEqual(kindsIn("It grows by 1.07 each year, to 7.61."), []);
  });
});

describe("no-bad-sentence-structures reports the tells", () => {
  it("flags the tagline", () => {
    assert.deepEqual(
      flagged(
        "The open-source pieces every product shares.",
        "no-bad-sentence-structures",
      ),
      ["The open-source pieces every product shares"],
    );
  });
});

describe("no-negated-contrasts: a bare tail", () => {
  it("flags a noun phrase negated after a comma", () => {
    assert.deepEqual(
      flagged(
        "Ransomware is the real threat, not a bored data centre in Oregon.",
        "no-negated-contrasts",
      ),
      [", not a bored data centre in Oregon"],
    );
  });

  [
    "I asked him, not that it mattered.",
    "She left early, not because she was tired.",
    "He came, but not to see me.",
  ].forEach((text) => {
    it(`leaves "${text}" alone`, () => {
      assert.deepEqual(flagged(text, "no-negated-contrasts"), []);
    });
  });
});

describe("no-bad-words: the new entries", () => {
  it("flags a result that lands near a number", () => {
    assert.deepEqual(
      flagged("Forty years lands near 14.97 in the end.", "no-bad-words"),
      ["lands near"],
    );
  });

  it("leaves a plane that lands alone", () => {
    assert.deepEqual(
      flagged("The plane lands at Heathrow tonight.", "no-bad-words"),
      [],
    );
  });

  it("flags the pitch", () => {
    assert.deepEqual(
      flagged("But the answer is simpler than you think.", "no-bad-words"),
      ["than you think"],
    );
  });
});

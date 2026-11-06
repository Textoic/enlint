import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint from "../../src/index.js";
import fallback from "../nlp.js";
import trained from "../trained-nlp.js";

const cases = [
  ["Honestly, I am not sure which is worse.", "be not sure"],
  ["I am not sure if the train is delayed.", "be not sure"],
  ["She was not sure about the exact date.", "be not sure"],
  ["I am unsure which is worse.", "be unsure"],
  ["We are unsure if the train is late.", "be unsure"],
  ["She was unsure about the deadline.", "be unsure"],
];

describe("uncertainty advice preserves its finding without a universal doubt replacement", () => {
  for (const parse of [fallback, trained]) {
    for (const [text, phrase] of cases) {
      it(`${parse === trained ? "trained" : "rules"}: ${text}`, () => {
        const findings = lint(parse(text), { "no-bad-words": true });
        const uncertainty = findings.filter(
          (finding) => finding.case === phrase,
        );
        assert.equal(uncertainty.length, 1);
        assert.equal(uncertainty[0].suggestions, undefined);
        assert.match(
          uncertainty[0].message,
          /lacks knowledge or doubts a claim/u,
        );
      });
    }
  }
});

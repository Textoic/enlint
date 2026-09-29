import assert from "node:assert/strict";
import { describe, it } from "node:test";
import rule from "../../src/rules/no-explained-antonyms.js";
import fallback from "../nlp.js";
import trained from "../trained-nlp.js";

for (const [name, parse] of [
  ["fallback", fallback],
  ["trained", trained],
] as const) {
  describe(`antonym meaning with ${name}`, () => {
    for (const text of [
      "Now they knew for sure: she wasn't human.",
      "But the raven, who wasn't human anymore, understood.",
      "They aren't human;",
      "It was clearly not human;",
      "You can't accept it, can you?",
      "No one remembers him now, but he can't forget.",
      "She would not accept the offer.",
      "They should not forget the war.",
    ]) {
      it(`preserves ${text}`, () => {
        assert.deepEqual(rule(parse(text)), []);
      });
    }

    it("still replaces a negated verb with do support", () => {
      const errors = rule(parse("He does not like it."));
      assert.equal(errors.length, 1);
      assert.equal(errors[0].suggestions?.[0].text, "dislikes");
    });
  });
}

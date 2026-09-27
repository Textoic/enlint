import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { verifyExamples, type Example } from "../../scripts/entry-verify.js";
import { entries } from "../../src/rules/no-bad-words.js";

const fixture = JSON.parse(
  await readFile(
    fileURLToPath(
      new URL("../fixtures/no-bad-words-examples.json", import.meta.url),
    ),
    "utf8",
  ),
) as Record<string, Example[]>;

describe("no-bad-words examples", () => {
  const byPhrase = new Map(entries.map((entry) => [entry.phrase, entry]));

  it("has an entry for every phrase in the fixture", () => {
    assert.deepEqual(
      Object.keys(fixture).filter((phrase) => !byPhrase.has(phrase)),
      [],
      "the fixture names entries that are no longer on the list; remove them or restore the entry",
    );
  });

  Object.entries(fixture).forEach(([phrase, examples]) => {
    const entry = byPhrase.get(phrase);
    if (!entry) {
      return;
    }

    it(`${phrase} still matches its examples`, () => {
      const problems = verifyExamples(entry, examples).flatMap(
        ({ example, problems }) =>
          problems.map((problem) => `- "${example.text}": ${problem}`),
      );
      assert.deepEqual(problems, []);
    });
  });
});

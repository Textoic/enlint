import assert from "node:assert/strict";
import { describe, it } from "node:test";
import triage from "../scripts/entry-triage.js";
import { entries } from "../src/rules/no-bad-words.js";

describe("entry-triage", () => {
  const plain = entries.filter(({ phrase }) => !/[/()*]/u.test(phrase));

  it("reports every expression already on the list as covered", () => {
    assert.deepEqual(
      plain
        .filter(({ phrase }) => triage(phrase).verdict.case !== "covered")
        .map(({ phrase }) => phrase)
        .sort(),
      [],
    );
  });

  it("reports an expression nothing on the list mentions as new", () => {
    assert.equal(triage("quokka telemetry").verdict.case, "new");
  });

  it("keeps the broader rule when one already exists", () => {
    const { verdict } = triage("delve into");
    assert.equal(verdict.case, "covered");
    assert.ok(
      verdict.case === "covered" &&
        verdict.entries.some(({ phrase }) => phrase === "delve"),
    );
  });

  it("sees past a :matches of alternatives", () => {
    const { verdict } = triage("utilise");
    assert.equal(verdict.case, "covered");
  });

  it("proposes abstracting when enough rules circle one word", () => {
    const { verdict } = triage("a stark difference");
    assert.equal(verdict.case, "abstract");
    assert.ok(verdict.case === "abstract" && verdict.entries.length >= 3);
  });

  it("proposes widening when the candidate is broader than an existing rule", () => {
    const { verdict } = triage("groundwork");
    assert.equal(verdict.case, "widen");
    assert.ok(
      verdict.case === "widen" &&
        verdict.entries.some(({ phrase }) => phrase === "lay the groundwork"),
    );
  });
});

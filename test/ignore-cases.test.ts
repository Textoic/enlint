import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint, { defaults, withoutIgnoredCases } from "../src/index.js";
import { casesOf, hasCases, ruleCatalog } from "../src/catalog.js";
import { ErrorId, type Config } from "../src/types/index.js";
import nlp from "./nlp.js";

const lintWith = (text: string, config: Config = defaults) =>
  lint(nlp(text), config);

const idsIn = (text: string, config?: Config) =>
  lintWith(text, config).map(({ id }) => id);

describe("case keys", () => {
  it("names the intensified word", () => {
    const [problem] = lintWith("The room was very dirty.");
    assert.equal(problem.id, ErrorId.NO_EXPLAINED_INTENSIFIERS);
    assert.equal(problem.case, "dirty");
  });

  it("names the negated word", () => {
    const [problem] = lintWith("I do not agree.");
    assert.equal(problem.id, ErrorId.NO_EXPLAINED_ANTONYMS);
    assert.equal(problem.case, "agree");
  });

  it("names the bad-word entry by its phrase", () => {
    const [problem] = lintWith("utilize this tool");
    assert.equal(problem.case, "utilize / utilise / put to use");
  });

  it("leaves general rules without a case", () => {
    const passive = lintWith("The piano is played by John.").find(
      ({ id }) => id === ErrorId.NO_PASSIVE_SENTENCES,
    );
    assert.ok(passive);
    assert.equal(passive.case, undefined);
  });
});

describe("ignored cases", () => {
  it("drops an ignored intensifier and nothing else", () => {
    const text = "The room was very dirty and the food was very bad.";
    const config = {
      ...defaults,
      ignore: { [ErrorId.NO_EXPLAINED_INTENSIFIERS]: ["dirty"] },
    };
    const remaining = lintWith(text, config);
    assert.deepEqual(
      remaining.map(({ case: key }) => key),
      ["bad"],
    );
  });

  it("matches keys regardless of case and surrounding space", () => {
    const config = {
      ...defaults,
      ignore: { [ErrorId.NO_BAD_WORDS]: ["  Utilize / UTILISE / put to use "] },
    };
    assert.deepEqual(idsIn("utilize this tool", config), []);
  });

  it("filters before overlap resolution so a narrower problem survives", () => {
    const wide = {
      id: ErrorId.NO_BAD_WORDS,
      start: 0,
      end: 20,
      message: "wide",
      suggestions: [{ range: [0, 20] as [number, number], text: "x" }],
      case: "wide phrase",
    };
    const narrow = { ...wide, end: 5, message: "narrow", case: "narrow" };
    const kept = withoutIgnoredCases([wide, narrow], {
      [ErrorId.NO_BAD_WORDS]: ["wide phrase"],
    });
    assert.deepEqual(
      kept.map(({ message }) => message),
      ["narrow"],
    );
  });

  it("ignores nothing when the ignore list names another rule", () => {
    const config = {
      ...defaults,
      ignore: { [ErrorId.NO_EXPLAINED_ANTONYMS]: ["dirty"] },
    };
    assert.deepEqual(idsIn("The room was very dirty.", config), [
      ErrorId.NO_EXPLAINED_INTENSIFIERS,
    ]);
  });
});

describe("rule catalog", () => {
  it("describes every rule once", () => {
    assert.deepEqual(
      ruleCatalog.map(({ id }) => id).sort(),
      Object.values(ErrorId).sort(),
    );
  });

  it("lists unique case keys for each case rule", () => {
    ruleCatalog
      .filter(({ id }) => hasCases(id))
      .forEach(({ id }) => {
        const keys = casesOf(id).map(({ key }) => key.toLowerCase());
        assert.ok(keys.length > 0, id);
        assert.equal(new Set(keys).size, keys.length, id);
      });
  });

  it("lists no cases for general rules", () => {
    assert.deepEqual(casesOf(ErrorId.NO_PASSIVE_SENTENCES), []);
  });

  it("gives examples that the rule reports", () => {
    const everyRule = Object.fromEntries(
      Object.values(ErrorId).map((id) => [id, true]),
    ) as Config;
    ruleCatalog.forEach(({ id, examples }) => {
      examples.forEach(({ text }) => {
        const found = idsIn(text, { ...everyRule, [id]: true });
        const alone = idsIn(text, { [id]: true });
        assert.ok(
          found.includes(id) || alone.includes(id),
          `${id} does not report its example "${text}"`,
        );
      });
    });
  });
});

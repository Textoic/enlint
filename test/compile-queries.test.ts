import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as cssWhat from "css-what";
import compileQueries, {
  candidates,
  requiredLiterals,
} from "../src/compile-queries.js";
import queryParse from "../src/query-parse.js";
import { entries } from "../src/rules/no-bad-words.js";
import { ErrorId, type Query } from "../src/types/index.js";
import nlp from "./nlp.js";

const literals = (selector: string) =>
  requiredLiterals(cssWhat.parse(selector))
    .map((alternative) => [...alternative].sort())
    .sort((a, b) => a.join().localeCompare(b.join()));

describe("compile-queries: required literals", () => {
  const tests = [
    ["[form=delve i]", [["form:delve"]], "a single form"],
    ["[lemma=Delve]", [["lemma:delve"]], "a lemma, case-folded"],
    [
      "[lemma=delve] > [form=into i]",
      [["form:into", "lemma:delve"]],
      "a chain, which requires every literal in it",
    ],
    [
      ":matches([form=amiable i], [form=amicable i])",
      [["form:amiable"], ["form:amicable"]],
      "a disjunction, which requires one branch or the other",
    ],
    [
      ":matches([lemma=become], [lemma=get]) > [form=hot i]",
      [
        ["form:hot", "lemma:become"],
        ["form:hot", "lemma:get"],
      ],
      "a disjunction crossed with the rest of the chain",
    ],
    [
      "[lemma=work] > [form=tirelessly i], [form=amidst i]",
      [["form:amidst"], ["form:tirelessly", "lemma:work"]],
      "a comma, which is a disjunction like :matches",
    ],
    ["[xpos=VERB][Mood=Pot]", [[]], "no literal at all"],
    ["[lemma=be] > [xpos=ADJ]", [["lemma:be"]], "only the literal it does pin"],
    [
      "[form]",
      [[]],
      "an existence test, which does not require any particular word",
    ],
    [
      "[lemma=go] > :not([form=out i])",
      [["lemma:go"]],
      "a negation, whose literal is not required",
    ],
    [
      ":matches([lemma=be], [xpos=VERB]) > [form=so i]",
      [["form:so"]],
      "a disjunction with an unconstrained branch",
    ],
  ] as [selector: string, expected: string[][], name: string][];

  tests.forEach(([selector, expected, name]) => {
    it(name, () => assert.deepEqual(literals(selector), expected));
  });
});

const query = (selector: string): Query => ({
  selector,
  message: selector,
  id: ErrorId.NO_BAD_WORDS,
});

describe("compile-queries: the index", () => {
  it("puts every query in exactly one of the two buckets", () => {
    const queries = [
      query("[lemma=delve]"),
      query("[xpos=VERB][Mood=Pot]"),
      query(":matches([lemma=become], [lemma=get]) > [form=hot i]"),
    ];
    const { index, always } = compileQueries(queries);
    const indexed = new Set([...index.values()].flat());
    assert.deepEqual(always, [1]);
    assert.deepEqual([...indexed].sort(), [0, 2]);
    assert.equal(indexed.size + always.length, queries.length);
  });

  it("accounts for every no-bad-words entry", () => {
    const compilation = compileQueries(
      entries.map(({ selector }) => query(selector)),
    );
    const indexed = new Set([...compilation.index.values()].flat());
    const missing = entries
      .map((entry, i) => [entry, i] as const)
      .filter(([, i]) => !indexed.has(i) && !compilation.always.includes(i))
      .map(([{ phrase }]) => phrase);
    assert.deepEqual(missing, []);
  });

  it("runs an unindexable query on every sentence", () => {
    const compilation = compileQueries([query("[xpos=VERB]")]);
    assert.deepEqual(
      candidates(compilation, nlp("nothing here resembles that query")[0]),
      [0],
    );
  });

  it("skips a query whose words are absent", () => {
    const compilation = compileQueries([
      query("[lemma=delve] > [form=into i]"),
    ]);
    assert.deepEqual(candidates(compilation, nlp("we delve deeper")[0]), []);
    assert.deepEqual(candidates(compilation, nlp("we delve into it")[0]), [0]);
  });

  it("returns candidates in declaration order", () => {
    const compilation = compileQueries([
      query("[form=far i]"),
      query("[lemma=few]"),
      query("[form=between i]"),
    ]);
    assert.deepEqual(
      candidates(compilation, nlp("they are few and far between")[0]),
      [0, 1, 2],
    );
  });
});

describe("compile-queries: filtering never loses a match", () => {
  const compilation = compileQueries(
    entries.map(({ selector }) => query(selector)),
  );

  const exhaustive = (tokens: Parameters<typeof candidates>[1]) =>
    queryParse(tokens, compilation.parsed).map(
      ({ selectorIndex, tree }) =>
        `${entries[selectorIndex].phrase}@${tree.join(",")}`,
    );

  const filtered = (tokens: Parameters<typeof candidates>[1]) => {
    const queryIndices = candidates(compilation, tokens);
    return queryParse(
      tokens,
      queryIndices.map((queryIndex) => compilation.parsed[queryIndex]),
    ).map(
      ({ selectorIndex, tree }) =>
        `${entries[queryIndices[selectorIndex]].phrase}@${tree.join(",")}`,
    );
  };

  it("agrees with running every query, on every entry's own phrase", () => {
    let matched = 0;
    const divergent: string[] = [];
    entries.forEach(({ phrase }) => {
      const text = phrase.replace(/(\S+)\/\S+/gu, "$1");
      nlp(text).forEach((tokens) => {
        const all = exhaustive(tokens).sort();
        const some = filtered(tokens).sort();
        matched += all.length;
        if (all.join("|") !== some.join("|")) {
          divergent.push(`${text}: ${all.join("|")} vs ${some.join("|")}`);
        }
      });
    });
    assert.deepEqual(divergent, []);
    assert.ok(matched > 300, `only ${matched} matches in the corpus`);
  });
});

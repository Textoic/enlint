import assert from "node:assert/strict";
import { describe, it } from "node:test";
import parseToSubtree from "../src/parse-to-subtree.js";
import nlp from "./nlp.js";

describe("parse-to-subtree", () => {
  it("a single word selected", () => {
    assert.deepEqual(parseToSubtree(nlp("Chad")[0], 0), [0]);
  });

  it("a root which has two children", () => {
    assert.deepEqual(parseToSubtree(nlp("Chad writes well")[0], 1), [0, 1, 2]);
  });
});

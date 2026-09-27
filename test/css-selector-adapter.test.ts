import assert from "node:assert/strict";
import { describe, it } from "node:test";
import adapter from "../src/css-select-adapter.js";
import type { PosTag, Node } from "../src/types/index.js";

const nodeFactory = (baseNodes: object[]): Node[] =>
  baseNodes.map((props) => ({ ...props })) as Node[];

describe("css-select-adapter", () => {
  it("isTag() with a tag node", () => {
    const nodes = nodeFactory([{ id: 0 }]);
    assert.equal(adapter(nodes).isTag(nodes[0]), true);
  });

  it("isTag() with a non-tag node", () => {
    const nodes = nodeFactory([{}]);
    assert.equal(adapter(nodes).isTag(nodes[0]), false);
  });

  it("existsOne() with one match", () => {
    const nodes = nodeFactory([{ head: -1 }]);
    assert.equal(
      adapter(nodes).existsOne(({ head }) => head === -1, nodes),
      true,
    );
  });

  it("existsOne() with many matches", () => {
    const nodes = nodeFactory([{ head: -1 }, { head: 0 }, { head: 0 }]);
    assert.equal(
      adapter(nodes).existsOne(({ head }) => head !== -1, nodes),
      true,
    );
  });

  it("existsOne() with no matches", () => {
    const nodes = nodeFactory([{ head: -1 }, { head: 0 }]);
    assert.equal(
      adapter(nodes).existsOne(({ head }) => head === -2, nodes),
      false,
    );
  });

  it("getAttributeValue() with an attribute", () => {
    const nodes = nodeFactory([{ lemma: "be" }]);
    assert.equal(adapter(nodes).getAttributeValue(nodes[0], "lemma"), "be");
  });

  it("getAttributeValue() with no attribute", () => {
    const nodes = nodeFactory([{}]);
    assert.equal(
      adapter(nodes).getAttributeValue(nodes[0], "lemma"),
      undefined,
    );
  });

  it("getChildren() with children", () => {
    const nodes = nodeFactory([{ head: -1 }, { head: 0 }]);
    assert.deepEqual(adapter(nodes).getChildren(nodes[0]), [nodes[1]]);
  });

  it("getChildren() with no children", () => {
    const nodes = nodeFactory([{ head: -1 }]);
    assert.deepEqual(adapter(nodes).getChildren(nodes[0]), []);
  });

  it("getName() with a name", () => {
    const nodes = nodeFactory([{ tagName: "span" }]);
    assert.equal(adapter(nodes).getName(nodes[0]), "span");
  });

  it("getName() with no name", () => {
    const nodes = nodeFactory([{}]);
    assert.equal(adapter(nodes).getName(nodes[0]), "");
  });

  it("getParent() with parent", () => {
    const nodes = nodeFactory([{ head: -1 }, { head: 0 }]);
    assert.deepEqual(adapter(nodes).getParent(nodes[1]), nodes[0]);
  });

  it("getParent() with no parent", () => {
    const nodes = nodeFactory([{ head: -1 }]);
    assert.equal(adapter(nodes).getParent(nodes[0]), null);
  });

  it("getParent() with no parent property", () => {
    const nodes = nodeFactory([{}]);
    assert.equal(adapter(nodes).getParent(nodes[0]), null);
  });

  it("getSiblings() with siblings", () => {
    const nodes = nodeFactory([{ head: -1 }, { head: 0 }, { head: 0 }]);
    assert.deepEqual(adapter(nodes).getSiblings(nodes[1]), [
      nodes[1],
      nodes[2],
    ]);
  });

  it("getSiblings() with no siblings", () => {
    const nodes = nodeFactory([{ head: -1 }, { head: 0 }]);
    assert.deepEqual(adapter(nodes).getSiblings(nodes[1]), [nodes[1]]);
  });

  it("getSiblings() with no parent", () => {
    const nodes = nodeFactory([{ head: -1 }]);
    assert.deepEqual(adapter(nodes).getSiblings(nodes[0]), [nodes[0]]);
  });

  it("getText() with text", () => {
    const nodes = nodeFactory([{ id: 0, form: "Hi", head: -1, at: 0 }]);
    assert.equal(adapter(nodes).getText(nodes[0]), "Hi");
  });

  it("getText() with children with text", () => {
    const nodes = nodeFactory([
      { id: 0, form: "I", head: 2, misc: { at: 0 } },
      { id: 1, form: '"', head: 2, misc: { at: 2 } },
      { id: 2, form: "love", head: -1, misc: { at: 3 } },
      { id: 3, form: '"', head: 2, misc: { at: 7 } },
      { id: 4, form: "it", head: 2, misc: { at: 9 } },
    ]);
    assert.equal(adapter(nodes).getText(nodes[2]), 'I "love" it');
  });

  it("getText() with many nodes", () => {
    const nodes = nodeFactory([
      { id: 0, form: "I", head: 1, at: 0 },
      { id: 1, form: "love", head: -1, at: 2 },
      { id: 2, form: "it", head: 1, at: 6 },
    ]);
    assert.equal(adapter(nodes).getText([nodes[0], nodes[2]]), "I it");
  });

  it("getText() with no text", () => {
    const nodes = nodeFactory([{ id: 0, head: -1, at: 0 }]);
    assert.equal(adapter(nodes).getText(nodes[0]), "");
  });

  it("hasAttrib() with an attribute", () => {
    const nodes = nodeFactory([{ id: 0 }]);
    assert.equal(adapter(nodes).hasAttrib(nodes[0], "id"), true);
  });

  it("hasAttrib() with no attribute", () => {
    const nodes = nodeFactory([{}]);
    assert.equal(adapter(nodes).hasAttrib(nodes[0], "id"), false);
  });

  it("hasAttrib() with an undefined attribute", () => {
    const nodes = nodeFactory([{ id: undefined }]);
    assert.equal(adapter(nodes).hasAttrib(nodes[0], "id"), false);
  });

  it("removeSubsets() with identical trees", () => {
    const nodes = nodeFactory([{ head: -1 }]);
    assert.deepEqual(adapter(nodes).removeSubsets([nodes[0], nodes[0]]), nodes);
  });

  it("removeSubsets() with subset first", () => {
    const nodes = nodeFactory([{ head: -1 }, { head: 0 }]);
    assert.deepEqual(adapter(nodes).removeSubsets(nodes), [nodes[0]]);
  });

  it("removeSubsets() with subset last", () => {
    const nodes = nodeFactory([{ head: 1 }, { head: -1 }]);
    assert.deepEqual(adapter(nodes).removeSubsets(nodes), [nodes[0]]);
  });

  it("removeSubsets() with unique trees", () => {
    const nodes = nodeFactory([{ head: 2 }, { head: 2 }, { head: -1 }]);
    assert.deepEqual(adapter(nodes).removeSubsets([nodes[0], nodes[1]]), [
      nodes[0],
      nodes[1],
    ]);
  });

  it("findAll() with one match", () => {
    const nodes = nodeFactory([
      { xpos: "NOUN" as PosTag, head: 1 },
      { xpos: "VERB" as PosTag, head: -1 },
    ]);
    assert.deepEqual(
      adapter(nodes).findAll(({ xpos }) => xpos === "NOUN", [nodes[1]]),
      [nodes[0]],
    );
  });

  it("findAll() with many matches", () => {
    const nodes = nodeFactory([
      { xpos: "NOUN" as PosTag, head: 2 },
      { xpos: "NOUN" as PosTag, head: 2 },
      { xpos: "NOUN" as PosTag, head: -1 },
    ]);
    assert.deepEqual(
      adapter(nodes).findAll(({ xpos }) => xpos === "NOUN", [nodes[2]]),
      [nodes[2], nodes[1], nodes[0]],
    );
  });

  it("findAll() with no matches", () => {
    const nodes = nodeFactory([
      { xpos: "NOUN" as PosTag, head: 1 },
      { xpos: "VERB" as PosTag, head: -1 },
    ]);
    assert.deepEqual(
      adapter(nodes).findAll(({ xpos }) => xpos === "ADJ", nodes),
      [],
    );
  });

  it("findOne() with one match", () => {
    const nodes = nodeFactory([
      { xpos: "NOUN" as PosTag, head: 1 },
      { xpos: "VERB" as PosTag, head: -1 },
    ]);
    assert.equal(
      adapter(nodes).findOne(({ xpos }) => xpos === "NOUN", [nodes[1]]),
      nodes[0],
    );
  });

  it("findOne() with many matches", () => {
    const nodes = nodeFactory([
      { xpos: "NOUN" as PosTag, head: 2 },
      { xpos: "NOUN" as PosTag, head: 2 },
      { xpos: "NOUN" as PosTag, head: -1 },
    ]);
    assert.equal(
      adapter(nodes).findOne(({ xpos }) => xpos === "NOUN", [nodes[2]]),
      nodes[2],
    );
  });

  it("findOne() with no matches", () => {
    const nodes = nodeFactory([
      { xpos: "NOUN" as PosTag, head: 1 },
      { xpos: "VERB" as PosTag, head: -1 },
    ]);
    assert.equal(
      adapter(nodes).findOne(({ xpos }) => xpos === "ADJ", nodes),
      null,
    );
  });
});

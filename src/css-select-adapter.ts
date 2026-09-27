import type { Node, NodeTestFunction } from "./types/index.js";

const childrenByParent = (nodes: Node[]) =>
  nodes.reduce((children, node) => {
    if (!children.has(node)) {
      children.set(node, []);
    }

    if (node.head !== -1) {
      const parent = nodes[node.head];
      const siblings = children.get(parent);
      if (siblings) {
        siblings.push(node);
      } else {
        children.set(parent, [node]);
      }
    }

    return children;
  }, new Map<Node, Node[]>());

const attributeValue = (node: Node, name: string) => {
  const value = node[name] || node.feats?.[name] || node.misc?.[name];
  if (typeof value === "string") {
    return value;
  }

  return typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : undefined;
};

const hasAttribute = (node: Node, name: string) =>
  node[name] !== undefined ||
  node.feats?.[name] !== undefined ||
  node.misc?.[name] !== undefined;

type ChildrenOf = (node: Node) => Node[];
type ParentOf = (node: Node) => Node | null;

const inOrderFrom = (getChildren: ChildrenOf) => {
  const walk = (node: Node, traversal: Node[] = []): Node[] => {
    const children = getChildren(node);
    children
      .filter((child) => child.id < node.id)
      .forEach((child) => walk(child, traversal));
    traversal.push(node);
    children
      .filter((child) => child.id > node.id)
      .forEach((child) => walk(child, traversal));
    return traversal;
  };

  return walk;
};

const offsetOf = (node: Node) => Number(node.misc?.at);

const joinForms = (traversal: Node[]) =>
  traversal.reduce((text, node, index) => {
    const form = node.form || "";
    const separated =
      index < traversal.length - 1 &&
      offsetOf(traversal[index + 1]) > offsetOf(node) + form.length;
    return `${text}${form}${separated ? " " : ""}`;
  }, "");

const hasAncestorIn = (node: Node, nodes: Node[], getParent: ParentOf) => {
  for (
    let ancestor = getParent(node);
    ancestor != null;
    ancestor = getParent(ancestor)
  ) {
    if (nodes.indexOf(ancestor) > -1) {
      return true;
    }
  }

  return false;
};

const removeSubsetsWith = (getParent: ParentOf) => (nodes: Node[]) => {
  let index = nodes.length - 1;
  while (index >= 0) {
    const node = nodes[index];
    const duplicated = index > 0 && nodes.lastIndexOf(node, index - 1) >= 0;
    if (duplicated || hasAncestorIn(node, nodes, getParent)) {
      nodes.splice(index, 1);
    }

    index -= 1;
  }

  return nodes;
};

const findAllWith =
  (getChildren: ChildrenOf) => (test: NodeTestFunction, nodes: Node[]) => {
    const result: Node[] = [];
    const stack = [...nodes];
    let node = stack.shift();
    while (node != null) {
      stack.unshift(...getChildren(node));
      if (test(node)) {
        result.push(node);
      }

      node = stack.shift();
    }

    return result;
  };

export default function (nodes: Node[]) {
  const children = childrenByParent(nodes);
  const getChildren: ChildrenOf = (node) => children.get(node) ?? [];
  const getParent: ParentOf = (node) =>
    node.head >= 0 ? nodes[node.head] : null;
  const inOrder = inOrderFrom(getChildren);

  const adapter = {
    nodes,
    children,
    getChildren,
    getParent,
    isTag: (node: Node): node is Node => node.id != null,
    existsOne: (test: NodeTestFunction, candidates: Node[]): boolean =>
      candidates.some(
        (node) => test(node) || adapter.existsOne(test, getChildren(node)),
      ),
    getAttributeValue: attributeValue,
    getName: (node: Node) => node.tagName || "",
    getSiblings: (node: Node) => {
      const parent = getParent(node);
      return parent ? getChildren(parent) : [node];
    },
    getText: (node: Node | Node[]): string =>
      Array.isArray(node)
        ? node.map((one) => adapter.getText(one)).join(" ")
        : joinForms(inOrder(node)),
    hasAttrib: hasAttribute,
    removeSubsets: removeSubsetsWith(getParent),
    findAll: findAllWith(getChildren),
    findOne: (test: NodeTestFunction, candidates: Node[]): Node | null => {
      let result: Node | null = null;
      for (let i = 0; result == null && i < candidates.length; i += 1) {
        const node = candidates[i];
        result = test(node) ? node : adapter.findOne(test, getChildren(node));
      }

      return result;
    },
  };
  return adapter;
}

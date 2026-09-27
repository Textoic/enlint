import { is, selectAll } from "css-select";
import * as cssWhat from "css-what";
import cssSelectAdapter from "./css-select-adapter.js";
import type { ParsedToken, Node, RuleMatch } from "./types/index.js";

type Options = {
  xmlMode: boolean;
  adapter: ReturnType<typeof cssSelectAdapter>;
};

type Context = {
  tokens: ParsedToken[];
  selectorTokens: cssWhat.Selector[];
  options: Options;
};

type Position = { id: number; head: number; index: number };

const compoundBefore = (selectorTokens: cssWhat.Selector[], from: number) => {
  const gathered: cssWhat.Selector[] = [];
  let index = from;
  while (index >= 0 && !cssWhat.isTraversal(selectorTokens[index])) {
    gathered.unshift(selectorTokens[index]);
    index -= 1;
  }

  return { gathered, index };
};

const childStep = (
  { head, index }: Position,
  tokens: ParsedToken[],
  tree: number[],
): Position => {
  tree.unshift(head);
  const parent = tokens[head];
  return { id: parent.id, head: parent.head, index: index - 1 };
};

const siblingStep = (
  position: Position,
  { tokens, selectorTokens, options }: Context,
  tree: number[],
): Position | null => {
  const { gathered, index } = compoundBefore(
    selectorTokens,
    position.index - 1,
  );
  const ownId = position.id;
  const sibling = options.adapter
    .getSiblings(tokens[ownId])
    .find(
      (token: Node) => is(token, [gathered], options) && token.id !== ownId,
    );
  if (sibling == null) {
    return null;
  }

  tree.unshift(sibling.id);
  return { ...position, index };
};

const descendantStep = (
  position: Position,
  { tokens, selectorTokens, options }: Context,
  tree: number[],
): Position => {
  const { gathered, index } = compoundBefore(
    selectorTokens,
    position.index - 1,
  );
  let { id, head } = position;
  while (!is(tokens[head], [gathered], options)) {
    ({ id, head } = tokens[head]);
  }

  tree.unshift(head);
  return { id, head, index };
};

const treeFor = (token: Node, context: Context): number[] | null => {
  const { selectorTokens } = context;
  const tree = [token.id];
  let position: Position = {
    id: token.id,
    head: token.head,
    index: selectorTokens.length - 1,
  };

  while (position.index > 0) {
    const { type } = selectorTokens[position.index];
    if (type === cssWhat.SelectorType.Child) {
      position = childStep(position, context.tokens, tree);
    } else if (
      type === cssWhat.SelectorType.Sibling ||
      type === cssWhat.SelectorType.Adjacent
    ) {
      const next = siblingStep(position, context, tree);
      if (next == null) {
        return null;
      }

      position = next;
    } else if (type === cssWhat.SelectorType.Descendant) {
      position = descendantStep(position, context, tree);
    } else {
      position = { ...position, index: position.index - 1 };
    }
  }

  return tree;
};

export default function (
  tokens: ParsedToken[],
  queries: cssWhat.Selector[][][],
) {
  const elements = [tokens.find(({ head }) => head === -1)] as ParsedToken[];
  const options: Options = {
    xmlMode: true,
    adapter: cssSelectAdapter(tokens as Node[]),
  };
  const matches: RuleMatch[] = [];
  queries.forEach((query, selectorIndex) => {
    const [selectorTokens] = query;
    const context: Context = { tokens, selectorTokens, options };
    selectAll(query, elements, options).forEach((token) => {
      const tree = treeFor(token, context);
      if (tree != null) {
        matches.push({ selectorIndex, tree });
      }
    });
  });
  return matches;
}

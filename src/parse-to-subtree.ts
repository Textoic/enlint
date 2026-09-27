import type { ParsedToken } from "./types/index.js";

const createIsAncestor =
  (tokens: ParsedToken[], parent: number) => (id: number) => {
    let { head } = tokens[id];
    while (head !== -1) {
      if (head === parent) {
        return true;
      }

      ({ head } = tokens[head]);
    }

    return false;
  };

export default (tokens: ParsedToken[], parent: number) => {
  const isAncestor = createIsAncestor(tokens, parent);
  let leftmostDescendant = 0;
  while (leftmostDescendant < parent && !isAncestor(leftmostDescendant)) {
    leftmostDescendant += 1;
  }

  let rightmostDescendant = tokens.length - 1;
  while (rightmostDescendant > parent && !isAncestor(rightmostDescendant)) {
    rightmostDescendant -= 1;
  }

  return Array.from(
    { length: rightmostDescendant - leftmostDescendant + 1 },
    (_, index) => index + leftmostDescendant,
  );
};

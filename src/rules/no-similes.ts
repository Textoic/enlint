import parseToSubtree from "../parse-to-subtree.js";
import { ErrorId, type LintError, type ParsedToken } from "../types/index.js";

const properLikePhrasalVerbHeads = [
  "act",
  "appear",
  "be",
  "feel",
  "look",
  "see",
  "seem",
  "sound",
  "taste",
  "smell",
  "talk",
];

const isClauseBoundary = ({ form, lemma, xpos, feats }: ParsedToken) =>
  ["Colo", "Semi"].includes(feats.PunctType ?? "") ||
  /^[—–]$/u.test(form) ||
  (xpos === "MARK" && ["and", "but", "or"].includes(lemma ?? ""));

const followsDetachedNominal = (tokens: ParsedToken[], id: number) => {
  const previous = tokens[id - 1];
  return (
    previous?.xpos === "NOUN" &&
    previous.feats.Tense == null &&
    tokens.slice(tokens[id].head + 1, id - 1).some(isClauseBoundary)
  );
};

const applyRule = (tokens: ParsedToken[]) =>
  tokens
    .filter(({ lemma, xpos }) => lemma === "like" && xpos === "MARK")
    .reduce((similes: LintError[], { head, id, misc: { at } }) => {
      if (head < 0) {
        return similes;
      }

      const parent = tokens[head];
      if (parent.xpos === "NOUN" || followsDetachedNominal(tokens, id)) {
        return similes;
      }

      if (parent.lemma && properLikePhrasalVerbHeads.includes(parent.lemma)) {
        return similes;
      }

      const rightMostChild = Math.max(...parseToSubtree(tokens, id));
      const {
        form: lastWord,
        misc: { at: endOffset },
      } = tokens[rightMostChild];
      return [
        ...similes,
        {
          start: at,
          end: endOffset + lastWord.length,
          message: `Avoid similes and metaphors such as "The evening settled like a duvet over bones" or "I landed on the pavement like a sack of unwrapped potatoes".`,
          id: ErrorId.NO_SIMILES,
        },
      ];
    }, []);

export default (sentences: ParsedToken[][]) =>
  sentences.reduce(
    (errors: LintError[], entities) => [...errors, ...applyRule(entities)],
    [],
  );

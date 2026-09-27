import parseToSubtree from "../parse-to-subtree.js";
import { ErrorId, type LintError, type ParsedToken } from "../types/index.js";

const withNoJustStructure = (tokens: ParsedToken[]) =>
  tokens
    .filter(({ lemma, form }) =>
      ["just", "merely", "only", "simply", "solely"].includes(
        lemma ?? form.toLowerCase(),
      ),
    )
    .reduce((errors: LintError[], { id, misc: { children, at }, head }) => {
      if (
        head < 0 ||
        !children.some(
          (id) =>
            tokens[id].lemma === "not" ||
            tokens[id].form.toLowerCase() === "not",
        )
      ) {
        return errors;
      }

      const {
        misc: { children: headChildren },
      } = tokens[head];
      const headModifierBut = headChildren.find(
        (headChildId) =>
          headChildId > id && tokens[headChildId].lemma === "but",
      );
      if (headModifierBut) {
        const rightMostChild = Math.max(
          ...parseToSubtree(tokens, headModifierBut),
        );
        const {
          form: lastWord,
          misc: { at: endOffset },
        } = tokens[rightMostChild];
        return [
          ...errors,
          {
            start: at,
            end: endOffset + lastWord.length,
            message: `Instead of 'not just X but Y', rewrite this section to say 'X and Y'.`,
            id: ErrorId.NO_BAD_SENTENCE_STRUCTURES,
          },
        ];
      }

      return errors;
    }, []);

export default (sentences: ParsedToken[][]) =>
  sentences.reduce(
    (errors: LintError[], tokens) => [
      ...errors,
      ...withNoJustStructure(tokens),
    ],
    [],
  );

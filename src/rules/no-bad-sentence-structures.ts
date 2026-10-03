import parseToSubtree from "../parse-to-subtree.js";
import tells, { type TellKind } from "../tells.js";
import { ErrorId, type LintError, type ParsedToken } from "../types/index.js";

export const tellMessages: Record<TellKind, string> = {
  "noun-fragment": `This is a noun with a clause hung on it and no main verb, like a tagline: "The open-source pieces every product shares." Give it a subject and a verb: "Every product shares these open-source pieces."`,
  teaser: `This announces an idea and praises it before giving it: "There's one more effect, and it's the one I like best." Delete the announcement and state the idea.`,
  announcement: `"Here's X:" announces what comes next instead of saying it. Open with the thing itself.`,
  "which-tail": `This tail comments on the sentence it hangs from: ", which is the bit a page buries in a chart". End the sentence before it, and say the comment in a sentence of its own if it is worth keeping.`,
  "precise-figure": `Round the figure and leave the arithmetic out: "3.869 times 1.967, near 7.61" becomes "~7.6".`,
  "beat-comparison": `"Beats" turns a comparison into a contest: "the year beats the amount". Say which is larger and by how much: "ten more years add more than twice the amount".`,
  "matters-claim": `Saying that something matters tells the reader nothing about it: "That's why the year you start matters so much." Say what it changes: "Start ten years sooner and the total doubles."`,
  "can-cannot": `This sets a "can" against a "can't" for effect: "The amount can be fixed later. The start date can't." Say the point once: "Only the amount can be fixed later."`,
};

const tellErrors = (sentences: ParsedToken[][]): LintError[] =>
  tells(sentences).map(({ kind, start, end }) => ({
    start,
    end,
    message: tellMessages[kind],
    id: ErrorId.NO_BAD_SENTENCE_STRUCTURES,
  }));

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

export default (sentences: ParsedToken[][]) => [
  ...sentences.reduce(
    (errors: LintError[], tokens) => [
      ...errors,
      ...withNoJustStructure(tokens),
    ],
    [],
  ),
  ...tellErrors(sentences),
];

import inflect from "@textoic/artisan/inflect";
import antonymOf from "../antonyms.js";
import {
  ErrorId,
  type LintError,
  type NominalNumber,
  type ParsedToken,
  type PosTag,
} from "../types/index.js";

const isPredicate = (token: ParsedToken) => ["ADJ", "ADV"].includes(token.xpos);

const predicateSiblingAfter = (
  entities: ParsedToken[],
  head: number,
  siblings: number[],
) =>
  siblings.find(
    (sibling) =>
      sibling > head &&
      isPredicate(entities[sibling]) &&
      antonymOf(entities[sibling]),
  );

const swappedPredicateError = (
  entities: ParsedToken[],
  start: number,
  siblingIndex: number,
): LintError => {
  const sibling = entities[siblingIndex];
  return {
    start,
    end: sibling.misc.at + sibling.form.length,
    message: `Rewrite using '${antonymOf(sibling)}' instead of 'not ${sibling.form}'`,
    id: ErrorId.NO_EXPLAINED_ANTONYMS,
  };
};

const isAuxiliaryBefore = (
  token: ParsedToken | undefined,
  negativePosition: number,
) =>
  token != null &&
  token.xpos === "VERB" &&
  token.misc.at < negativePosition &&
  (token.lemma === "do" || token.feats.Mood != null);

type Negator = { id: number; grandFather: number; negativePosition: number };

const auxiliaryFor = (
  entities: ParsedToken[],
  { id, grandFather, negativePosition }: Negator,
) => {
  const preceding = id > 0 ? entities[id - 1] : undefined;
  if (isAuxiliaryBefore(preceding, negativePosition)) {
    return preceding;
  }

  const ancestor = grandFather !== -1 ? entities[grandFather] : undefined;
  return isAuxiliaryBefore(ancestor, negativePosition) ? ancestor : undefined;
};

const agreementOf = (
  entities: ParsedToken[],
  auxiliary: ParsedToken | undefined,
) => {
  const {
    feats: { Tense, Person, VerbForm } = {},
    misc: { children: auxiliaryChildren = [] } = {},
    id: auxiliaryId = -1,
  } = auxiliary ?? {};
  const subject = auxiliaryChildren.find(
    (child) => child < auxiliaryId && entities[child].xpos === "NOUN",
  );
  const Number =
    subject == null
      ? ("Sing" as NominalNumber)
      : entities[subject].feats.Number;
  return { Number, Tense, Person, VerbForm };
};

const inflectsTheAuxiliary = (
  headTag: string,
  auxiliary: ParsedToken | undefined,
): auxiliary is ParsedToken => headTag === "VERB" && auxiliary != null;

const replacementsFor = (
  headAntonym: string,
  headTag: string,
  auxiliary: ParsedToken | undefined,
  agreement: ReturnType<typeof agreementOf>,
) =>
  inflectsTheAuxiliary(headTag, auxiliary)
    ? [
        inflect({
          lemma: headAntonym,
          xpos: "VERB" as PosTag,
          feats: agreement,
        }) as string,
      ]
    : [headAntonym];

const startOf = (
  headTag: string,
  auxiliary: ParsedToken | undefined,
  negativePosition: number,
) =>
  inflectsTheAuxiliary(headTag, auxiliary)
    ? auxiliary.misc.at
    : negativePosition;

const applyRule = (entities: ParsedToken[]) =>
  entities
    .filter(({ lemma }) => lemma === "not")
    .reduce(
      (errors: LintError[], { id, head, misc: { at: negativePosition } }) => {
        if (head === -1) {
          return errors;
        }

        const headToken = entities[head];
        const {
          form: headWord,
          xpos: headTag,
          misc: { at: headPosition, children: siblings },
          head: grandFather,
        } = headToken;
        const headAntonym = antonymOf(headToken);

        const siblingAfterVerb = predicateSiblingAfter(
          entities,
          head,
          siblings,
        );
        if (headTag === "VERB" && head > id && siblingAfterVerb != null) {
          return errors.concat(
            swappedPredicateError(entities, negativePosition, siblingAfterVerb),
          );
        }

        if (!headAntonym || negativePosition > headPosition) {
          return errors;
        }

        const negator = { id, grandFather, negativePosition };
        const auxiliary = auxiliaryFor(entities, negator);
        if (headTag === "VERB" && auxiliary == null) {
          return errors;
        }

        const start = startOf(headTag, auxiliary, negativePosition);
        const end = headPosition + headWord.length;
        const suggestions = replacementsFor(
          headAntonym,
          headTag,
          auxiliary,
          agreementOf(entities, auxiliary),
        );
        return errors.concat({
          start,
          end,
          suggestions: suggestions.map((text) => ({
            range: [start, end] as [number, number],
            text,
          })),
          message: `Replace a negative with a positive when it retains the same meaning`,
          id: ErrorId.NO_EXPLAINED_ANTONYMS,
        });
      },
      [],
    );

export default (sentences: ParsedToken[][]) =>
  sentences.reduce(
    (errors: LintError[], entities) => [...errors, ...applyRule(entities)],
    [],
  );

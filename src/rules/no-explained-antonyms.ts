import inflect from "@textoic/artisan/inflect";
import antonymOf, { antonymKeyOf } from "../antonyms.js";
import {
  ErrorId,
  type LintError,
  type NominalNumber,
  type ParsedToken,
  type PosTag,
} from "../types/index.js";

const isPredicate = (token: ParsedToken) => ["ADJ", "ADV"].includes(token.xpos);

const linkingVerbs = new Set([
  "appear",
  "be",
  "become",
  "feel",
  "get",
  "grow",
  "look",
  "prove",
  "remain",
  "seem",
  "smell",
  "sound",
  "stay",
  "taste",
  "turn",
]);

const isLinkingVerb = ({ xpos, lemma }: ParsedToken) =>
  xpos === "VERB" && linkingVerbs.has(lemma ?? "");

const hasAdverbOtherThan = (
  entities: ParsedToken[],
  token: ParsedToken,
  negation: number,
) =>
  token.misc.children.some(
    (child) => child !== negation && entities[child].xpos === "ADV",
  );

const predicateSiblingAfter = (
  entities: ParsedToken[],
  head: number,
  siblings: number[],
) =>
  siblings.find(
    (sibling) =>
      sibling > head &&
      isPredicate(entities[sibling]) &&
      antonymOf(entities[sibling]) &&
      !hasAdverbOtherThan(entities, entities[sibling], -1),
  );

const contractedAuxiliaries: Record<string, string | undefined> = {
  ain: undefined,
  can: "can",
  shan: "shall",
  won: "will",
};

const isClitic = ({ form }: ParsedToken) => /^['’]t$/iu.test(form);

const hostOf = (entities: ParsedToken[], negation: ParsedToken) => {
  const host = negation.id > 0 ? entities[negation.id - 1] : undefined;
  const isAttached =
    host != null && host.misc.at + host.form.length === negation.misc.at;
  return isClitic(negation) && isAttached ? host : undefined;
};

const isUpperCase = (text: string) =>
  text === text.toUpperCase() && text !== text.toLowerCase();

const withCaseOf = (form: string, word: string) => {
  if (form.length > 1 && isUpperCase(form)) {
    return word.toUpperCase();
  }

  return isUpperCase(form[0])
    ? `${word[0].toUpperCase()}${word.slice(1)}`
    : word;
};

const uncontracted = (host: ParsedToken) => {
  const lower = host.form.toLowerCase();
  const base = Object.hasOwn(contractedAuxiliaries, lower)
    ? contractedAuxiliaries[lower]
    : lower.endsWith("n")
      ? lower.slice(0, -1)
      : undefined;
  return base ? withCaseOf(host.form, base) : undefined;
};

const ownsTheN = (host: ParsedToken) =>
  /n$/iu.test(host.form) && host.form.toLowerCase() !== "can";

const negationStart = (entities: ParsedToken[], negation: ParsedToken) => {
  const host = hostOf(entities, negation);
  return host && ownsTheN(host) ? negation.misc.at - 1 : negation.misc.at;
};

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
    case: antonymKeyOf(sibling),
  };
};

const isAuxiliaryBefore = (
  token: ParsedToken | undefined,
  negativePosition: number,
) =>
  token != null &&
  token.xpos === "VERB" &&
  token.misc.at < negativePosition &&
  token.lemma === "do";

const auxiliaryFor = (entities: ParsedToken[], negation: ParsedToken) => {
  const preceding = negation.id > 0 ? entities[negation.id - 1] : undefined;
  if (isAuxiliaryBefore(preceding, negation.misc.at)) {
    return preceding;
  }

  const grandFather = entities[negation.head].head;
  const ancestor = grandFather !== -1 ? entities[grandFather] : undefined;
  return isAuxiliaryBefore(ancestor, negation.misc.at) ? ancestor : undefined;
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

type Replacement = { start: number; text: string };

const verbReplacement = (
  entities: ParsedToken[],
  negation: ParsedToken,
  antonym: string,
): Replacement | undefined => {
  const auxiliary = auxiliaryFor(entities, negation);
  if (auxiliary == null) {
    return undefined;
  }

  const text = inflect({
    lemma: antonym,
    xpos: "VERB" as PosTag,
    feats: agreementOf(entities, auxiliary),
  }) as string;
  return { start: auxiliary.misc.at, text };
};

const predicateReplacement = (
  entities: ParsedToken[],
  negation: ParsedToken,
  antonym: string,
): Replacement | undefined => {
  const host = hostOf(entities, negation);
  if (host == null) {
    return { start: negation.misc.at, text: antonym };
  }

  const auxiliary = uncontracted(host);
  return auxiliary
    ? {
        start: host.misc.at,
        text: `${auxiliary} ${withCaseOf(entities[negation.head].form, antonym)}`,
      }
    : undefined;
};

const negativePolarityWords = new Set(["anymore", "either", "ever", "yet"]);

const isNegativePolarityItem = (entities: ParsedToken[], index: number) => {
  const { form, misc } = entities[index];
  const word = form.toLowerCase();
  const isAtAll =
    word === "at" &&
    misc.children.some((child) => entities[child].form.toLowerCase() === "all");
  return isAtAll || negativePolarityWords.has(word);
};

const hasNegativePolarityItem = (entities: ParsedToken[], token: ParsedToken) =>
  token.misc.children.some(
    (child) => child > token.id && isNegativePolarityItem(entities, child),
  );

const negatesItsHeadAlone = (entities: ParsedToken[], negation: ParsedToken) =>
  negation.head === negation.id + 1 &&
  !hasAdverbOtherThan(entities, entities[negation.head], negation.id) &&
  !hasNegativePolarityItem(entities, entities[negation.head]);

const directError = (
  entities: ParsedToken[],
  negation: ParsedToken,
): LintError[] => {
  const headToken = entities[negation.head];
  const antonym = antonymOf(headToken);
  if (!antonym || !negatesItsHeadAlone(entities, negation)) {
    return [];
  }

  const replace =
    headToken.xpos === "VERB" ? verbReplacement : predicateReplacement;
  const replacement = replace(entities, negation, antonym);
  if (replacement == null) {
    return [];
  }

  const { start, text } = replacement;
  const end = headToken.misc.at + headToken.form.length;
  return [
    {
      start,
      end,
      suggestions: [{ range: [start, end], text }],
      message: `Replace a negative with a positive when it retains the same meaning`,
      id: ErrorId.NO_EXPLAINED_ANTONYMS,
      case: antonymKeyOf(headToken),
    },
  ];
};

const swappedSibling = (entities: ParsedToken[], negation: ParsedToken) => {
  const verb = entities[negation.head];
  return negation.head > negation.id && isLinkingVerb(verb)
    ? predicateSiblingAfter(entities, negation.head, verb.misc.children)
    : undefined;
};

const errorsFor = (entities: ParsedToken[], negation: ParsedToken) => {
  if (negation.head === -1) {
    return [];
  }

  const sibling = swappedSibling(entities, negation);
  return sibling != null
    ? [
        swappedPredicateError(
          entities,
          negationStart(entities, negation),
          sibling,
        ),
      ]
    : directError(entities, negation);
};

const applyRule = (entities: ParsedToken[]) =>
  entities
    .filter(({ lemma }) => lemma === "not")
    .flatMap((negation) => errorsFor(entities, negation));

export default (sentences: ParsedToken[][]) =>
  sentences.reduce(
    (errors: LintError[], entities) => [...errors, ...applyRule(entities)],
    [],
  );

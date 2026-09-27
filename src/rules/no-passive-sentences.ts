import * as cssWhat from "css-what";
import inflect from "@textoic/artisan/inflect";
import queryParse from "../query-parse.js";
import parseToSubtree from "../parse-to-subtree.js";
import {
  ErrorId,
  type LintError,
  type NominalNumber,
  type ParsedToken,
  type PosTag,
  type Tense,
  type VerbForm,
  type VerbPerson,
} from "../types/index.js";

const passiveSelector = cssWhat.parse(
  "[lemma=be][xpos=VERB] > [xpos=VERB][Tense=Past]",
);

const openingDelimiters = ["(", "[", "{", "«", "‘", "“", "„", "‹", "‛"];
const closingDelimiters = [")", "]", "}", "»", "’", "”", "”", "›", "’"];
const particleContractionRegExp = /('|’|`|´)\w+/iu;

const sentencePunctuation = ["Peri", "Excl", "Qest", "Comm"];
const pairedPunctuation = ["Quot", "Brck", "Comm"];

const pairedSeparator = (form: string, opened: Record<string, number>) => {
  if (closingDelimiters.includes(form)) {
    return "";
  }

  if (openingDelimiters.includes(form)) {
    return " ";
  }

  const seen = opened[form] || 0;
  opened[form] = seen + 1;
  return seen % 2 === 1 ? "" : " ";
};

const glued = (
  form: string,
  previous: ParsedToken | undefined,
  opened: Record<string, number>,
) => {
  const { xpos: lastTag = "", form: lastWord = "" } = previous || {};
  return (
    (lastTag === "PUNCT" &&
      (openingDelimiters.includes(lastWord) || opened[lastWord] % 2 === 1)) ||
    particleContractionRegExp.test(form)
  );
};

type Joining = {
  token: ParsedToken;
  previous: ParsedToken | undefined;
  atStart: boolean;
  opened: Record<string, number>;
};

const separatorBefore = ({ token, previous, atStart, opened }: Joining) => {
  const {
    form,
    xpos,
    feats: { PunctType = "" },
  } = token;

  if (
    atStart ||
    (xpos === "PUNCT" && sentencePunctuation.includes(PunctType))
  ) {
    return "";
  }

  if (xpos === "PUNCT" && pairedPunctuation.includes(PunctType)) {
    return pairedSeparator(form, opened);
  }

  return glued(form, previous, opened) ? "" : " ";
};

const subtreeToString = (entities: ParsedToken[], subtree: number[]) => {
  const opened: Record<string, number> = {};
  return subtree.reduce((string, index, indexInSubtree) => {
    const token = entities[index];
    const separator = separatorBefore({
      token,
      previous: entities[index - 1],
      atStart: indexInSubtree === 0,
      opened,
    });
    return `${string}${separator}${token.form}`;
  }, "");
};

const findPassiveRoot = (
  entities: ParsedToken[],
  currentRoot: number,
): number => {
  const {
    head,
    feats: { VerbForm: currentVerbForm, Tense: currentTense },
  } = entities[currentRoot];
  if (
    head === -1 ||
    entities[currentRoot].misc.children.some((child) => {
      const {
        feats: { PunctType },
      } = entities[child];
      return PunctType != null;
    })
  ) {
    return currentRoot;
  }

  const {
    feats: { Mood, VerbForm },
    lemma,
  } = entities[head];
  if (
    Mood != null ||
    lemma === "have" ||
    (lemma === "be" &&
      VerbForm === "Fin" &&
      currentVerbForm === "Part" &&
      currentTense === "Pres")
  ) {
    return findPassiveRoot(entities, head);
  }

  return currentRoot;
};

const firstPersonWords = ["i", "me"];
const secondPersonWords = ["you"];

const getPersonAndNumber = (
  entities: ParsedToken[],
  beVerb: number,
  subjectSubtree: number[],
): { Person: VerbPerson; Number?: NominalNumber } => {
  const { head: beVerbHead } = entities[beVerb];
  const { Mood } =
    beVerbHead === -1 ? { Mood: undefined } : entities[beVerbHead].feats;
  if (Mood) {
    return { Person: 3, Number: "Plur" as NominalNumber };
  }

  const root = subjectSubtree.find(
    (index) => !subjectSubtree.includes(entities[index].head),
  );
  const {
    form,
    feats: { Number },
  } = root ? entities[root] : { form: "", feats: { Number: undefined } };
  if (firstPersonWords.includes(form)) {
    return { Person: 1, Number: "Sing" as NominalNumber };
  }

  if (secondPersonWords.includes(form)) {
    return { Person: 2, Number };
  }

  const Person = 3;
  if (Number) {
    return { Person, Number };
  }

  return { Person, Number: "Sing" as NominalNumber };
};

const buildComplementString = (
  entities: ParsedToken[],
  verb: number,
  complementSubtree: number[],
) => {
  if (complementSubtree.length === 0) {
    return "";
  }

  const firstComplement = Math.min(...complementSubtree);
  const {
    misc: { at: firstComplementPosition },
  } = entities[firstComplement];
  const {
    misc: { at: verbPosition },
    form: verbWord,
  } = entities[verb];
  const hasNoLeftMargin =
    firstComplementPosition === verbPosition + verbWord.length;
  const leftString = hasNoLeftMargin ? "" : " ";
  return `${leftString}${subtreeToString(entities, complementSubtree)}`;
};

type Agreement = { Person: VerbPerson; Number?: NominalNumber };

type ActiveVoice = {
  passiveRoot: number;
  passiveSubject: number;
  agreement: Agreement;
};

const getLeftPassiveRootString = (
  entities: ParsedToken[],
  beVerb: number,
  { passiveRoot, passiveSubject, agreement: { Person, Number } }: ActiveVoice,
) => {
  const passiveRootSubtree = parseToSubtree(entities, passiveRoot);
  const passiveRootSubjectSubtree = parseToSubtree(entities, passiveSubject);
  const lastSubjectIndex = Math.max(...passiveRootSubjectSubtree);
  const passiveRootComplements = passiveRootSubtree.filter(
    (index) =>
      index > lastSubjectIndex &&
      index !== passiveRoot &&
      index < beVerb &&
      index > 0 &&
      entities[index].xpos !== "PUNCT",
  );
  const complementString = buildComplementString(
    entities,
    passiveRoot,
    passiveRootComplements,
  );
  if (passiveRoot !== beVerb) {
    const {
      lemma,
      feats: { VerbForm, Tense },
    } = entities[passiveRoot];
    return `${inflect({
      lemma,
      xpos: "VERB" as PosTag,
      feats: { VerbForm, Tense, Person, Number },
    })}${complementString} `;
  }

  return complementString;
};

const findLeftNegation = (entities: ParsedToken[], argumentVerb: number) =>
  parseToSubtree(entities, argumentVerb).find(
    (index) => index < argumentVerb && entities[index].lemma === "not",
  );

const toActiveVerb = (
  entities: ParsedToken[],
  [beVerb, argumentVerb]: number[],
  voice: ActiveVoice,
) => {
  const {
    agreement: { Person, Number },
  } = voice;
  const {
    feats: { VerbForm: beVerbForm, Tense: beVerbTense },
    head: beVerbHead,
  } = entities[beVerb];
  const { lemma } = entities[argumentVerb];
  const stringBeforeVerb = getLeftPassiveRootString(entities, beVerb, voice);
  if (findLeftNegation(entities, argumentVerb) != null) {
    return `${stringBeforeVerb}${inflect({
      lemma,
      xpos: "VERB" as PosTag,
      feats: {
        VerbForm: "Fin" as VerbForm,
        Tense: "Pres" as Tense,
        Person: 3,
        Number: "Plur" as NominalNumber,
      },
    })}`;
  }

  if (beVerbHead !== -1 && entities[beVerbHead].xpos === "VERB") {
    return `${stringBeforeVerb}${inflect({
      lemma,
      xpos: "VERB" as PosTag,
      feats: {
        VerbForm: beVerbForm,
        Tense: beVerbTense,
        Person: 3,
        Number: "Plur" as NominalNumber,
      },
    })}`;
  }

  return `${stringBeforeVerb}${inflect({
    lemma,
    xpos: "VERB" as PosTag,
    feats: { VerbForm: beVerbForm, Tense: beVerbTense, Person, Number },
  })}`;
};

const isAccusative = (entities: ParsedToken[], subtree: number[]) => {
  if (subtree.length > 1) {
    return false;
  }

  const [index] = subtree;
  const {
    feats: { Case },
  } = entities[index];
  return Case === "Acc";
};

const toNominative = (entities: ParsedToken[], subtree: number[]) => {
  const [index] = subtree;
  const { form } = entities[index];
  const lowerCased = form.toLowerCase();
  switch (lowerCased) {
    case "me":
      return "I";
    case "him":
      return "he";
    case "her":
      return "she";
    case "us":
      return "we";
    default:
      return "they";
  }
};

const findPassiveAgentMarker = (
  entities: ParsedToken[],
  argumentVerb: number,
) => {
  let index = argumentVerb + 1;
  while (index < entities.length) {
    const {
      head,
      lemma,
      xpos,
      feats: { PunctType = "" },
    } = entities[index];
    if (
      xpos === "PUNCT" &&
      ["Peri", "Excl", "Qest", "Comm"].includes(PunctType)
    ) {
      return -1;
    }

    if (head === argumentVerb && lemma === "by") {
      return index;
    }

    index += 1;
  }

  return -1;
};

const getPassiveAgentSubtree = (
  entities: ParsedToken[],
  passiveAgentMarker: number,
) => {
  if (passiveAgentMarker === -1) {
    return [];
  }

  const passiveAgent = entities[passiveAgentMarker].misc.children.find(
    (child) => entities[child].xpos === "NOUN",
  );
  if (passiveAgent == null) {
    return [];
  }

  return parseToSubtree(entities, passiveAgent).filter(
    (index) => index < entities.length,
  );
};

const nonAgentNouns = new Set([
  "afternoon",
  "april",
  "august",
  "autumn",
  "beginning",
  "chapter",
  "christmas",
  "dawn",
  "day",
  "daybreak",
  "deadline",
  "december",
  "dusk",
  "end",
  "episode",
  "evening",
  "february",
  "footnote",
  "fortnight",
  "friday",
  "hour",
  "january",
  "july",
  "june",
  "march",
  "may",
  "midday",
  "midnight",
  "millennium",
  "minute",
  "monday",
  "month",
  "morning",
  "night",
  "nightfall",
  "noon",
  "november",
  "october",
  "page",
  "paragraph",
  "quarter",
  "saturday",
  "section",
  "sentence",
  "september",
  "slide",
  "stanza",
  "start",
  "summer",
  "sunday",
  "sunrise",
  "sunset",
  "thursday",
  "time",
  "today",
  "tomorrow",
  "tonight",
  "tuesday",
  "wednesday",
  "week",
  "weekend",
  "winter",
  "year",
  "yesterday",
]);

const bareNumber = /^\d[\d,]*$/u;

const isNonAgent = (entities: ParsedToken[], subtree: number[]) => {
  const listed = (index: number) => {
    const { form, lemma, xpos } = entities[index];
    return xpos === "NOUN" && nonAgentNouns.has((lemma ?? form).toLowerCase());
  };

  const head = subtree.find((index) => !subtree.includes(entities[index].head));
  if (head == null) {
    return false;
  }

  if (listed(head)) {
    return true;
  }

  const { form, feats } = entities[head];
  if (feats.Number != null) {
    return false;
  }

  return (
    (subtree.length === 1 && bareNumber.test(form)) || subtree.some(listed)
  );
};

const toActiveSubject = (
  entities: ParsedToken[],
  passiveAgentSubtree: number[],
) => {
  if (isAccusative(entities, passiveAgentSubtree)) {
    return toNominative(entities, passiveAgentSubtree);
  }

  return subtreeToString(entities, passiveAgentSubtree);
};

const isNominative = (entities: ParsedToken[], subtree: number[]) => {
  if (subtree.length > 1) {
    return false;
  }

  const [index] = subtree;
  const {
    feats: { Case },
  } = entities[index];
  return Case === "Nom";
};

const toAccusative = (entities: ParsedToken[], subtree: number[]) => {
  const [index] = subtree;
  const { form } = entities[index];
  const lowerCased = form.toLowerCase();
  switch (lowerCased) {
    case "i":
      return "me";
    case "he":
      return "him";
    case "she":
      return "her";
    case "we":
      return "us";
    default:
      return "them";
  }
};

const detitleCase = (string: string) =>
  `${string[0].toLowerCase()}${string.slice(1)}`;

const isProperNoun = ({ lemma, form }: ParsedToken) => {
  const [initial = ""] = lemma ?? form;
  return initial !== initial.toLowerCase();
};

const separatorPunctuation = ["Comm", "Peri", "Semi", "Colo"];

const withoutTrailingSeparators = (
  entities: ParsedToken[],
  subtree: number[],
) => {
  let end = subtree.length;
  while (end > 0) {
    const { xpos, feats } = entities[subtree[end - 1]];
    if (
      xpos !== "PUNCT" ||
      !separatorPunctuation.includes(feats.PunctType ?? "")
    ) {
      break;
    }

    end -= 1;
  }

  return subtree.slice(0, end);
};

const toDirectObject = (entities: ParsedToken[], passiveSubject: number) => {
  const objectSubtree = withoutTrailingSeparators(
    entities,
    parseToSubtree(entities, passiveSubject),
  );
  if (isNominative(entities, objectSubtree)) {
    return toAccusative(entities, objectSubtree);
  }

  const object = subtreeToString(entities, objectSubtree);
  return isProperNoun(entities[objectSubtree[0]])
    ? object
    : detitleCase(object);
};

const titleCase = (string: string) =>
  `${string[0].toUpperCase()}${string.slice(1)}`;

const getLeftVerbComplementString = (
  entities: ParsedToken[],
  [beVerb, argumentVerb]: number[],
  passiveAgentSubtree: number[],
) => {
  const complements = parseToSubtree(entities, argumentVerb).filter(
    (child) => child < argumentVerb && child < entities.length,
  );
  if (complements.length === 0) {
    return "";
  }

  const notArgument = findLeftNegation(entities, argumentVerb);
  if (notArgument == null) {
    return `${subtreeToString(entities, complements)} `;
  }

  const {
    feats: { Tense },
  } = entities[beVerb];
  const otherComplements = complements.filter((index) => index !== notArgument);
  const rightString =
    otherComplements.length === 0
      ? ``
      : ` ${subtreeToString(entities, otherComplements)}`;
  return `${inflect({
    lemma: "do",
    xpos: "VERB" as PosTag,
    feats: {
      VerbForm: "Fin" as VerbForm,
      Tense,
      ...getPersonAndNumber(entities, beVerb, passiveAgentSubtree),
    },
  })} not${rightString} `;
};

const belongToDifferentClauses = (
  entities: ParsedToken[],
  start: number,
  end: number,
) => {
  const separatingEntities = entities.slice(start + 1, end);
  return separatingEntities.some(({ xpos }) =>
    ["PUNCT", "NOUN", "MARK"].includes(xpos),
  );
};

const toVerbArgumentString = (
  entities: ParsedToken[],
  verbArgumentsSubtree: number[],
) =>
  verbArgumentsSubtree.length === 0
    ? ""
    : ` ${subtreeToString(entities, verbArgumentsSubtree)}`;

const passiveSubjectOf = (entities: ParsedToken[], passiveRoot: number) => {
  const candidates = parseToSubtree(entities, passiveRoot).filter(
    (index) =>
      entities[index].xpos === "NOUN" &&
      index < passiveRoot &&
      entities[index].head === passiveRoot,
  );
  return candidates[candidates.length - 1];
};

type Rewriting = {
  entities: ParsedToken[];
  passiveBeSubtree: number[];
  passiveAgentMarker: number;
  passiveAgentSubtree: number[];
  voice: ActiveVoice;
};

const activeRewriteOf = ({
  entities,
  passiveBeSubtree,
  passiveAgentMarker,
  passiveAgentSubtree,
  voice,
}: Rewriting) => {
  const [, argumentVerb] = passiveBeSubtree;
  const leftVerbComplementString = getLeftVerbComplementString(
    entities,
    passiveBeSubtree,
    passiveAgentSubtree,
  );
  const verbArgumentsSubtree = parseToSubtree(entities, argumentVerb).filter(
    (index) =>
      index > argumentVerb &&
      index < passiveAgentMarker &&
      index < entities.length,
  );
  const verbArgumentsString = toVerbArgumentString(
    entities,
    verbArgumentsSubtree,
  );
  const activeDirectObject = toDirectObject(entities, voice.passiveSubject);
  const activeSubject = toActiveSubject(entities, passiveAgentSubtree);
  const verb = toActiveVerb(entities, passiveBeSubtree, voice);
  return `${activeSubject} ${leftVerbComplementString}${verb}${verbArgumentsString} ${activeDirectObject}`;
};

const opensTheSentence = (entities: ParsedToken[], leftMost: number) =>
  leftMost === 0 ||
  entities
    .slice(0, leftMost)
    .every(({ xpos }) => ["PUNCT", "INTJ"].includes(xpos));

const spanOfPassive = (
  entities: ParsedToken[],
  passiveSubject: number,
  passiveAgentSubtree: number[],
) => {
  const leftMost = Math.min(...parseToSubtree(entities, passiveSubject));
  const {
    misc: { at: start },
  } = entities[leftMost];
  const {
    misc: { at: endPosition },
    form: endWord,
  } = entities[passiveAgentSubtree[passiveAgentSubtree.length - 1]];
  return { leftMost, start, end: endPosition + endWord.length };
};

const hasUsableAgent = (
  entities: ParsedToken[],
  passiveAgentSubtree: number[],
) =>
  passiveAgentSubtree.length > 0 && !isNonAgent(entities, passiveAgentSubtree);

const PASSIVE_MESSAGE = `Prefer the active voice over the passive to make your message clear in the reader's mind`;

const toErrors = (
  entities: ParsedToken[],
  { tree: passiveBeSubtree }: { tree: number[] },
) => {
  const [beVerb, argumentVerb] = passiveBeSubtree;
  const passiveRoot = findPassiveRoot(entities, beVerb);
  const passiveSubject = passiveSubjectOf(entities, passiveRoot);
  if (
    belongToDifferentClauses(entities, beVerb, argumentVerb) ||
    passiveSubject == null
  ) {
    return [];
  }

  const passiveAgentMarker = findPassiveAgentMarker(entities, argumentVerb);
  const passiveAgentSubtree = getPassiveAgentSubtree(
    entities,
    passiveAgentMarker,
  );
  if (!hasUsableAgent(entities, passiveAgentSubtree)) {
    return [];
  }

  const {
    leftMost: leftMostPassiveEntity,
    start,
    end,
  } = spanOfPassive(entities, passiveSubject, passiveAgentSubtree);

  const voice: ActiveVoice = {
    passiveRoot,
    passiveSubject,
    agreement: getPersonAndNumber(entities, beVerb, passiveAgentSubtree),
  };
  const baseReplacement = activeRewriteOf({
    entities,
    passiveBeSubtree,
    passiveAgentMarker,
    passiveAgentSubtree,
    voice,
  });
  const replacement = opensTheSentence(entities, leftMostPassiveEntity)
    ? titleCase(baseReplacement)
    : baseReplacement;

  const {
    feats: { PronType: passiveSubjectPronType },
  } = entities[passiveSubject];
  const reported = {
    start,
    end,
    id: ErrorId.NO_PASSIVE_SENTENCES,
    message: PASSIVE_MESSAGE,
  };
  return passiveSubjectPronType === "Rel"
    ? [reported]
    : [
        {
          ...reported,
          suggestions: [{ range: [start, end], text: replacement }],
        },
      ];
};

export default (sentences: ParsedToken[][]) =>
  sentences.reduce((errors: LintError[], entities) => {
    const matches = queryParse(entities, [passiveSelector]);
    return [
      ...errors,
      ...matches.reduce(
        (newErrors: LintError[], match) => [
          ...newErrors,
          ...toErrors(entities, match),
        ],
        [],
      ),
    ];
  }, []);

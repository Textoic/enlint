import parseToSubtree from "./parse-to-subtree.js";
import type { ParsedToken } from "./types/index.js";

export type UnmarkedRelative = {
  antecedent: ParsedToken;
  opening: ParsedToken;
  verb: ParsedToken;
};

export type ClauseLink = { word: string; at: ParsedToken };

const formOf = ({ form }: ParsedToken) => form.toLowerCase();

const wordOf = (token: ParsedToken) => token.lemma ?? formOf(token);

const isVerb = ({ xpos }: ParsedToken) => xpos === "VERB";

const isNoun = ({ xpos }: ParsedToken) => xpos === "NOUN";

const isPunctuation = ({ xpos }: ParsedToken) => xpos === "PUNCT";

const isPresentParticiple = ({ feats: { VerbForm, Tense } }: ParsedToken) =>
  VerbForm === "Part" && Tense === "Pres";

const COORDINATORS = new Set(["and", "but", "or", "yet", "nor"]);

const SUBORDINATORS = new Set([
  "after",
  "although",
  "as",
  "because",
  "before",
  "how",
  "if",
  "once",
  "since",
  "so",
  "that",
  "though",
  "unless",
  "until",
  "what",
  "when",
  "where",
  "whereas",
  "whether",
  "which",
  "while",
  "who",
  "whom",
  "whose",
  "why",
]);

const POINTS_BACK = new Set(["Prs", "Rel", "Dem"]);

const canTakeARelative = (token: ParsedToken) =>
  isNoun(token) && !POINTS_BACK.has(String(token.feats.PronType));

const RELATIVE_PRONOUNS = new Set([
  "that",
  "which",
  "who",
  "whom",
  "whose",
  "what",
  "where",
  "when",
  "why",
  "how",
]);

const canBeASubject = (token: ParsedToken) =>
  isNoun(token) &&
  token.feats.PronType !== "Rel" &&
  token.feats.Case !== "Acc" &&
  !RELATIVE_PRONOUNS.has(formOf(token));

const subjectOf = (
  tokens: ParsedToken[],
  verb: ParsedToken,
  antecedent: ParsedToken,
) =>
  verb.misc.children
    .map((id) => tokens[id])
    .find(
      (child) =>
        child.id > antecedent.id && child.id < verb.id && canBeASubject(child),
    );

const openingOf = (tokens: ParsedToken[], subject: ParsedToken) =>
  tokens[Math.min(...parseToSubtree(tokens, subject.id))];

const holdsOnlyTheClause = (
  tokens: ParsedToken[],
  subject: ParsedToken,
  verb: ParsedToken,
) =>
  tokens
    .slice(subject.id + 1, verb.id)
    .every((between) => !isPunctuation(between) && !isNoun(between));

const ancestorsOf = (tokens: ParsedToken[], token: ParsedToken) => {
  const above: ParsedToken[] = [];
  for (let { head } = token; head !== -1; { head } = tokens[head]) {
    above.push(tokens[head]);
  }

  return above;
};

const isPreposition = ({ xpos, feats: { AdpType } }: ParsedToken) =>
  xpos === "MARK" && AdpType === "Prep";

const modifiersOf = (tokens: ParsedToken[], noun: ParsedToken) =>
  noun.misc.children.map((id) => tokens[id]).filter(({ id }) => id < noun.id);

const isBare = (tokens: ParsedToken[], noun: ParsedToken) =>
  modifiersOf(tokens, noun).length === 0;

const ADVERBIAL_NOUNS = new Set([
  "way",
  "time",
  "reason",
  "moment",
  "day",
  "year",
  "place",
  "while",
]);

const takesAnyClause = (antecedent: ParsedToken) =>
  ADVERBIAL_NOUNS.has(wordOf(antecedent));

const followsAMarker = (tokens: ParsedToken[], noun: ParsedToken) => {
  const opening = Math.min(noun.id, ...noun.misc.children);
  return opening > 0 && tokens[opening - 1].xpos === "MARK";
};

const FRONTS_A_PHRASE = new Set(["as", "after", "before", "since", "until"]);

const opensOnAMarker = ([first]: ParsedToken[]) =>
  first.xpos === "MARK" || FRONTS_A_PHRASE.has(formOf(first));

const isSetInFront = (tokens: ParsedToken[], antecedent: ParsedToken) =>
  isBare(tokens, antecedent) ||
  opensOnAMarker(tokens) ||
  takesAnyClause(antecedent) ||
  followsAMarker(tokens, antecedent);

const opensTheSentenceAlone = (
  tokens: ParsedToken[],
  antecedent: ParsedToken,
) => {
  const above = ancestorsOf(tokens, antecedent);
  const top = above[above.length - 1] as ParsedToken | undefined;
  return (
    !above.some(isVerb) &&
    (top == null ? isSetInFront(tokens, antecedent) : !isNoun(top))
  );
};

const asksWhich = (tokens: ParsedToken[], antecedent: ParsedToken) =>
  modifiersOf(tokens, antecedent).some((modifier) =>
    RELATIVE_PRONOUNS.has(formOf(modifier)),
  );

const CONNECTIVES = new Set(["as", "so", "than", "like", "but", "and", "or"]);

const canAnchorAClause = (tokens: ParsedToken[], antecedent: ParsedToken) =>
  canTakeARelative(antecedent) &&
  !CONNECTIVES.has(formOf(antecedent)) &&
  !asksWhich(tokens, antecedent) &&
  !opensTheSentenceAlone(tokens, antecedent);

const opensAnotherClause = (token: ParsedToken) =>
  isPunctuation(token) ||
  COORDINATORS.has(formOf(token)) ||
  SUBORDINATORS.has(formOf(token));

const clauseAfter = (tokens: ParsedToken[], verb: ParsedToken) => {
  const last = Math.max(...parseToSubtree(tokens, verb.id));
  const rest = tokens.slice(verb.id, last + 1);
  const stop = rest.findIndex(opensAnotherClause);
  return stop === -1 ? rest : rest.slice(0, stop);
};

const isStranded = (tokens: ParsedToken[], token: ParsedToken) => {
  const next = tokens[token.id + 1] as ParsedToken | undefined;
  return (
    isPreposition(token) &&
    !COORDINATORS.has(formOf(token)) &&
    token.misc.children.every((id) => id < token.id) &&
    (next == null || isPunctuation(next) || isVerb(next))
  );
};

const isBe = (token: ParsedToken) => wordOf(token) === "be";

const dependentsAfter = (tokens: ParsedToken[], verb: ParsedToken) =>
  verb.misc.children.map((id) => tokens[id]).filter(({ id }) => id > verb.id);

const isPassive = (clause: ParsedToken[], verb: ParsedToken) =>
  verb.feats.Tense === "Past" &&
  clause.some((helper) => helper.id < verb.id && isBe(helper));

const isPlainAdjective = ({ xpos, feats: { PronType } }: ParsedToken) =>
  xpos === "ADJ" && PronType == null;

const SPANS_OF_TIME = new Set([
  "time",
  "moment",
  "minute",
  "hour",
  "day",
  "night",
  "morning",
  "afternoon",
  "evening",
  "week",
  "month",
  "year",
]);

const isAnObject = (token: ParsedToken) =>
  isNoun(token) && !SPANS_OF_TIME.has(wordOf(token));

const isComplete = (tokens: ParsedToken[], clause: ParsedToken[]) => {
  const verb = [...clause].reverse().find(isVerb) ?? clause[0];
  const after = dependentsAfter(tokens, verb);
  return (
    after.some(isAnObject) ||
    isPassive(clause, verb) ||
    (isBe(verb) && after.some(isPlainAdjective))
  );
};

const leavesAGap = (tokens: ParsedToken[], verb: ParsedToken) => {
  const clause = clauseAfter(tokens, verb);
  return (
    clause.some((token) => isStranded(tokens, token)) ||
    !isComplete(tokens, clause)
  );
};

const unmarkedRelativeAt = (
  tokens: ParsedToken[],
  verb: ParsedToken,
): UnmarkedRelative[] => {
  const antecedent = tokens[verb.head] as ParsedToken | undefined;
  if (antecedent == null || antecedent.id > verb.id) {
    return [];
  }

  const subject = canAnchorAClause(tokens, antecedent)
    ? subjectOf(tokens, verb, antecedent)
    : undefined;
  if (subject == null || !holdsOnlyTheClause(tokens, subject, verb)) {
    return [];
  }

  const opening = openingOf(tokens, subject);
  return opening.id === antecedent.id + 1 &&
    !RELATIVE_PRONOUNS.has(formOf(opening)) &&
    (takesAnyClause(antecedent) || leavesAGap(tokens, verb))
    ? [{ antecedent, opening, verb }]
    : [];
};

export const unmarkedRelatives = (tokens: ParsedToken[]): UnmarkedRelative[] =>
  tokens.filter(isVerb).flatMap((verb) => unmarkedRelativeAt(tokens, verb));

const HELPERS = new Set(["be", "have", "do", "get"]);

const takesAnotherVerb = (token: ParsedToken) =>
  token.feats.Mood != null || HELPERS.has(wordOf(token));

const continuesAVerbGroup = (open: ParsedToken[], token: ParsedToken) => {
  const lastVerb = [...open].reverse().find(isVerb);
  return (
    open[open.length - 1].id === token.id - 1 &&
    (token.xpos === "ADV" ||
      (isVerb(token) && lastVerb != null && takesAnotherVerb(lastVerb)))
  );
};

const verbGroups = (tokens: ParsedToken[]) =>
  tokens.reduce((groups: ParsedToken[][], token) => {
    const open = groups[groups.length - 1] as ParsedToken[] | undefined;
    if (open != null && continuesAVerbGroup(open, token)) {
      return [...groups.slice(0, -1), [...open, token]];
    }

    return isVerb(token) ? [...groups, [token]] : groups;
  }, []);

const opensAnInfinitive = (tokens: ParsedToken[], [first]: ParsedToken[]) =>
  first.id > 0 && formOf(tokens[first.id - 1]) === "to";

const isTensed = (group: ParsedToken[]) =>
  group.some((token) => isVerb(token) && !isPresentParticiple(token));

export const lastVerbOfGroup = (tokens: ParsedToken[], verb: ParsedToken) => {
  const group = verbGroups(tokens).find((one) => one.includes(verb)) ?? [verb];
  return [...group].reverse().find(isVerb) ?? verb;
};

export const clauseVerbs = (tokens: ParsedToken[]) =>
  verbGroups(tokens)
    .filter((group) => isTensed(group) && !opensAnInfinitive(tokens, group))
    .map(([first]) => first);

const ASKS = new Set([
  "how",
  "what",
  "when",
  "where",
  "which",
  "who",
  "whom",
  "whose",
  "why",
]);

const DEGREES = new Set(["as", "so"]);

const SECOND_HALVES = new Map([
  ["that", "so"],
  ["if", "as"],
  ["though", "as"],
]);

type Sentence = { tokens: ParsedToken[]; verbs: ParsedToken[] };

const isAsked = (tokens: ParsedToken[]) =>
  tokens.some(({ feats: { PunctType } }) => PunctType === "Qest");

const stretchAfter = ({ tokens }: Sentence, token: ParsedToken) => {
  const rest = tokens.slice(token.id + 1);
  const stop = rest.findIndex(isPunctuation);
  return stop === -1 ? rest : rest.slice(0, stop);
};

const verbsAfter = (sentence: Sentence, token: ParsedToken) => {
  const stretch = stretchAfter(sentence, token);
  const last = stretch[stretch.length - 1] as ParsedToken | undefined;
  return last == null
    ? []
    : sentence.verbs.filter(({ id }) => id > token.id && id <= last.id);
};

const RELATIVIZERS = new Set(["that", "which", "who"]);

const closesARelative = ({ tokens }: Sentence, verb: ParsedToken) =>
  RELATIVIZERS.has(formOf(tokens[verb.id - 1]));

const isDescriptive = ({ xpos, feats: { PronType } }: ParsedToken) =>
  xpos === "ADV" || (xpos === "ADJ" && PronType == null);

const DEGREE_REACH = 6;

const isAnsweredByThat = ({ tokens }: Sentence, token: ParsedToken) =>
  formOf(token) === "so" &&
  tokens
    .slice(token.id + 2, token.id + DEGREE_REACH)
    .some((later) => formOf(later) === "that");

const gradesTheNextWord = (sentence: Sentence, token: ParsedToken) => {
  const next = sentence.tokens[token.id + 1] as ParsedToken | undefined;
  return (
    DEGREES.has(formOf(token)) &&
    next != null &&
    (isDescriptive(next) || isAnsweredByThat(sentence, token))
  );
};

const pointsAtANoun = ({ tokens }: Sentence, token: ParsedToken) =>
  formOf(token) === "that" &&
  (token.xpos === "ADJ" ||
    (isNoun(token) && !(token.id > 0 && isNoun(tokens[token.id - 1]))));

const opensAQuestion = ({ tokens }: Sentence, token: ParsedToken) =>
  token.id === 0 && ASKS.has(formOf(token)) && isAsked(tokens);

const completesTheWordBefore = ({ tokens }: Sentence, token: ParsedToken) =>
  token.id > 0 &&
  SECOND_HALVES.get(formOf(token)) === formOf(tokens[token.id - 1]);

const ALSO_PREPOSITIONS = new Set([
  "after",
  "as",
  "before",
  "once",
  "since",
  "until",
]);

const isALinkWord = (token: ParsedToken) =>
  SUBORDINATORS.has(formOf(token)) || COORDINATORS.has(formOf(token));

const opensASubject = ({ xpos }: ParsedToken) =>
  xpos === "NOUN" || xpos === "ADJ";

const governsAClause = (sentence: Sentence, token: ParsedToken) => {
  const stretch = stretchAfter(sentence, token);
  const [next] = stretch;
  const stop = stretch.findIndex(isALinkWord);
  const last = stretch[(stop === -1 ? stretch.length : stop) - 1] as
    | ParsedToken
    | undefined;
  return (
    last != null &&
    opensASubject(next) &&
    sentence.verbs.some(({ id }) => id > token.id && id <= last.id)
  );
};

const isOnlyAPreposition = (sentence: Sentence, token: ParsedToken) =>
  ALSO_PREPOSITIONS.has(formOf(token)) && !governsAClause(sentence, token);

const NAMES_A_NOUN = new Set(["a", "an", "the"]);

const isUsedAsANoun = ({ tokens }: Sentence, token: ParsedToken) =>
  token.id > 0 && NAMES_A_NOUN.has(formOf(tokens[token.id - 1]));

const isBecauseOf = ({ tokens }: Sentence, token: ParsedToken) =>
  formOf(token) === "because" && formOf(tokens[token.id + 1] ?? token) === "of";

const isNoSubordinator = (sentence: Sentence, token: ParsedToken) =>
  isOnlyAPreposition(sentence, token) ||
  isUsedAsANoun(sentence, token) ||
  isBecauseOf(sentence, token);

const subordinates = (sentence: Sentence, token: ParsedToken) =>
  SUBORDINATORS.has(formOf(token)) &&
  !(token.id === 0 && formOf(token) === "so") &&
  !isNoSubordinator(sentence, token) &&
  !pointsAtANoun(sentence, token) &&
  !gradesTheNextWord(sentence, token) &&
  !opensAQuestion(sentence, token) &&
  !completesTheWordBefore(sentence, token) &&
  verbsAfter(sentence, token).length > 0;

const coordinatesAClause = (sentence: Sentence, token: ParsedToken) => {
  if (!COORDINATORS.has(formOf(token)) || token.id === 0) {
    return false;
  }

  const verb = verbsAfter(sentence, token).find(
    (candidate) => !closesARelative(sentence, candidate),
  );
  return (
    verb != null &&
    sentence.verbs.some(({ id }) => id < token.id) &&
    sentence.tokens.slice(token.id + 1, verb.id).some(isNoun)
  );
};

const byPosition = (one: ClauseLink, other: ClauseLink) =>
  one.at.id - other.at.id;

export const clauseLinks = (tokens: ParsedToken[]): ClauseLink[] => {
  const sentence = { tokens, verbs: clauseVerbs(tokens) };
  const worded = tokens
    .filter(
      (token) =>
        subordinates(sentence, token) || coordinatesAClause(sentence, token),
    )
    .map((token) => ({ word: formOf(token), at: token }));
  const unworded = unmarkedRelatives(tokens).map(({ opening }) => ({
    word: "",
    at: opening,
  }));
  return [...worded, ...unworded].sort(byPosition);
};

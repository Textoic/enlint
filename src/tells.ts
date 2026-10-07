import parseToSubtree from "./parse-to-subtree.js";
import type { ParsedToken } from "./types/index.js";

export type TellKind =
  | "noun-fragment"
  | "teaser"
  | "announcement"
  | "which-tail"
  | "precise-figure"
  | "beat-comparison"
  | "matters-claim"
  | "can-cannot"
  | "equation"
  | "comma-and"
  | "split-contrast"
  | "reasoned-echo"
  | "staccato-run";

export type Tell = { kind: TellKind; start: number; end: number };

const isWord = ({ xpos }: ParsedToken) => xpos !== "PUNCT";

const formOf = ({ form }: ParsedToken) => form.toLowerCase();

const endOf = ({ form, misc: { at } }: ParsedToken) => at + form.length;

const spanOf = (kind: TellKind, from: ParsedToken, to: ParsedToken): Tell => ({
  kind,
  start: from.misc.at,
  end: endOf(to),
});

const lastWord = (tokens: ParsedToken[]) => [...tokens].reverse().find(isWord);

const wholeSentence = (kind: TellKind, tokens: ParsedToken[]): Tell[] => {
  const first = tokens.find(isWord);
  const last = lastWord(tokens);
  return first && last ? [spanOf(kind, first, last)] : [];
};

const punctuationOf = (tokens: ParsedToken[]) =>
  tokens.map(({ feats: { PunctType } }) => PunctType);

const SHORTEST_FRAGMENT = 4;

const RELATIVIZERS = new Set(["that", "where", "which", "who", "whose"]);

const isCommonNoun = ({ xpos, feats }: ParsedToken) =>
  xpos === "NOUN" && feats.PronType == null;

const LONGEST_FRAGMENT = 12;

const hangsAClause = (tokens: ParsedToken[], root: ParsedToken) => {
  const verbs = tokens.filter(({ xpos }) => xpos === "VERB");
  const words = tokens.filter(isWord);
  return (
    words.length <= LONGEST_FRAGMENT &&
    verbs.every(({ id }) => id > root.id) &&
    lastWord(tokens)?.xpos === "VERB" &&
    (verbs.length === 1 ||
      tokens.some((token) => RELATIVIZERS.has(formOf(token))))
  );
};

const endsPlainly = (tokens: ParsedToken[]) => {
  const marks = punctuationOf(tokens);
  return (
    marks[marks.length - 1] === "Peri" &&
    !marks.includes("Colo") &&
    !marks.includes("Quot")
  );
};

const nounFragment = (tokens: ParsedToken[]): Tell[] => {
  const root = tokens.find(({ head }) => head === -1);
  return root != null &&
    isCommonNoun(root) &&
    tokens.filter(isWord).length >= SHORTEST_FRAGMENT &&
    endsPlainly(tokens) &&
    hangsAClause(tokens, root)
    ? wholeSentence("noun-fragment", tokens)
    : [];
};

const textOf = (tokens: ParsedToken[]) =>
  tokens
    .filter(isWord)
    .map(formOf)
    .join(" ")
    .replace(/ (['’])/gu, "$1");

const TEASERS = [
  /\bone more (?:thing|effect|reason|point|benefit|trick|detail|catch|problem|step|idea|bonus)\b/u,
  /\b(?:and|but) (?:it|that|this)(?:['’]s| is) the (?:one|part|bit) (?:i|you|we)\b/u,
  /\bthe best part\b/u,
  /\bhere(?:['’]s| is) the (?:thing|kicker|catch|twist|secret|deal)\b/u,
];

const teaser = (tokens: ParsedToken[]): Tell[] => {
  const text = textOf(tokens);
  return TEASERS.some((pattern) => pattern.test(text))
    ? wholeSentence("teaser", tokens)
    : [];
};

const OPENS_ANNOUNCEMENT = /^here(?:['’]s| is| are)\b/u;

const announcement = (tokens: ParsedToken[]): Tell[] =>
  OPENS_ANNOUNCEMENT.test(textOf(tokens)) &&
  punctuationOf(tokens).includes("Colo")
    ? wholeSentence("announcement", tokens)
    : [];

const LINKS = new Set(["is", "was", "'s", "’s"]);

const POINTERS = new Set(["the", "what", "why", "where", "how", "exactly"]);

const opensWhichTail = (tokens: ParsedToken[], at: number) =>
  tokens[at].feats.PunctType === "Comm" &&
  formOf(tokens[at + 1] ?? tokens[at]) === "which" &&
  LINKS.has(formOf(tokens[at + 2] ?? tokens[at])) &&
  POINTERS.has(formOf(tokens[at + 3] ?? tokens[at]));

const whichTail = (tokens: ParsedToken[]): Tell[] => {
  const opening = tokens.find((_, at) => opensWhichTail(tokens, at));
  const last = lastWord(tokens);
  return opening && last ? [spanOf("which-tail", opening, last)] : [];
};

const LONG_DECIMAL = /^\d+\.\d{3,}$/u;

const DECIMAL = /^\d+\.\d+$/u;

const MULTIPLIERS = new Set(["times", "x", "×", "*"]);

const showsArithmetic = (tokens: ParsedToken[], at: number) =>
  DECIMAL.test(tokens[at].form) &&
  MULTIPLIERS.has(formOf(tokens[at + 1] ?? tokens[at])) &&
  DECIMAL.test(tokens[at + 2]?.form ?? "");

const preciseFigures = (tokens: ParsedToken[]): Tell[] =>
  tokens.flatMap((token, at) => {
    if (showsArithmetic(tokens, at)) {
      return [spanOf("precise-figure", token, tokens[at + 2])];
    }

    const insideArithmetic = at >= 2 && showsArithmetic(tokens, at - 2);
    return LONG_DECIMAL.test(token.form) && !insideArithmetic
      ? [spanOf("precise-figure", token, token)]
      : [];
  });

const HELPERS = new Set([
  "can",
  "could",
  "will",
  "would",
  "shall",
  "should",
  "may",
  "might",
  "must",
  "do",
]);

const NEGATORS = new Set([
  "not",
  "never",
  "no",
  "nothing",
  "none",
  "hardly",
  "barely",
  "neither",
  "nor",
]);

const wordOf = (token: ParsedToken) => token.lemma ?? formOf(token);

const isHelper = (token: ParsedToken) =>
  HELPERS.has(wordOf(token)) || HELPERS.has(formOf(token));

const isNegator = (token: ParsedToken) =>
  token.lemma === "not" || NEGATORS.has(formOf(token));

const isAdverb = ({ xpos }: ParsedToken) => xpos === "ADV";

const isDeterminer = ({ xpos, feats }: ParsedToken) =>
  xpos === "ADJ" && feats.PronType != null;

const isFigure = ({ form }: ParsedToken) => /^\d/u.test(form);

const isPersonalPronoun = ({ xpos, feats }: ParsedToken) =>
  xpos === "NOUN" && feats.PronType === "Prs";

const isName = ({ id, form }: ParsedToken) => id > 0 && /^\p{Lu}/u.test(form);

const endsInIng = (token: ParsedToken) => formOf(token).endsWith("ing");

const single = (kind: TellKind, token: ParsedToken) =>
  spanOf(kind, token, token);

const HELPER_REACH = 6;

const followsAHelper = (words: ParsedToken[], at: number) =>
  words.slice(Math.max(0, at - HELPER_REACH), at).some(isHelper);

const isMissedByTheParser = ({ xpos }: ParsedToken) => xpos !== "VERB";

const LITERAL_BEATERS = new Set([
  "heart",
  "hearts",
  "pulse",
  "drum",
  "drums",
  "drummer",
  "rain",
  "sun",
  "wings",
  "waves",
  "cook",
  "chef",
]);

const isBeatAsVerb = (words: ParsedToken[], at: number) => {
  const form = formOf(words[at]);
  return form === "beats" || (form === "beat" && followsAHelper(words, at));
};

const subjectBefore = (words: ParsedToken[], at: number) =>
  words
    .slice(0, at)
    .reverse()
    .find((word) => !isHelper(word) && !isAdverb(word) && word.lemma !== "not");

const canBeatFiguratively = (subject: ParsedToken | undefined) =>
  subject != null &&
  formOf(subject) !== "to" &&
  !isDeterminer(subject) &&
  !isPersonalPronoun(subject) &&
  !isName(subject) &&
  !LITERAL_BEATERS.has(formOf(subject));

const PEOPLE = new Set([
  "me",
  "him",
  "her",
  "us",
  "them",
  "his",
  "their",
  "my",
  "your",
  "our",
]);

const RATES = new Set(["a", "an", "per", "each", "every"]);

const isNominal = ({ xpos }: ParsedToken) => xpos === "NOUN" || xpos === "ADJ";

const opensAnObject = (token: ParsedToken | undefined) =>
  token != null &&
  !isName(token) &&
  !PEOPLE.has(formOf(token)) &&
  (isNominal(token) || (token.xpos === "VERB" && endsInIng(token)));

const countsBeats = (
  subject: ParsedToken | undefined,
  next: ParsedToken | undefined,
) =>
  subject != null &&
  next != null &&
  isFigure(subject) &&
  RATES.has(formOf(next));

const beatComparisons = (tokens: ParsedToken[]): Tell[] => {
  const words = tokens.filter(isWord);
  return words
    .filter(
      (word, at) =>
        isMissedByTheParser(word) &&
        isBeatAsVerb(words, at) &&
        canBeatFiguratively(subjectBefore(words, at)) &&
        opensAnObject(tokens[word.id + 1]) &&
        !countsBeats(subjectBefore(words, at), tokens[word.id + 1]),
    )
    .map((word) => single("beat-comparison", word));
};

const TAKES_MATTERS_AS_OBJECT = new Set([
  "make",
  "complicate",
  "settle",
  "simplify",
  "take",
  "discuss",
  "resolve",
  "help",
  "handle",
  "worsen",
  "improve",
  "clarify",
  "confuse",
]);

const MATTER_COMPOUNDS = new Set([
  "subject",
  "grey",
  "gray",
  "dark",
  "white",
  "organic",
  "printed",
  "reading",
  "particulate",
  "plant",
  "front",
  "back",
]);

const FOLLOWS_MATTER_THE_NOUN = new Set(["of", "worse", "arising", "and"]);

const FOLLOWS_MATTER_THE_VERB = new Set([
  "more",
  "most",
  "less",
  "least",
  "so",
  "too",
  "much",
  "little",
  "because",
]);

const POINTS_AT_A_CLAUSE = new Set(["what", "that", "which", "whatever", "it"]);

const PLURAL_POINTERS = new Set(["they", "these", "those", "both"]);

type Spot = {
  governor: ParsedToken | undefined;
  previous: ParsedToken | undefined;
  next: ParsedToken | undefined;
  helped: boolean;
};

const isPreposition = ({ feats }: ParsedToken) => feats.AdpType === "Prep";

const modifiesANoun = (previous: ParsedToken) =>
  previous.xpos === "ADJ" ||
  isPreposition(previous) ||
  TAKES_MATTERS_AS_OBJECT.has(wordOf(previous)) ||
  MATTER_COMPOUNDS.has(formOf(previous));

const takesADegree = ({ next }: Spot) =>
  next != null && FOLLOWS_MATTER_THE_VERB.has(formOf(next));

const headsANounPhrase = (spot: Spot) =>
  spot.previous == null ||
  (modifiesANoun(spot.previous) && !takesADegree(spot)) ||
  (spot.next != null && FOLLOWS_MATTER_THE_NOUN.has(formOf(spot.next)));

const followsAPointer = ({ previous }: Spot) =>
  previous != null && POINTS_AT_A_CLAUSE.has(formOf(previous));

const isCompoundSubject = (spot: Spot) =>
  spot.next != null &&
  !followsAPointer(spot) &&
  (isHelper(spot.next) ||
    (spot.previous != null &&
      isCommonNoun(spot.previous) &&
      spot.next.xpos === "VERB"));

const isTheSubstance = ({ next }: Spot) => next?.xpos === "VERB";

const isPlural = (token: ParsedToken) =>
  PLURAL_POINTERS.has(formOf(token)) ||
  (isCommonNoun(token) && token.feats.Number === "Plur");

const opensAnInfinitive = ({ previous }: Spot) =>
  previous != null && formOf(previous) === "to";

const isTheObjectOfAVerb = ({ previous }: Spot) =>
  previous?.xpos === "VERB" && !isHelper(previous);

const hasAVerbalCue = (spot: Spot) =>
  (spot.helped && !isTheObjectOfAVerb(spot)) ||
  (spot.previous != null && isPlural(spot.previous));

const closesAnObject = ({ governor, previous }: Spot) =>
  previous != null &&
  isCommonNoun(previous) &&
  governor?.xpos === "VERB" &&
  !isHelper(governor);

const MATTER_AS_VERB = new Map<string, (spot: Spot) => boolean>([
  ["mattered", () => true],
  [
    "matters",
    (spot) =>
      !headsANounPhrase(spot) &&
      !isCompoundSubject(spot) &&
      !closesAnObject(spot),
  ],
  [
    "matter",
    (spot) =>
      opensAnInfinitive(spot) ||
      (hasAVerbalCue(spot) && !headsANounPhrase(spot) && !isTheSubstance(spot)),
  ],
]);

const DENIAL_REACH = 3;

const isDenied = (words: ParsedToken[], at: number) =>
  words.slice(Math.max(0, at - DENIAL_REACH), at).some(isNegator);

const spotOf = (
  tokens: ParsedToken[],
  words: ParsedToken[],
  at: number,
): Spot => {
  const next = tokens[words[at].id + 1] as ParsedToken | undefined;
  const [previous, governor] = words
    .slice(0, at)
    .reverse()
    .filter((word) => !isAdverb(word)) as (ParsedToken | undefined)[];
  return {
    governor,
    previous,
    next: next != null && isWord(next) ? next : undefined,
    helped: followsAHelper(words, at),
  };
};

const claimsToMatter = (
  tokens: ParsedToken[],
  words: ParsedToken[],
  at: number,
) => {
  const readsAsVerb = MATTER_AS_VERB.get(formOf(words[at]));
  return (
    readsAsVerb != null &&
    isMissedByTheParser(words[at]) &&
    !isDenied(words, at) &&
    readsAsVerb(spotOf(tokens, words, at))
  );
};

const mattersClaims = (tokens: ParsedToken[]): Tell[] => {
  const words = tokens.filter(isWord);
  return words
    .filter((_, at) => claimsToMatter(tokens, words, at))
    .map((word) => single("matters-claim", word));
};

type Ability = {
  can: ParsedToken;
  refused: boolean;
  subject: string | undefined;
  verb: ParsedToken | undefined;
};

const subjectWordOf = (tokens: ParsedToken[], can: ParsedToken) => {
  const before = tokens[can.id - 1] as ParsedToken | undefined;
  return before != null && isWord(before) ? formOf(before) : undefined;
};

const verbAfter = (tokens: ParsedToken[], can: ParsedToken) => {
  const following = tokens
    .slice(can.id + 1)
    .find((token) => !isNegator(token) && !isAdverb(token));
  return following != null && isWord(following) ? following : undefined;
};

const REFUSALS = new Set(["not", "never"]);

const isRefusal = (token: ParsedToken | undefined) =>
  token != null && REFUSALS.has(wordOf(token));

const isTheVerbCan = (tokens: ParsedToken[], token: ParsedToken) => {
  const before = tokens[token.id - 1] as ParsedToken | undefined;
  return formOf(token) === "can" && !(before != null && isDeterminer(before));
};

const abilitiesIn = (tokens: ParsedToken[]): Ability[] =>
  tokens
    .filter((token) => isTheVerbCan(tokens, token))
    .map((can) => ({
      can,
      refused: isRefusal(tokens[can.id + 1]),
      subject: subjectWordOf(tokens, can),
      verb: verbAfter(tokens, can),
    }));

const sharesAWord = (first: string | undefined, second: string | undefined) =>
  first != null && first === second;

const answers = (granted: Ability, refused: Ability) =>
  refused.verb == null
    ? !sharesAWord(granted.subject, refused.subject)
    : sharesAWord(granted.subject, refused.subject) ||
      sharesAWord(granted.verb && wordOf(granted.verb), wordOf(refused.verb));

const LATEST_REFUSAL = 5;

const openingRefusal = (tokens: ParsedToken[]) => {
  const [first] = abilitiesIn(tokens) as (Ability | undefined)[];
  const opening = tokens.filter(isWord).slice(0, LATEST_REFUSAL + 1);
  return first?.refused && opening.includes(first.can) ? first : undefined;
};

const CLAUSE_BREAKS = new Set(["Comm", "Semi", "Dash", "Colo"]);

const CONTRASTS = new Set(["but", "yet"]);

const isClauseBreak = (token: ParsedToken) =>
  CLAUSE_BREAKS.has(token.feats.PunctType ?? "") ||
  CONTRASTS.has(formOf(token));

const opensAClauseAfter = (
  tokens: ParsedToken[],
  granted: ParsedToken,
  refused: ParsedToken,
) => {
  const between = tokens.slice(granted.id + 1, refused.id);
  const lastBreak = between.map(isClauseBreak).lastIndexOf(true);
  const opening = between.slice(lastBreak + 1);
  return lastBreak !== -1 && opening.length <= LATEST_REFUSAL;
};

const closesTheSentence = (tokens: ParsedToken[], { can, verb }: Ability) => {
  const last = lastWord(tokens);
  return last === verb || last === tokens[can.id + 1];
};

const LIGHT_VERBS = new Set(["be", "do", "have"]);

const JOINERS = new Set(["and", "but", "yet", "or", "so", "because"]);

const opensAClause = (token: ParsedToken) =>
  token.xpos === "PUNCT" || JOINERS.has(formOf(token));

const echoesAnEarlierVerb = (tokens: ParsedToken[], { can, verb }: Ability) => {
  const clause = tokens.slice(
    tokens.slice(0, can.id).map(opensAClause).lastIndexOf(true) + 1,
    can.id,
  );
  return (
    verb != null &&
    !LIGHT_VERBS.has(wordOf(verb)) &&
    clause.some((token) => wordOf(token) === wordOf(verb))
  );
};

const refusesWithinTheSentence = (tokens: ParsedToken[]) => {
  const abilities = abilitiesIn(tokens);
  const refusal = abilities[abilities.length - 1] as Ability | undefined;
  if (!refusal?.refused) {
    return false;
  }

  const closes = closesTheSentence(tokens, refusal);
  const isAnswered = abilities.some(
    (ability) =>
      !ability.refused &&
      answers(ability, refusal) &&
      ((closes && refusal.verb == null) ||
        opensAClauseAfter(tokens, ability.can, refusal.can)),
  );
  return isAnswered || (closes && echoesAnEarlierVerb(tokens, refusal));
};

const splitAbilities = (tokens: ParsedToken[]): Tell[] =>
  refusesWithinTheSentence(tokens) ? wholeSentence("can-cannot", tokens) : [];

const isSpoken = (tokens: ParsedToken[]) =>
  punctuationOf(tokens).some((mark) => mark === "Quot" || mark === "Qest");

const runsOn = (tokens: ParsedToken[], next: ParsedToken[]) => {
  const last = tokens[tokens.length - 1] as ParsedToken | undefined;
  const [first] = next as (ParsedToken | undefined)[];
  return (
    last != null &&
    first != null &&
    /^[\p{L}\p{N}]/u.test(first.form) &&
    first.misc.at - endOf(last) <= 1
  );
};

const followsOn = (tokens: ParsedToken[], next: ParsedToken[]) =>
  runsOn(tokens, next) &&
  !isSpoken(tokens) &&
  !isSpoken(next) &&
  !refusesWithinTheSentence(tokens);

const pairedAbilities = (
  tokens: ParsedToken[],
  next: ParsedToken[] | undefined,
): Tell[] => {
  const refusal = next && followsOn(tokens, next) && openingRefusal(next);
  const first = tokens.find(isWord);
  const last = next && lastWord(next);
  const isAnswered =
    refusal != null &&
    refusal !== false &&
    abilitiesIn(tokens).some(
      (ability) => !ability.refused && answers(ability, refusal),
    );
  return isAnswered && first && last ? [spanOf("can-cannot", first, last)] : [];
};

const isBe = (token: ParsedToken) =>
  token.xpos === "VERB" && wordOf(token) === "be";

const childrenOf = (
  tokens: ParsedToken[],
  { misc: { children } }: ParsedToken,
) => children.map((child) => tokens[child]);

const PLACEHOLDER_SUBJECTS = new Set(["there", "here"]);

const isFullNoun = (token: ParsedToken) =>
  isCommonNoun(token) && !PLACEHOLDER_SUBJECTS.has(formOf(token));

const helpsAnotherVerb = (tokens: ParsedToken[], be: ParsedToken) =>
  childrenOf(tokens, be).some(
    (child) =>
      child.id > be.id && child.xpos === "VERB" && !opensAClause(child),
  ) &&
  !childrenOf(tokens, be).some(
    (child) => child.id > be.id && isFullNoun(child),
  );

const isPronounWord = ({ xpos, feats: { PronType } }: ParsedToken) =>
  xpos === "NOUN" && PronType != null;

const equatedPair = (tokens: ParsedToken[], be: ParsedToken) => {
  const children = childrenOf(tokens, be);
  const subject = [...children]
    .reverse()
    .find((child) => child.id < be.id && child.xpos === "NOUN");
  const predicate = children.find(
    (child) =>
      child.id > be.id &&
      child.xpos !== "PUNCT" &&
      !isAdverb(child) &&
      !isPronounWord(child),
  );
  return subject != null &&
    predicate != null &&
    isFullNoun(subject) &&
    isFullNoun(predicate) &&
    !isFigure(predicate)
    ? { subject, predicate }
    : undefined;
};

const startOfPhrase = (tokens: ParsedToken[], head: ParsedToken) =>
  tokens[Math.min(...parseToSubtree(tokens, head.id), head.id)];

const isAsked = (tokens: ParsedToken[]) =>
  punctuationOf(tokens).includes("Qest");

const equations = (tokens: ParsedToken[]): Tell[] =>
  isAsked(tokens)
    ? []
    : tokens
        .filter((token) => isBe(token) && !helpsAnotherVerb(tokens, token))
        .flatMap((be) => {
          const pair = equatedPair(tokens, be);
          return pair == null
            ? []
            : [
                spanOf(
                  "equation",
                  startOfPhrase(tokens, pair.subject),
                  pair.predicate,
                ),
              ];
        });

const isComma = ({ feats: { PunctType } }: ParsedToken) => PunctType === "Comm";

const isPresentParticiple = ({ feats: { VerbForm, Tense } }: ParsedToken) =>
  VerbForm === "Part" && Tense === "Pres";

const isFinite = (token: ParsedToken) =>
  token.xpos === "VERB" && !isPresentParticiple(token);

const firstVerbAfter = (tokens: ParsedToken[], and: ParsedToken) => {
  const rest = tokens.slice(and.id + 1);
  const stop = rest.findIndex(isComma);
  return (stop === -1 ? rest : rest.slice(0, stop)).find(
    ({ xpos }) => xpos === "VERB",
  );
};

const isSubjectOf = (
  subject: ParsedToken,
  verb: ParsedToken,
  and: ParsedToken,
) =>
  subject.xpos === "NOUN" &&
  (subject.head === verb.id ||
    verb.head === subject.id ||
    subject.head === and.id);

const opensAnInfinitiveAt = (tokens: ParsedToken[], verb: ParsedToken) =>
  formOf(tokens[verb.id - 1]) === "to";

const isNounWord = ({ xpos }: ParsedToken) => xpos === "NOUN";

const isRelativized = (
  tokens: ParsedToken[],
  and: ParsedToken,
  verb: ParsedToken,
) =>
  tokens
    .slice(and.id + 1, verb.id)
    .some((token) => RELATIVIZERS.has(formOf(token))) ||
  (isPersonalPronoun(tokens[verb.id - 1]) &&
    tokens.slice(and.id + 1, verb.id - 1).some(isNounWord));

const joinsAClause = (tokens: ParsedToken[], and: ParsedToken) => {
  const verb = firstVerbAfter(tokens, and);
  return (
    verb != null &&
    isFinite(verb) &&
    !opensAnInfinitiveAt(tokens, verb) &&
    !isRelativized(tokens, and, verb) &&
    tokens.slice(0, and.id).some(isFinite) &&
    tokens
      .slice(and.id + 1, verb.id)
      .some((token) => isSubjectOf(token, verb, and))
  );
};

const commaAnds = (tokens: ParsedToken[]): Tell[] =>
  tokens
    .filter(
      (token, at) =>
        formOf(token) === "and" &&
        at > 0 &&
        isComma(tokens[at - 1]) &&
        joinsAClause(tokens, token),
    )
    .map((and) => spanOf("comma-and", tokens[and.id - 1], and));

const RESTRICTORS = new Set(["just", "only", "simply", "merely"]);

const RESTRICTOR_REACH = 4;

const SHORT_ANSWER = 12;

const SHORTEST_DENIAL = 3;

const wordsOf = (tokens: ParsedToken[]) => tokens.filter(isWord);

const isPointer = ({ xpos, feats: { PronType } }: ParsedToken) =>
  xpos === "NOUN" && (PronType === "Prs" || PronType === "Dem");

const opensOnTheSameSubject = (tokens: ParsedToken[], next: ParsedToken[]) => {
  const [first] = wordsOf(tokens);
  const [second] = wordsOf(next);
  return (
    first.xpos === "NOUN" &&
    formOf(first) === formOf(second) &&
    wordsOf(next).length <= SHORT_ANSWER
  );
};

const restrictsEarly = (next: ParsedToken[]) =>
  wordsOf(next)
    .slice(0, RESTRICTOR_REACH)
    .some((token) => RESTRICTORS.has(formOf(token)));

const affirms = (next: ParsedToken[]) => !next.some(isNegator);

const restatesWithBe = (next: ParsedToken[]) => {
  const [subject, verb] = wordsOf(next) as (ParsedToken | undefined)[];
  return (
    subject != null &&
    verb != null &&
    isPointer(subject) &&
    wordOf(verb) === "be"
  );
};

const deniesWithBe = (tokens: ParsedToken[]) =>
  tokens.some(
    (token) =>
      token.lemma === "not" &&
      token.id > 0 &&
      wordOf(tokens[token.id - 1]) === "be",
  );

const repeatsAfterNot = (tokens: ParsedToken[], next: ParsedToken[]) => {
  const [not, repeated] = wordsOf(tokens) as (ParsedToken | undefined)[];
  const [answer] = wordsOf(next);
  return (
    not != null &&
    repeated != null &&
    formOf(not) === "not" &&
    formOf(repeated) === formOf(answer)
  );
};

const answersPlainly = (tokens: ParsedToken[], next: ParsedToken[]) =>
  affirms(next) &&
  ((deniesWithBe(tokens) && restatesWithBe(next)) ||
    opensOnTheSameSubject(tokens, next));

const answersADenial = (tokens: ParsedToken[], next: ParsedToken[]) =>
  restrictsEarly(next) ||
  repeatsAfterNot(tokens, next) ||
  answersPlainly(tokens, next);

const isUnspoken = (tokens: ParsedToken[], next: ParsedToken[]) =>
  runsOn(tokens, next) && !isSpoken(tokens) && !isSpoken(next);

const deniesThenAsserts = (tokens: ParsedToken[], next: ParsedToken[]) =>
  wordsOf(tokens).length >= SHORTEST_DENIAL &&
  tokens.some(isNegator) &&
  isUnspoken(tokens, next) &&
  answersADenial(tokens, next);

const splitContrasts = (
  tokens: ParsedToken[],
  next: ParsedToken[] | undefined,
): Tell[] => {
  const first = tokens.find(isWord);
  const last = next && lastWord(next);
  return next && first && last && deniesThenAsserts(tokens, next)
    ? [spanOf("split-contrast", first, last)]
    : [];
};

const ABSENCES = new Set(["nothing", "anything", "none"]);

const EMPTY_VERBS = new Set(["be", "have", "do", "get", "make", "go"]);

const SHORTEST_ECHO = 4;

const isFullVerb = (token: ParsedToken) =>
  token.xpos === "VERB" &&
  token.feats.Mood == null &&
  !EMPTY_VERBS.has(wordOf(token)) &&
  wordOf(token).length >= SHORTEST_ECHO;

const echoKeyOf = (token: ParsedToken) => {
  if (ABSENCES.has(formOf(token))) {
    return "nothing";
  }

  return isFullVerb(token) ? wordOf(token) : undefined;
};

const keysOf = (tokens: ParsedToken[]) =>
  new Set(tokens.map(echoKeyOf).filter((key) => key != null));

const reasonedEchoes = (tokens: ParsedToken[]): Tell[] => {
  const because = tokens.find(
    (token) => token.id > 0 && formOf(token) === "because",
  );
  if (because == null) {
    return [];
  }

  const claimed = keysOf(tokens.slice(0, because.id));
  const echoes = [...keysOf(tokens.slice(because.id + 1))].some((key) =>
    claimed.has(key),
  );
  return echoes ? wholeSentence("reasoned-echo", tokens) : [];
};

const DETECTORS: ((
  tokens: ParsedToken[],
  next: ParsedToken[] | undefined,
) => Tell[])[] = [
  nounFragment,
  teaser,
  announcement,
  whichTail,
  preciseFigures,
  beatComparisons,
  mattersClaims,
  splitAbilities,
  pairedAbilities,
  equations,
  commaAnds,
  splitContrasts,
  reasonedEchoes,
];

const CLIPPED = 6;

const STACCATO_RUN = 3;

const SHORTISH = 11;

const CHOPPY_RUN = 4;

const CHOPPY_MEAN = 6.5;

const isListed = (tokens: ParsedToken[]) => /^\d/u.test(tokens[0]?.form ?? "");

const isUnder =
  (limit: number) =>
  (tokens: ParsedToken[]): boolean =>
    wordsOf(tokens).length <= limit && !isSpoken(tokens) && !isListed(tokens);

type Fits = (tokens: ParsedToken[]) => boolean;

const runFrom = (sentences: ParsedToken[][], at: number, fits: Fits) => {
  let length = 0;
  while (
    at + length < sentences.length &&
    fits(sentences[at + length]) &&
    (length === 0 || runsOn(sentences[at + length - 1], sentences[at + length]))
  ) {
    length += 1;
  }

  return sentences.slice(at, at + length);
};

const meanWords = (run: ParsedToken[][]) =>
  run.reduce((total, tokens) => total + wordsOf(tokens).length, 0) /
  Math.max(run.length, 1);

const staccatoFrom = (sentences: ParsedToken[][], at: number) => {
  const clipped = runFrom(sentences, at, isUnder(CLIPPED));
  const choppy = runFrom(sentences, at, isUnder(SHORTISH));
  const isChoppy =
    choppy.length >= CHOPPY_RUN && meanWords(choppy) <= CHOPPY_MEAN;
  if (isChoppy) {
    return choppy;
  }

  return clipped.length >= STACCATO_RUN ? clipped : [];
};

const staccatoRuns = (sentences: ParsedToken[][]): Tell[] => {
  const found: Tell[] = [];
  let at = 0;
  while (at < sentences.length) {
    const run = staccatoFrom(sentences, at);
    const first = run[0]?.find(isWord);
    const last = lastWord(run[run.length - 1] ?? []);
    if (first && last) {
      found.push(spanOf("staccato-run", first, last));
    }

    at += Math.max(run.length, 1);
  }

  return found;
};

export default (sentences: ParsedToken[][]): Tell[] => [
  ...sentences.flatMap((tokens, at) =>
    DETECTORS.flatMap((detector) => detector(tokens, sentences[at + 1])),
  ),
  ...staccatoRuns(sentences),
];

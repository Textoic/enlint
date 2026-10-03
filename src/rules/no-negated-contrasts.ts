import parseToSubtree from "../parse-to-subtree.js";
import { ErrorId, type LintError, type ParsedToken } from "../types/index.js";

const minimizers = ["just", "merely", "only", "simply", "solely"];
const contrastiveMarks = ["but"];
const clauseBreaks = ["Comm", "Dash", "Colo", "Semi"];
const negativeWords = new Set(["not", "never", "neither", "nor"]);
const reportingPredicates = new Set([
  "swear",
  "promise",
  "say",
  "insist",
  "assure",
  "suppose",
  "think",
  "guess",
]);

const messages = {
  trailing: `Cut the negated tail and keep what is true: "the reported span is the phrase, not a stray overlap elsewhere in the sentence" becomes "the reported span is the phrase".`,
  minimized: `Instead of "not just X, but also Y", write "X and Y": "He is not just a teacher, but also a coach" becomes "He is a teacher and a coach".`,
  restated: `Say what the thing is instead of what it is not: "The thing that blows up is not the deficit; it's the debt" becomes "But it's the debt that blows up".`,
};

const wordOf = ({ form, lemma }: ParsedToken) => (lemma ?? form).toLowerCase();

const isNegation = ({ lemma }: ParsedToken) => lemma === "not";

const isMinimizer = (token: ParsedToken) => minimizers.includes(wordOf(token));

const isContrastiveMark = (token: ParsedToken) =>
  token.xpos === "MARK" && contrastiveMarks.includes(wordOf(token));

const isComma = ({ feats: { PunctType } }: ParsedToken) => PunctType === "Comm";

const isSemicolon = ({ feats: { PunctType } }: ParsedToken) =>
  PunctType === "Semi";

const isClauseBreak = ({ feats: { PunctType } }: ParsedToken) =>
  PunctType != null && clauseBreaks.includes(PunctType);

const isPronoun = ({ xpos, feats: { PronType } }: ParsedToken) =>
  xpos === "NOUN" && PronType != null;

const isNominal = ({ xpos }: ParsedToken) => xpos === "NOUN" || xpos === "ADJ";

const endOf = ({ form, misc: { at } }: ParsedToken) => at + form.length;

const lastContentToken = (tokens: ParsedToken[]) =>
  [...tokens].reverse().find(({ xpos }) => xpos !== "PUNCT");

const subtreeEnd = (tokens: ParsedToken[], id: number) => {
  const words = parseToSubtree(tokens, id).filter(
    (member) => tokens[member].xpos !== "PUNCT",
  );
  return endOf(tokens[Math.max(...words, id)]);
};

const firstConjunct = (tokens: ParsedToken[], head: ParsedToken) =>
  head.misc.children
    .map((child) => tokens[child])
    .find(({ xpos }) => xpos !== "PUNCT");

const markerChildOf = (tokens: ParsedToken[], token: ParsedToken) =>
  token.misc.children
    .map((child) => tokens[child])
    .find(({ xpos }) => xpos === "MARK");

const runsParallel = (
  tokens: ParsedToken[],
  joined: ParsedToken,
  negated: ParsedToken,
) => {
  const marker = markerChildOf(tokens, negated);
  return (
    joined.xpos === "MARK" &&
    marker != null &&
    wordOf(marker) === wordOf(joined)
  );
};

const conjunctsOf = (
  tokens: ParsedToken[],
  contrast: ParsedToken,
  negated: ParsedToken,
) => {
  const joined = firstConjunct(tokens, contrast);
  if (joined == null) {
    return [];
  }

  const inner = runsParallel(tokens, joined, negated)
    ? firstConjunct(tokens, joined)
    : null;
  return inner == null ? [joined] : [joined, inner];
};

const ancestorsOf = (tokens: ParsedToken[], token: ParsedToken) => {
  const chain = new Set<number>();
  let { id } = token;
  while (id !== -1 && !chain.has(id)) {
    chain.add(id);
    ({ head: id } = tokens[id]);
  }

  return chain;
};

const joinsTheSameClause = (
  tokens: ParsedToken[],
  contrast: ParsedToken,
  negated: ParsedToken,
) => {
  const chain = ancestorsOf(tokens, negated);
  return (
    chain.has(contrast.head) || chain.has(tokens[contrast.head]?.head ?? -1)
  );
};

const subjectOf = (tokens: ParsedToken[], head: ParsedToken) =>
  head.misc.children
    .map((child) => tokens[child])
    .find(({ id, xpos }) => id < head.id && xpos === "NOUN");

const isAuxiliary = (token: ParsedToken) =>
  token.xpos === "VERB" &&
  (token.feats.Mood != null || ["be", "do", "have"].includes(wordOf(token)));

const predicateContains = (
  tokens: ParsedToken[],
  head: ParsedToken,
  words: Set<string>,
): boolean =>
  words.has(wordOf(head)) ||
  head.misc.children.some((id) => {
    const child = tokens[id];
    return (
      words.has(wordOf(child)) ||
      (isAuxiliary(head) &&
        child.id > head.id &&
        ["VERB", "NOUN", "ADJ"].includes(child.xpos) &&
        predicateContains(tokens, child, words))
    );
  });

const isAffirmativeCounterpart = (tokens: ParsedToken[], head: ParsedToken) =>
  !predicateContains(tokens, head, negativeWords);

const isRestatingPredicate = (tokens: ParsedToken[], head: ParsedToken) =>
  head.xpos === "VERB" &&
  !reportingPredicates.has(wordOf(head)) &&
  isAffirmativeCounterpart(tokens, head);

const hasAdditiveConjunct = (tokens: ParsedToken[], contrast: ParsedToken) =>
  contrast.misc.children.some((id) =>
    predicateContains(
      tokens,
      tokens[id],
      new Set(["also", "even", "too", "still"]),
    ),
  );

const contrastsWith = (
  tokens: ParsedToken[],
  contrast: ParsedToken,
  negated: ParsedToken,
) => {
  if (!joinsTheSameClause(tokens, contrast, negated)) {
    return false;
  }

  const [conjunct, ...inner] = conjunctsOf(tokens, contrast, negated);
  if (
    conjunct == null ||
    subjectOf(tokens, conjunct) != null ||
    !isAffirmativeCounterpart(tokens, conjunct)
  ) {
    return false;
  }

  if (!isMinimizer(negated) && hasAdditiveConjunct(tokens, contrast)) {
    return false;
  }

  return (
    isMinimizer(negated) ||
    [conjunct, ...inner].some(({ xpos }) => xpos === negated.xpos)
  );
};

const contrastAfter = (
  tokens: ParsedToken[],
  negation: ParsedToken,
  negated: ParsedToken,
) =>
  tokens.find(
    (token) =>
      token.id > negation.id &&
      isContrastiveMark(token) &&
      contrastsWith(tokens, token, negated),
  );

const hasPronounSubject = (tokens: ParsedToken[], verb: ParsedToken) =>
  verb.misc.children.some(
    (child) => child < verb.id && isPronoun(tokens[child]),
  );

const offersNominalCounterpart = (
  tokens: ParsedToken[],
  clause: ParsedToken,
  negated: ParsedToken,
) =>
  clause.misc.children.some(
    (child) => child > clause.id && tokens[child].xpos === negated.xpos,
  );

const noVerbBetween = (tokens: ParsedToken[], from: number, to: number) =>
  tokens.slice(from + 1, to).every(({ xpos }) => xpos !== "VERB");

const clauseSubject = (tokens: ParsedToken[], verb: ParsedToken) =>
  subjectOf(tokens, verb) ??
  (verb.head >= 0 ? subjectOf(tokens, tokens[verb.head]) : undefined);

const sharesItsSubject = (
  tokens: ParsedToken[],
  clause: ParsedToken,
  negated: ParsedToken,
) => {
  const restated = clauseSubject(tokens, clause);
  const original = clauseSubject(tokens, negated);
  return (
    restated != null &&
    original != null &&
    restated.form.toLowerCase() === original.form.toLowerCase()
  );
};

const restatesInPlace = (
  tokens: ParsedToken[],
  clause: ParsedToken,
  negated: ParsedToken,
  breakId: number,
) =>
  negated.xpos === "VERB"
    ? clause.head === negated.head &&
      noVerbBetween(tokens, negated.id, breakId) &&
      sharesItsSubject(tokens, clause, negated)
    : offersNominalCounterpart(tokens, clause, negated);

const restatesAcrossTheBreak = (
  tokens: ParsedToken[],
  clause: ParsedToken,
  negated: ParsedToken,
) =>
  negated.xpos === "VERB" || offersNominalCounterpart(tokens, clause, negated);

const clauseBreakBefore = (tokens: ParsedToken[], verb: ParsedToken) =>
  verb.misc.children.find(
    (child) => child < verb.id && isClauseBreak(tokens[child]),
  );

const opensRightAfter = (
  tokens: ParsedToken[],
  negated: ParsedToken,
  breakId: number | undefined,
) =>
  breakId != null &&
  Math.max(...parseToSubtree(tokens, negated.id)) === breakId - 1;

const restatingClause = (
  tokens: ParsedToken[],
  negation: ParsedToken,
  negated: ParsedToken,
) =>
  tokens.find((token) => {
    const breakId = clauseBreakBefore(tokens, token);
    return (
      token.id > negation.id &&
      isRestatingPredicate(tokens, token) &&
      hasPronounSubject(tokens, token) &&
      breakId != null &&
      opensRightAfter(tokens, negated, breakId) &&
      !parseToSubtree(tokens, negated.id).includes(token.id) &&
      restatesInPlace(tokens, token, negated, breakId)
    );
  });

const restatingSentence = (
  tokens: ParsedToken[],
  negated: ParsedToken,
  next: ParsedToken[] | undefined,
) => {
  const last = tokens[tokens.length - 1];
  if (!next || !last || !isSemicolon(last)) {
    return undefined;
  }

  if (!opensRightAfter(tokens, negated, last.id)) {
    return undefined;
  }

  const root = next.find(({ head }) => head === -1);
  return root &&
    isRestatingPredicate(next, root) &&
    hasPronounSubject(next, root) &&
    restatesAcrossTheBreak(next, root, negated)
    ? next
    : undefined;
};

const hasCounterpart = (tokens: ParsedToken[], negated: ParsedToken) => {
  const parent = tokens[negated.head];
  if (parent.xpos === negated.xpos && parent.id < negated.id) {
    return true;
  }

  return parent.misc.children.some(
    (child) => child < negated.id && tokens[child].xpos === negated.xpos,
  );
};

const isTail = (tokens: ParsedToken[], negated: ParsedToken) =>
  isNominal(negated) && negated.head >= 0 && hasCounterpart(tokens, negated);

const isCommonNoun = ({ xpos, feats }: ParsedToken) =>
  xpos === "NOUN" && feats.PronType == null;

const restatesAnEarlierNoun = (tokens: ParsedToken[], tail: ParsedToken) =>
  tokens
    .slice(0, tail.id)
    .some((token) => isCommonNoun(token) && wordOf(token) === wordOf(tail));

const isRestatedTail = (
  tokens: ParsedToken[],
  negation: ParsedToken,
  token: ParsedToken,
) =>
  isCommonNoun(token) &&
  token.head === negation.head &&
  restatesAnEarlierNoun(tokens, token);

const negatedTail = (
  tokens: ParsedToken[],
  negation: ParsedToken,
  negated: ParsedToken,
) =>
  isTail(tokens, negated)
    ? negated
    : tokens
        .slice(negation.id + 1)
        .find((token) => isRestatedTail(tokens, negation, token));

const closingComma = (tokens: ParsedToken[], chunkEnd: number) => {
  const next = tokens[chunkEnd + 1];
  return next && isComma(next) ? next : undefined;
};

const noPunctuationBetween = (
  tokens: ParsedToken[],
  from: number,
  to: number,
) => tokens.slice(from + 1, to + 1).every(({ xpos }) => xpos !== "PUNCT");

const chunkEndOf = (tokens: ParsedToken[], negated: ParsedToken) => {
  const words = parseToSubtree(tokens, negated.id).filter(
    (member) => tokens[member].xpos !== "PUNCT",
  );
  return Math.max(...words, negated.id);
};

const tailEnd = (tokens: ParsedToken[], negated: ParsedToken) => {
  const chunkEnd = chunkEndOf(tokens, negated);
  const closing = closingComma(tokens, chunkEnd);
  if (closing) {
    return endOf(closing);
  }

  const last = lastContentToken(tokens);
  return last && noPunctuationBetween(tokens, chunkEnd, last.id)
    ? endOf(last)
    : endOf(tokens[chunkEnd]);
};

const trailingError = (
  tokens: ParsedToken[],
  tail: ParsedToken,
  opening: ParsedToken,
): LintError => {
  const range: [number, number] = [opening.misc.at, tailEnd(tokens, tail)];

  return {
    start: range[0],
    end: range[1],
    message: messages.trailing,
    id: ErrorId.NO_NEGATED_CONTRASTS,
    suggestions: [{ range, text: "" }],
  };
};

const LONGEST_BARE_TAIL = 9;

const tailWords = (tokens: ParsedToken[], negation: ParsedToken) => {
  const rest = tokens.slice(negation.id + 1);
  const stop = rest.findIndex(isClauseBreak);
  return (stop === -1 ? rest : rest.slice(0, stop)).filter(
    ({ xpos }) => xpos !== "PUNCT",
  );
};

const opensANounPhrase = (token: ParsedToken | undefined) =>
  token != null && isNominal(token) && !isPronoun(token);

const isStatedBefore = (tokens: ParsedToken[], negation: ParsedToken) =>
  tokens.slice(0, negation.id).some(({ xpos }) => xpos === "VERB");

const isBareTail = (tokens: ParsedToken[], negation: ParsedToken) => {
  const words = tailWords(tokens, negation);
  const last = lastContentToken(tokens);
  return (
    negation.form.toLowerCase() === "not" &&
    opensANounPhrase(words[0]) &&
    words.length <= LONGEST_BARE_TAIL &&
    words[words.length - 1] === last &&
    !words.some((word) => isAuxiliary(word) || isPronoun(word)) &&
    isStatedBefore(tokens, negation)
  );
};

const bareTailError = (
  tokens: ParsedToken[],
  negation: ParsedToken,
  opening: ParsedToken,
): LintError => {
  const words = tailWords(tokens, negation);
  const range: [number, number] = [
    opening.misc.at,
    endOf(words[words.length - 1]),
  ];
  return {
    start: range[0],
    end: range[1],
    message: messages.trailing,
    id: ErrorId.NO_NEGATED_CONTRASTS,
    suggestions: [{ range, text: "" }],
  };
};

const contraction = /^(?:['’`´]|n['’`´]?t$)/u;

const startOf = (tokens: ParsedToken[], negation: ParsedToken) => {
  const host = tokens[negation.id - 1];
  return contraction.test(negation.form) && host
    ? host.misc.at
    : negation.misc.at;
};

const spanning = (
  tokens: ParsedToken[],
  negation: ParsedToken,
  end: number,
  message: string,
): LintError => ({
  start: startOf(tokens, negation),
  end,
  message,
  id: ErrorId.NO_NEGATED_CONTRASTS,
});

type Negation = {
  tokens: ParsedToken[];
  negation: ParsedToken;
  negated: ParsedToken;
  next: ParsedToken[] | undefined;
};

const restated = ({ tokens, negation, negated, next }: Negation) => {
  const clause = restatingClause(tokens, negation, negated);
  const ownEnd = clause && lastContentToken(tokens);
  if (ownEnd) {
    return spanning(tokens, negation, endOf(ownEnd), messages.restated);
  }

  const sentence = restatingSentence(tokens, negated, next);
  const last = sentence && lastContentToken(sentence);
  return last
    ? spanning(tokens, negation, endOf(last), messages.restated)
    : undefined;
};

const classify = ({
  tokens,
  negation,
  negated,
  next,
}: Negation): LintError | undefined => {
  if (tokens[negation.id + 1]?.form.toLowerCase() === "even") {
    return undefined;
  }

  const contrast = contrastAfter(tokens, negation, negated);
  if (contrast) {
    const end = subtreeEnd(tokens, contrast.id);
    const message = isMinimizer(negated)
      ? messages.minimized
      : messages.restated;
    return spanning(tokens, negation, end, message);
  }

  const restatement = restated({ tokens, negation, negated, next });
  if (restatement) {
    return restatement;
  }

  const opening = tokens[negation.id - 1];
  if (!opening || !isComma(opening)) {
    return undefined;
  }

  const tail = negatedTail(tokens, negation, negated);
  if (tail) {
    return trailingError(tokens, tail, opening);
  }

  return isBareTail(tokens, negation)
    ? bareTailError(tokens, negation, opening)
    : undefined;
};

const applyRule = (tokens: ParsedToken[], next: ParsedToken[] | undefined) =>
  tokens
    .filter((token) => isNegation(token) && token.head >= 0)
    .map((negation) =>
      classify({ tokens, negation, negated: tokens[negation.head], next }),
    )
    .filter((error): error is LintError => error != null);

export default (sentences: ParsedToken[][]) =>
  sentences.reduce(
    (errors: LintError[], tokens, index) => [
      ...errors,
      ...applyRule(tokens, sentences[index + 1]),
    ],
    [],
  );

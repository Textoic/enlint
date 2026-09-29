import {
  ErrorId,
  type Config,
  type LexicalDensityOptions,
  type LintError,
  type ParsedToken,
} from "../types/index.js";

const defaultOptions: Required<LexicalDensityOptions> = {
  nounPercentage: 40,
  adjectivePercentage: 20,
  nounAndAdjectivePercentage: 50,
  minimumWords: 16,
};

const isWord = ({ xpos }: ParsedToken) => xpos !== "PUNCT";

const actionNouns = new Set([
  "administration",
  "alignment",
  "allocation",
  "application",
  "approval",
  "assessment",
  "authorization",
  "classification",
  "collaboration",
  "communication",
  "completion",
  "compliance",
  "configuration",
  "consideration",
  "consolidation",
  "construction",
  "consultation",
  "coordination",
  "creation",
  "delegation",
  "delivery",
  "deployment",
  "destruction",
  "determination",
  "development",
  "displacement",
  "distribution",
  "documentation",
  "enforcement",
  "establishment",
  "evaluation",
  "examination",
  "execution",
  "expansion",
  "implementation",
  "improvement",
  "inspection",
  "installation",
  "integration",
  "interpretation",
  "investigation",
  "management",
  "measurement",
  "modification",
  "negotiation",
  "organization",
  "participation",
  "performance",
  "preparation",
  "presentation",
  "prioritization",
  "production",
  "provision",
  "reassessment",
  "recommendation",
  "reconciliation",
  "reconstruction",
  "reduction",
  "registration",
  "regulation",
  "reorganization",
  "replacement",
  "representation",
  "resolution",
  "restoration",
  "retention",
  "revision",
  "selection",
  "submission",
  "supervision",
  "transformation",
  "utilization",
  "validation",
  "verification",
]);

const isPlainNoun = ({ xpos, feats: { PronType } }: ParsedToken) =>
  xpos === "NOUN" && PronType == null;

const isActionNoun = (token: ParsedToken) =>
  isPlainNoun(token) &&
  actionNouns.has(token.lemma ?? token.form.toLowerCase());

const isPlainAdjective = ({ xpos, feats: { PronType } }: ParsedToken) =>
  xpos === "ADJ" && PronType == null;

const complementPrepositions = new Set([
  "of",
  "for",
  "with",
  "to",
  "by",
  "in",
  "on",
  "over",
  "across",
  "between",
]);

const hasPrepositionalComplement = (noun: ParsedToken, tokens: ParsedToken[]) =>
  noun.misc.children.some((id) => {
    const child = tokens[id];
    return (
      child.id === noun.id + 1 &&
      child.xpos === "MARK" &&
      complementPrepositions.has(child.lemma ?? child.form.toLowerCase())
    );
  });

const hasFinitePredicate = (tokens: ParsedToken[]) =>
  tokens.some(
    ({ xpos, feats }) =>
      xpos === "VERB" &&
      feats.VerbForm !== "Part" &&
      (feats.VerbForm === "Fin" || feats.Tense != null || feats.Mood != null),
  );

const isListSeparator = ({ form, lemma }: ParsedToken) =>
  [",", ";", ":", "and", "or", "nor"].includes(lemma ?? form.toLowerCase());

const isNominalList = (nouns: ParsedToken[], tokens: ParsedToken[]) =>
  nouns.slice(1).every((noun, index) => {
    const between = tokens.slice(nouns[index].id + 1, noun.id);
    return between.some(isListSeparator) && !hasFinitePredicate(between);
  });

const hasNominalBurden = (tokens: ParsedToken[]) => {
  const nominalizations = tokens.filter(isActionNoun);
  const distinct = new Set(
    nominalizations.map(({ lemma, form }) => lemma ?? form),
  );
  return (
    distinct.size >= 2 &&
    !isNominalList(nominalizations, tokens) &&
    nominalizations.some((noun) => hasPrepositionalComplement(noun, tokens))
  );
};

const optionsOf = (config: Config): Required<LexicalDensityOptions> => {
  const given = config[ErrorId.NO_HIGH_LEXICAL_DENSITY];
  const chosen: LexicalDensityOptions = typeof given === "object" ? given : {};
  return {
    nounPercentage: chosen.nounPercentage ?? defaultOptions.nounPercentage,
    adjectivePercentage:
      chosen.adjectivePercentage ?? defaultOptions.adjectivePercentage,
    nounAndAdjectivePercentage:
      chosen.nounAndAdjectivePercentage ??
      defaultOptions.nounAndAdjectivePercentage,
    minimumWords: chosen.minimumWords ?? defaultOptions.minimumWords,
  };
};

type Measure = { share: number; limit: number };

const measuresOf = (
  tokens: ParsedToken[],
  options: Required<LexicalDensityOptions>,
): Measure[] => {
  const words = tokens.filter(isWord);
  const nouns = words.filter(isPlainNoun).length;
  const adjectives = words.filter(isPlainAdjective).length;
  const share = (count: number) => (count / words.length) * 100;
  return [
    { share: share(nouns), limit: options.nounPercentage },
    { share: share(adjectives), limit: options.adjectivePercentage },
    {
      share: share(nouns + adjectives),
      limit: options.nounAndAdjectivePercentage,
    },
  ];
};

const buildError = (tokens: ParsedToken[]): LintError => {
  const words = tokens.filter(isWord);
  const last = words[words.length - 1];
  return {
    start: tokens[0].misc.at,
    end: last.misc.at + last.form.length,
    message: `Several nouns in this sentence may hide actions. Try expressing those actions as verbs, and split the sentence if it carries several ideas.`,
    id: ErrorId.NO_HIGH_LEXICAL_DENSITY,
  };
};

const applyRule = (
  tokens: ParsedToken[],
  options: Required<LexicalDensityOptions>,
) => {
  const words = tokens.filter(isWord);
  if (
    words.length < Math.max(options.minimumWords, 1) ||
    !hasFinitePredicate(tokens) ||
    !hasNominalBurden(tokens)
  ) {
    return [];
  }

  const over = measuresOf(tokens, options).filter(
    ({ share, limit }) => share > limit,
  );
  return over.length === 0 ? [] : [buildError(tokens)];
};

export default (sentences: ParsedToken[][], config: Config) => {
  const options = optionsOf(config);
  return sentences.reduce(
    (errors: LintError[], tokens) => [...errors, ...applyRule(tokens, options)],
    [],
  );
};

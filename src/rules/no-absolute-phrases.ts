import parseToSubtree from "../parse-to-subtree.js";
import { ErrorId, type LintError, type ParsedToken } from "../types/index.js";

const isFloatingParticiple = ({ feats: { VerbForm } }: ParsedToken) =>
  VerbForm === "Part";

const isComma = ({ feats: { PunctType } }: ParsedToken) => PunctType === "Comm";

const isStructuralBoundary = ({ form, feats }: ParsedToken) =>
  ["Colo", "Semi", "Brck"].includes(feats.PunctType ?? "") ||
  /^[—–]$/u.test(form);

const reportingVerbs = [
  "say",
  "ask",
  "reply",
  "answer",
  "whisper",
  "mutter",
  "murmur",
  "add",
  "continue",
  "explain",
  "remark",
  "note",
  "shout",
  "call",
  "cry",
  "sigh",
  "think",
  "muse",
  "wonder",
  "announce",
  "declare",
  "insist",
  "admit",
  "confess",
  "offer",
  "interrupt",
  "snap",
  "laugh",
  "repeat",
  "recall",
  "report",
];

const isReportingClause = ({ lemma, form }: ParsedToken) =>
  reportingVerbs.includes(lemma ?? form.toLowerCase());

const isBareSubject = (entities: ParsedToken[], subject: ParsedToken) =>
  parseToSubtree(entities, subject.id).every(
    (id) => entities[id].xpos !== "VERB" && !isComma(entities[id]),
  );

const hasOwnSubject = (entities: ParsedToken[], participle: ParsedToken) =>
  participle.misc.children.some(
    (child) =>
      entities[child].xpos === "NOUN" &&
      entities[child].feats.PronType == null &&
      child < participle.id &&
      isBareSubject(entities, entities[child]),
  );

const coordinators = ["and", "but", "or", "nor", "so", "yet"];

const isCoordinator = ({ lemma, form }: ParsedToken) =>
  coordinators.includes(lemma ?? form.toLowerCase());

const hasLeadingSubordinator = (
  entities: ParsedToken[],
  participle: ParsedToken,
) =>
  participle.misc.children.some((child) => {
    const marker = entities[child];
    return (
      marker.xpos === "MARK" &&
      child < participle.id &&
      marker.misc.children.length === 0
    );
  });

const introducesCoordinatedClause = (
  entities: ParsedToken[],
  participle: ParsedToken,
) =>
  participle.misc.children.some((child) => {
    const marker = entities[child];
    if (marker.xpos !== "MARK" || !isCoordinator(marker)) {
      return false;
    }

    return marker.misc.children.some((grandchild) => {
      const conjunct = entities[grandchild];
      return (
        conjunct.xpos === "VERB" &&
        conjunct.misc.children.some(
          (id) =>
            entities[id].xpos === "NOUN" &&
            entities[id].feats.PronType !== "Rel" &&
            id < conjunct.id,
        )
      );
    });
  });

const countBetween = (
  entities: ParsedToken[],
  from: number,
  to: number,
  matches: (token: ParsedToken) => boolean,
) => {
  const [start, end] = from < to ? [from, to] : [to, from];
  let count = 0;
  for (let index = start + 1; index <= end; index += 1) {
    if (matches(entities[index])) {
      count += 1;
    }
  }

  return count;
};

const isEdgeOfClause = (
  entities: ParsedToken[],
  root: ParsedToken,
  participle: ParsedToken,
  subtree: number[],
) => {
  const isRightFloating = participle.id > root.id;
  const outerBound = isRightFloating
    ? Math.max(...subtree)
    : Math.min(...subtree);
  return !root.misc.children.some((child) => {
    if (child === participle.id) {
      return false;
    }

    const { id, xpos } = entities[child];
    return (
      (isRightFloating ? id > outerBound : id < outerBound) &&
      !["PUNCT", "ADV"].includes(xpos)
    );
  });
};

const isQuoted = (entities: ParsedToken[], subtree: number[]) =>
  entities[Math.min(...subtree)].feats.PunctType === "Quot" &&
  entities[Math.max(...subtree)].feats.PunctType === "Quot";

const hasParticipleSiblingCloserToRoot = (
  entities: ParsedToken[],
  root: ParsedToken,
  participle: ParsedToken,
) =>
  root.misc.children.some((child) => {
    const sibling = entities[child];
    const isBetweenRootAndParticiple =
      participle.id > root.id
        ? sibling.id > root.id && sibling.id < participle.id
        : sibling.id < root.id && sibling.id > participle.id;
    return isBetweenRootAndParticiple && isFloatingParticiple(sibling);
  });

const isAdjacentToComma = (
  entities: ParsedToken[],
  boundary: number,
  isRightFloating: boolean,
) => {
  if (isComma(entities[boundary])) {
    return true;
  }

  const outside = isRightFloating ? boundary - 1 : boundary + 1;
  return entities[outside] != null && isComma(entities[outside]);
};

const isAbsoluteInForm = (
  entities: ParsedToken[],
  participle: ParsedToken,
  subtree: number[],
  isRightFloating: boolean,
) =>
  hasOwnSubject(entities, participle) &&
  !hasLeadingSubordinator(entities, participle) &&
  !introducesCoordinatedClause(entities, participle) &&
  !isQuoted(entities, subtree) &&
  !(isRightFloating && isReportingClause(participle));

type Placement = {
  entities: ParsedToken[];
  root: ParsedToken;
  participle: ParsedToken;
  subtree: number[];
  boundary: number;
  isRightFloating: boolean;
};

const sitsAtAClauseEdge = ({
  entities,
  root,
  participle,
  subtree,
  boundary,
  isRightFloating,
}: Placement) =>
  isAdjacentToComma(entities, boundary, isRightFloating) &&
  countBetween(entities, root.id, boundary, isComma) % 2 === 1 &&
  countBetween(entities, root.id, boundary, isCoordinator) === 0 &&
  countBetween(entities, root.id, participle.id, isStructuralBoundary) === 0 &&
  isEdgeOfClause(entities, root, participle, subtree) &&
  !hasParticipleSiblingCloserToRoot(entities, root, participle);

const findFloatingParticiples = (entities: ParsedToken[], root: ParsedToken) =>
  root.misc.children
    .map((child) => entities[child])
    .filter(isFloatingParticiple)
    .filter((participle) => {
      const subtree = parseToSubtree(entities, participle.id);
      const isRightFloating = participle.id > root.id;
      const boundary = isRightFloating
        ? Math.min(...subtree)
        : Math.max(...subtree);
      return (
        isAbsoluteInForm(entities, participle, subtree, isRightFloating) &&
        sitsAtAClauseEdge({
          entities,
          root,
          participle,
          subtree,
          boundary,
          isRightFloating,
        })
      );
    });

const buildError = (entities: ParsedToken[], participle: ParsedToken) => {
  const subtree = parseToSubtree(entities, participle.id);
  const leftMostChild = Math.min(...subtree);
  const rightMostChild = Math.max(...subtree);
  const {
    form: lastWord,
    misc: { at: endOffset },
  } = entities[rightMostChild];
  return {
    start: entities[leftMostChild].misc.at,
    end: endOffset + lastWord.length,
    message: `Rewrite absolute phrases by joining them with a conjunction, or by separating the two clauses into their own sentences. Example: "We scrambled along the shore, the waves splashing at our feet" should be rewritten as "The waves splashed at our feet as we scrambled along the shore."`,
    id: ErrorId.NO_ABSOLUTE_PHRASES,
  };
};

const applyRule = (entities: ParsedToken[]) => {
  const root = entities.find(({ head }) => head === -1);
  if (!root || root.xpos !== "VERB" || isFloatingParticiple(root)) {
    return [];
  }

  return findFloatingParticiples(entities, root).map((participle) =>
    buildError(entities, participle),
  );
};

export default (sentences: ParsedToken[][]) =>
  sentences.reduce(
    (errors: LintError[], entities) => [...errors, ...applyRule(entities)],
    [],
  );

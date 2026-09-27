import { ErrorId, type LintError, type ParsedToken } from "../types/index.js";

const isLexicalNoun = ({ xpos, form, feats }: ParsedToken) =>
  xpos === "NOUN" &&
  !feats.PronType &&
  /\p{L}/u.test(form) &&
  !/\d/u.test(form);

const contiguousNounModifiers = (entities: ParsedToken[], id: number) => {
  let start = id;
  while (
    start > 0 &&
    entities[start - 1].head === id &&
    isLexicalNoun(entities[start - 1])
  ) {
    start -= 1;
  }

  return entities.slice(start, id);
};

const applyRule = (entities: ParsedToken[]) =>
  entities.reduce((clusters: LintError[], token) => {
    const {
      form,
      id,
      misc: { at },
    } = token;
    const leftNounChildren = contiguousNounModifiers(entities, id);
    if (isLexicalNoun(token) && leftNounChildren.length > 2) {
      const [leftMostChild] = leftNounChildren;
      const {
        misc: { at: start },
      } = leftMostChild;
      return clusters.concat({
        start,
        end: at + form.length,
        message: `Rewrite long noun clusters with either a shorter name or using hyphens (-) between words that are used as a single unit`,
        id: ErrorId.NO_NOUN_CLUSTERS,
      });
    }

    return clusters;
  }, []);

export default (sentences: ParsedToken[][]) =>
  sentences.reduce(
    (errors: LintError[], entities) => [...errors, ...applyRule(entities)],
    [],
  );

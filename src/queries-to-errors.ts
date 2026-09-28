import inflect from "@textoic/artisan/inflect";
import compileQueries, { candidates } from "./compile-queries.js";
import queryParse from "./query-parse.js";
import repair from "./repair-suggestion.js";
import type {
  CompiledQueries,
  ParsedToken,
  LintError,
  Query,
} from "./types/index.js";

const contractionRegExp = /['’`´]/iu;

const compiled = new WeakMap<Query[], CompiledQueries>();

const compile = (queries: Query[]) => {
  const cached = compiled.get(queries);
  if (cached) {
    return cached;
  }

  const compilation = compileQueries(queries);
  compiled.set(queries, compilation);
  return compilation;
};

const caseOf = ({ case: key }: Query) => (key == null ? {} : { case: key });

const withInflections = (
  tokens: ParsedToken[],
  tree: number[],
  suggestion: string,
) =>
  suggestion.replace(
    /:inflect\((\w+)\)/giu,
    (_match: string, lemma: string) =>
      inflect({ ...tokens[tree[0]], lemma }) ?? "",
  );

export default (queries: Query[], sentences: ParsedToken[][]) => {
  const compilation = compile(queries);
  const errors: LintError[] = [];
  sentences.forEach((tokens) => {
    const queryIndices = candidates(compilation, tokens);
    if (queryIndices.length === 0) {
      return;
    }

    queryParse(
      tokens,
      queryIndices.map((queryIndex) => compilation.parsed[queryIndex]),
    ).forEach(({ selectorIndex, tree }) => {
      const {
        misc: { at: start },
      } = tokens[Math.min(...tree)];
      const {
        misc: { at: endPosition },
        form: endWord,
      } = tokens[Math.max(...tree)];
      const query = queries[queryIndices[selectorIndex]];
      const { message, id, suggestions } = query;
      const { form } = tokens[tree[0]];
      const end = endPosition + endWord.length;
      errors.push({
        id,
        start,
        end,
        message,
        ...caseOf(query),
        ...(suggestions
          ? {
              suggestions: suggestions.map((suggestion) =>
                repair({
                  tokens,
                  tree,
                  range: [start, end],
                  text: `${
                    contractionRegExp.test(form) ? " " : ""
                  }${withInflections(tokens, tree, suggestion)}`,
                }),
              ),
            }
          : {}),
      });
    });
  });
  return errors;
};

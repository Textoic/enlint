import * as cssWhat from "css-what";
import type { CompiledQueries, ParsedToken, Query } from "./types/index.js";

const INDEXED_ATTRIBUTES = new Set(["form", "lemma"]);

const DISJUNCTIONS = new Set(["matches", "is", "where"]);

const key = (name: string, value: string) => `${name}:${value.toLowerCase()}`;

const isDisjunction = (
  token: cssWhat.Selector,
): token is cssWhat.PseudoSelector & { data: cssWhat.Selector[][] } =>
  token.type === cssWhat.SelectorType.Pseudo &&
  DISJUNCTIONS.has(token.name) &&
  Array.isArray(token.data) &&
  token.data.length > 0 &&
  typeof token.data[0] !== "string";

const chainLiterals = (chain: cssWhat.Selector[]): Set<string>[] => {
  let alternatives: Set<string>[] = [new Set()];
  chain.forEach((token) => {
    if (token.type === cssWhat.SelectorType.Attribute) {
      if (
        token.action === cssWhat.AttributeAction.Equals &&
        INDEXED_ATTRIBUTES.has(token.name)
      ) {
        alternatives.forEach((alternative) =>
          alternative.add(key(token.name, token.value)),
        );
      }
    } else if (isDisjunction(token)) {
      const branches = token.data.flatMap(chainLiterals);
      if (branches.some((branch) => branch.size === 0)) {
        return;
      }

      alternatives = alternatives.flatMap((alternative) =>
        branches.map((branch) => new Set([...alternative, ...branch])),
      );
    }
  });
  return alternatives;
};

export const requiredLiterals = (parsed: cssWhat.Selector[][]): string[][] =>
  parsed.flatMap(chainLiterals).map((alternative) => [...alternative]);

const withoutAttributeName = (literal: string) =>
  literal.slice(literal.indexOf(":") + 1);

export const requiredWordSets = (parsed: cssWhat.Selector[][]): Set<string>[] =>
  requiredLiterals(parsed).map(
    (alternative) => new Set(alternative.map(withoutAttributeName)),
  );

export const mentionedWords = (parsed: cssWhat.Selector[][]): Set<string> => {
  const words = new Set<string>();
  const walk = (selectors: cssWhat.Selector[][]) =>
    selectors.forEach((chain) =>
      chain.forEach((token) => {
        if (
          token.type === cssWhat.SelectorType.Attribute &&
          INDEXED_ATTRIBUTES.has(token.name) &&
          token.value
        ) {
          words.add(token.value.toLowerCase());
        } else if (
          token.type === cssWhat.SelectorType.Pseudo &&
          Array.isArray(token.data) &&
          token.data.length > 0 &&
          typeof token.data[0] !== "string"
        ) {
          walk(token.data as cssWhat.Selector[][]);
        }
      }),
    );
  walk(parsed);
  return words;
};

export const sentenceLiterals = (tokens: ParsedToken[]) => {
  const present = new Set<string>();
  tokens.forEach(({ form, lemma }) => {
    if (form) {
      present.add(key("form", form));
    }

    if (lemma) {
      present.add(key("lemma", lemma));
    }
  });
  return present;
};

export default (queries: Query[]): CompiledQueries => {
  const parsed = queries.map(({ selector }) => cssWhat.parse(selector));
  const required = parsed.map(requiredLiterals);
  const index = new Map<string, number[]>();
  const always: number[] = [];
  required.forEach((alternatives, queryIndex) => {
    if (alternatives.some((alternative) => alternative.length === 0)) {
      always.push(queryIndex);
      return;
    }

    new Set(alternatives.map(([literal]) => literal)).forEach((literal) => {
      const bucket = index.get(literal);
      if (bucket) {
        bucket.push(queryIndex);
      } else {
        index.set(literal, [queryIndex]);
      }
    });
  });
  return { queries, parsed, required, index, always };
};

export const candidates = (
  { required, index, always }: CompiledQueries,
  tokens: ParsedToken[],
) => {
  const present = sentenceLiterals(tokens);
  const possible = new Set(always);
  present.forEach((literal) =>
    index.get(literal)?.forEach((queryIndex) => possible.add(queryIndex)),
  );
  return [...possible]
    .filter((queryIndex) =>
      required[queryIndex].some((alternative) =>
        alternative.every((literal) => present.has(literal)),
      ),
    )
    .sort((a, b) => a - b);
};

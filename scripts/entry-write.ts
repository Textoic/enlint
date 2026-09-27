import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import { entries, lookupKey } from "../src/rules/no-bad-words.js";
import type { Draft, Example } from "./entry-verify.js";

const source = fileURLToPath(
  new URL("../src/rules/no-bad-words.ts", import.meta.url),
);
const fixture = fileURLToPath(
  new URL("../test/fixtures/no-bad-words-examples.json", import.meta.url),
);

const ARRAY_OPENS = "export const entries: BadWordEntry[] = [";

type Member = {
  text: string;
  phrase?: string;
  keys: string[];
};

const endOfString = (body: string, from: number) => {
  const quote = body[from];
  let index = from + 1;
  while (index < body.length && body[index] !== quote) {
    index += body[index] === "\\" ? 2 : 1;
  }

  return index;
};

const endOfLineComment = (body: string, from: number) => {
  let index = from;
  while (index < body.length && body[index] !== "\n") {
    index += 1;
  }

  return index;
};

const skipPast = (body: string, index: number) => {
  const char = body[index];
  if (char === '"' || char === "'" || char === "`") {
    return endOfString(body, index);
  }

  if (char === "/" && body[index + 1] === "/") {
    return endOfLineComment(body, index);
  }

  return char === "/" && body[index + 1] === "*"
    ? body.indexOf("*/", index + 2) + 1
    : null;
};

const OPENING_BRACKETS = "{[(";
const CLOSING_BRACKETS = "}])";

const depthChange = (char: string) => {
  if (OPENING_BRACKETS.includes(char)) {
    return 1;
  }

  return CLOSING_BRACKETS.includes(char) ? -1 : 0;
};

const split = (body: string): string[] => {
  const chunks: string[] = [];
  let depth = 0;
  let start = 0;
  let index = 0;
  while (index < body.length) {
    const skipped = skipPast(body, index);
    if (skipped == null) {
      const char = body[index];
      depth += depthChange(char);
      if (char === "," && depth === 0) {
        chunks.push(body.slice(start, index));
        start = index + 1;
      }

      index += 1;
    } else {
      index = skipped + 1;
    }
  }

  const tail = body.slice(start);
  if (tail.trim()) {
    chunks.push(tail);
  }

  return chunks;
};

const phraseOf = (text: string) => {
  const match =
    /^\s*(?:\/\/[^\n]*\n\s*)*\{\s*phrase:\s*("(?:[^"\\]|\\.)*")/u.exec(text);
  return match ? (JSON.parse(match[1]) as string) : undefined;
};

const align = (chunks: string[]): Member[] => {
  const members: Member[] = [];
  let cursor = 0;
  chunks.forEach((text, index) => {
    const phrase = phraseOf(text);
    if (phrase != null) {
      if (entries[cursor]?.phrase !== phrase) {
        throw new Error(
          `src/rules/no-bad-words.ts does not line up with its exports: member ${index} is "${phrase}" but entry ${cursor} is "${entries[cursor]?.phrase}". Not touching the file.`,
        );
      }

      members.push({ text, phrase, keys: [lookupKey(phrase)] });
      cursor += 1;
      return;
    }

    const next = chunks
      .slice(index + 1)
      .map(phraseOf)
      .find((found) => found != null);
    const keys: string[] = [];
    while (cursor < entries.length && entries[cursor].phrase !== next) {
      keys.push(lookupKey(entries[cursor].phrase));
      cursor += 1;
    }

    members.push({ text, keys });
  });

  if (cursor !== entries.length) {
    throw new Error(
      `src/rules/no-bad-words.ts does not line up with its exports: matched ${cursor} of ${entries.length} entries. Not touching the file.`,
    );
  }

  return members;
};

const quote = (text: string) => JSON.stringify(text);

const serialize = ({
  phrase,
  category,
  selector,
  suggestions,
  message,
}: Draft) =>
  [
    "\n  {",
    `    phrase: ${quote(phrase)},`,
    `    category: ${quote(category)},`,
    `    selector: ${quote(selector)},`,
    suggestions
      ? `    suggestions: [${suggestions.map(quote).join(", ")}],`
      : `    message: ${quote(message ?? "")},`,
    "    automated: true,",
    "  }",
  ].join("\n");

export type WriteResult = {
  added: string[];
  removed: string[];
  skipped: { phrase: string; reason: string }[];
};

export const readFixture = async (): Promise<Record<string, Example[]>> => {
  try {
    return JSON.parse(await readFile(fixture, "utf8")) as Record<
      string,
      Example[]
    >;
  } catch {
    return {};
  }
};

export const writeFixture = async (examples: Record<string, Example[]>) => {
  await mkdir(fileURLToPath(new URL("../test/fixtures/", import.meta.url)), {
    recursive: true,
  });
  await writeFile(
    fixture,
    `${JSON.stringify(
      Object.fromEntries(
        Object.entries(examples).sort(([a], [b]) => a.localeCompare(b, "en")),
      ),
      null,
      2,
    )}\n`,
    "utf8",
  );
};

type Drafted = { entry: Draft; subsumes: string[] };

const locateEntriesArray = (text: string) => {
  const opens = text.indexOf(ARRAY_OPENS);
  if (opens === -1) {
    throw new Error(
      `Could not find \`${ARRAY_OPENS}\` in src/rules/no-bad-words.ts. Not touching the file.`,
    );
  }

  const bodyStart = opens + ARRAY_OPENS.length;
  const bodyEnd = text.indexOf("\n];", bodyStart);
  if (bodyEnd === -1) {
    throw new Error(
      "Could not find the end of the entries array in src/rules/no-bad-words.ts. Not touching the file.",
    );
  }

  return { bodyStart, bodyEnd };
};

const withoutSubsumed = (
  members: Member[],
  drafts: Drafted[],
  result: WriteResult,
) => {
  const subsumed = new Set(drafts.flatMap(({ subsumes }) => subsumes));
  const known = new Set(entries.map(({ phrase }) => phrase));
  subsumed.forEach((phrase) => {
    if (!known.has(phrase)) {
      result.skipped.push({
        phrase,
        reason: `claimed to subsume "${phrase}", which is not on the list`,
      });
    }
  });

  return members.filter(({ phrase }) => {
    if (phrase == null || !subsumed.has(phrase)) {
      return true;
    }

    result.removed.push(phrase);
    return false;
  });
};

const generatedBlockAround = (members: Member[], key: string) =>
  members.find(
    ({ phrase, keys }) =>
      phrase == null &&
      keys.length > 0 &&
      key > keys[0] &&
      key < keys[keys.length - 1],
  );

const insertDrafts = (
  members: Member[],
  drafts: Drafted[],
  result: WriteResult,
) => {
  drafts.forEach(({ entry }) => {
    const key = lookupKey(entry.phrase);
    const inside = generatedBlockAround(members, key);
    if (inside) {
      result.skipped.push({
        phrase: entry.phrase,
        reason: `sorts inside the generated copula(...) block (between "${inside.keys[0]}" and "${inside.keys[inside.keys.length - 1]}"). Add it there as a row by hand.`,
      });
      return;
    }

    const at = members.findIndex(({ keys }) =>
      keys.some((existing) => existing.localeCompare(key, "en") > 0),
    );
    members.splice(at === -1 ? members.length : at, 0, {
      text: serialize(entry),
      phrase: entry.phrase,
      keys: [key],
    });
    result.added.push(entry.phrase);
  });
};

export default async function write(drafts: Drafted[]): Promise<WriteResult> {
  const text = await readFile(source, "utf8");
  const { bodyStart, bodyEnd } = locateEntriesArray(text);
  const result: WriteResult = { added: [], removed: [], skipped: [] };
  const members = withoutSubsumed(
    align(split(text.slice(bodyStart, bodyEnd))),
    drafts,
    result,
  );
  insertDrafts(members, drafts, result);

  const spliced = `${text.slice(0, bodyStart)}${members
    .map(({ text }) => text)
    .join(",")},\n${text.slice(bodyEnd + 1)}`;

  await writeFile(
    source,
    await prettier.format(spliced, {
      ...(await prettier.resolveConfig(source)),
      filepath: source,
    }),
    "utf8",
  );

  const examples = await readFixture();
  result.removed.forEach((phrase) => delete examples[phrase]);
  drafts
    .filter(({ entry }) => result.added.includes(entry.phrase))
    .forEach(({ entry }) => {
      examples[entry.phrase] = entry.examples;
    });
  await writeFixture(examples);

  return result;
}

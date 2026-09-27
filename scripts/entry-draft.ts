import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ask, { type JsonSchema, type Message } from "./ollama.js";
import verify, {
  report,
  type Draft,
  type Verification,
} from "./entry-verify.js";
import { describe, summarize, type Triage } from "./entry-triage.js";
import { entries, type BadWordCategory } from "../src/rules/no-bad-words.js";

const guidelines = await readFile(
  fileURLToPath(new URL("../docs/adding-entries.md", import.meta.url)),
  "utf8",
);

const EXEMPLARS = [
  "an unwavering commitment",
  "walk slowly",
  "utilize / utilise / put to use",
  "shed light on",
  "delve into",
  "need a robust",
  "an enduring legacy",
  "the fact that",
];

const exemplars = EXEMPLARS.map((phrase) =>
  entries.find((entry) => entry.phrase === phrase),
)
  .filter((entry) => entry != null)
  .map((entry) => describe(entry))
  .join("\n");

const categories: BadWordCategory[] = [
  "ai",
  "cliche",
  "empty",
  "explained-verb",
  "formalism",
  "hedge",
  "opinion",
  "redundancy",
  "variation",
];

const schema: JsonSchema = {
  type: "object",
  properties: {
    phrase: { type: "string" },
    category: { type: "string", enum: categories },
    selector: { type: "string" },
    fix: { type: "string", enum: ["suggestions", "message"] },
    suggestions: { type: "array", items: { type: "string" } },
    message: { type: "string" },
    subsumes: { type: "array", items: { type: "string" } },
    examples: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        properties: { text: { type: "string" }, fixed: { type: "string" } },
        required: ["text", "fixed"],
      },
    },
  },
  required: [
    "phrase",
    "category",
    "selector",
    "fix",
    "suggestions",
    "message",
    "subsumes",
    "examples",
  ],
};

type Response = {
  phrase: string;
  category: BadWordCategory;
  selector: string;
  fix: "suggestions" | "message";
  suggestions: string[];
  message: string;
  subsumes: string[];
  examples: { text: string; fixed: string }[];
};

export type Drafted = { entry: Draft; subsumes: string[] };

const toDraft = (response: Response): Drafted => ({
  entry: {
    phrase: response.phrase.trim(),
    category: response.category,
    selector: response.selector.trim(),
    ...(response.fix === "suggestions"
      ? { suggestions: response.suggestions.map((s) => s.trim()) }
      : { message: response.message.trim() }),
    automated: true,
    examples: response.examples.map(({ text, fixed }) => ({
      text: text.trim(),
      fixed: fixed.trim(),
    })),
  },
  subsumes: response.subsumes.map((phrase) => phrase.trim()).filter(Boolean),
});

const task = ({ phrase, verdict, related }: Triage) => {
  const context =
    related.length > 0
      ? `\nEntries already on the list that name one of its words:\n\n${related
          .slice(0, 12)
          .map((entry) => describe(entry))
          .join("\n")}\n`
      : "\nNothing on the list names any of its words.\n";

  if (verdict.case === "widen") {
    const many = verdict.entries.length !== 1;
    return `Write one entry for "${phrase}".

It is broader than ${verdict.entries.length} ${
      many ? "entries" : "entry"
    } already on the list, so your entry will fire wherever ${
      many ? "those do" : "that one does"
    }. For each of them, decide whether it still earns its place next to yours: keep it only if it exists to swallow a preposition or modifier so its replacement stays grammatical (span), or if it gives specific advice yours cannot (advice). List the phrases of the ones your entry makes redundant in "subsumes", exactly as they are spelled above, and leave the rest out.
${context}`;
  }

  if (verdict.case === "abstract") {
    return `Write one entry that replaces ${verdict.entries.length} existing entries.

They all turn on "${verdict.word}", and "${phrase}" would be another. That is the point at which the pile should become a single rule about the shared word rather than one rule per wording. Write that rule: it should fire on all of them and on "${phrase}", and its advice has to make sense for every one. List the phrases it replaces in "subsumes", exactly as they are spelled above.
${context}`;
  }

  return `Write one entry for "${phrase}". Nothing on the list covers it.

Leave "subsumes" empty.
${context}`;
};

const system = `You write entries for no-bad-words, a linter rule that flags words and expressions in English prose. You are given the complete guidelines for writing one. Follow them exactly; they describe a real system with real constraints, and an entry that ignores them silently matches nothing.

${guidelines}

Entries already on the list, chosen to show one technique each:

${exemplars}`;

export type Attempt = {
  drafted: Drafted;
  verification: Verification;
};

export type Result = {
  triage: Triage;
  attempts: Attempt[];
  accepted?: Drafted;
};

const temperatureFor = (attempt: number) => Math.min(0.6, attempt * 0.25);

export default async function draft(
  triage: Triage,
  { attempts: budget = 3 }: { attempts?: number } = {},
): Promise<Result> {
  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: task(triage) },
  ];
  const attempts: Attempt[] = [];

  for (let attempt = 0; attempt < budget; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const response = await ask<Response>(messages, schema, {
      temperature: temperatureFor(attempt),
    });
    const drafted = toDraft(response);
    const verification = verify(drafted.entry);
    attempts.push({ drafted, verification });
    if (verification.ok) {
      return { triage, attempts, accepted: drafted };
    }

    messages.push(
      { role: "assistant", content: JSON.stringify(response) },
      {
        role: "user",
        content: `That entry was run against the artisan parser and it failed:

${report(verification)}

Fix it and return the whole entry again. Keep what worked. If the selector matched but the span was wrong, remember that the span runs from the leftmost matched token to the rightmost and swallows every word in between, so either bring the missing word into the selector or switch to a message. If it did not match at all, the tree shape is not what you assumed: try anchoring on a different word, matching by form instead of lemma, or a descendant combinator instead of a child.`,
      },
    );
  }

  return { triage, attempts };
}

export const heading = (triage: Triage) =>
  `${triage.phrase} — ${triage.verdict.case}: ${summarize(triage)}`;

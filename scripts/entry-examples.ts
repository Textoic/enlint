import ask, { type JsonSchema, type Message } from "./ollama.js";
import {
  applySuggestion,
  introducedArtifacts,
  run,
  verifyExamples,
  type Example,
} from "./entry-verify.js";
import {
  categoryMessages,
  type BadWordEntry,
} from "../src/rules/no-bad-words.js";

const schema = (count: number): JsonSchema => ({
  type: "object",
  properties: {
    examples: {
      type: "array",
      minItems: count,
      items: {
        type: "object",
        properties: { text: { type: "string" }, fixed: { type: "string" } },
        required: ["text", "fixed"],
      },
    },
  },
  required: ["examples"],
});

type Response = { examples: { text: string; fixed: string }[] };

const fixOf = ({ suggestions, message, category }: BadWordEntry) => {
  if (!suggestions) {
    return `Advice to the writer: ${message ?? categoryMessages[category]}`;
  }

  if (suggestions.every((suggestion) => suggestion === "")) {
    return "The linter deletes the phrase outright.";
  }

  return `The linter replaces the whole phrase with: ${suggestions
    .map((suggestion) => JSON.stringify(suggestion))
    .join(
      " or ",
    )}. ":inflect(word)" means the word is inflected to agree with the tense of what it replaces.`;
};

const system = `You write example sentences for an English style linter. You are given one expression the linter flags and what it does about it. You return realistic sentences that use the expression, and the same sentence with the fix applied.

Rules:
- Write prose somebody might actually publish. No placeholder names, no "lorem ipsum", no sentences about linting.
- Use the expression naturally and completely. If it is written with "/" between alternatives, pick one of them. If it carries a parenthetical like "(noun)", that tells you which sense to use; do not write the parenthetical.
- A leading "a", "an" or "the" on the expression is how it is written down, not a word to paste in on top of whatever the sentence already has. "a multifaceted nature" belongs in a sentence as "the multifaceted nature of the problem" or "its multifaceted nature", never as "The a multifaceted nature". The same goes for a possessive: write "her heart pounded", not "heart pounding one's".
- Vary the sentences. Different subject, different tense, and do not always put the expression at the start. Two sentences that differ only in their nouns are worth one sentence.
- Keep them short: one clause or two, under about twenty words.
- The "fixed" sentence is the original with the flagged expression dealt with, and nothing else changed. It must read as correct English and must not use the flagged expression again.`;

const task = (entry: BadWordEntry, count: number) =>
  `Expression: ${entry.phrase}
Category: ${entry.category}
${fixOf(entry)}

Write ${count} example${count === 1 ? "" : "s"}.`;

export type Generated = {
  entry: BadWordEntry;
  examples: Example[];
  rejected: { text: string; problem: string }[];
  disagreed: { text: string; expected: string; actual: string }[];
  flawed: { fixed: string; problem: string }[];
};

const collapse = (text: string) => text.replace(/\s+/gu, " ").trim();

type Sinks = {
  disagreed: Generated["disagreed"];
  flawed: Generated["flawed"];
};

const resolveFix = (
  entry: BadWordEntry,
  example: Example,
  { disagreed, flawed }: Sinks,
): Example => {
  if (!entry.suggestions) {
    return example;
  }

  const [error] = run(entry, example.text);
  const suggestions = error?.suggestions ?? [];
  if (suggestions.length === 0) {
    return example;
  }

  const all = suggestions.map((suggestion) =>
    collapse(
      applySuggestion(
        example.text,
        suggestion as { range: [number, number]; text: string },
      ),
    ),
  );
  const [applied] = all;

  if (
    !all.some(
      (candidate) => candidate.toLowerCase() === example.fixed.toLowerCase(),
    )
  ) {
    disagreed.push({
      text: example.text,
      expected: example.fixed,
      actual: applied,
    });
  }

  introducedArtifacts(example.text, applied).forEach((problem) =>
    flawed.push({ fixed: applied, problem }),
  );

  return { text: example.text, fixed: applied };
};

type Verified = ReturnType<typeof verifyExamples>;

const sortResults = (
  results: Verified,
  kept: Example[],
  rejected: Generated["rejected"],
) => {
  results.forEach(({ example, problems }) => {
    if (problems.length === 0) {
      if (!kept.some(({ text }) => text === example.text)) {
        kept.push(example);
      }

      return;
    }

    rejected.push({ text: example.text, problem: problems[0] });
  });
};

const retryMessages = (
  response: Response,
  results: Verified,
  entry: BadWordEntry,
  outstanding: number,
): Message[] => [
  { role: "assistant", content: JSON.stringify(response) },
  {
    role: "user",
    content: `${results
      .filter(({ problems }) => problems.length > 0)
      .map(
        ({ example, problems }) =>
          `- "${example.text}" was rejected: ${problems[0]}`,
      )
      .join("\n")}

Write ${outstanding} more example${outstanding === 1 ? "" : "s"}. Use the expression "${entry.phrase}" exactly and completely this time, in a plain sentence with ordinary word order.`,
  },
];

export default async function generate(
  entry: BadWordEntry,
  { count = 2, attempts = 3 }: { count?: number; attempts?: number } = {},
): Promise<Generated> {
  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: task(entry, count) },
  ];
  const kept: Example[] = [];
  const rejected: Generated["rejected"] = [];
  const disagreed: Generated["disagreed"] = [];
  const flawed: Generated["flawed"] = [];

  for (
    let attempt = 0;
    attempt < attempts && kept.length < count;
    attempt += 1
  ) {
    // eslint-disable-next-line no-await-in-loop
    const response = await ask<Response>(
      messages,
      schema(count - kept.length),
      {
        temperature: 0.4 + attempt * 0.2,
      },
    );

    const candidates = response.examples.map(({ text, fixed }) => ({
      text: collapse(text),
      fixed: collapse(fixed),
    }));

    const resolved = candidates.map((example) =>
      resolveFix(entry, example, { disagreed, flawed }),
    );

    const results = verifyExamples(entry, resolved);
    sortResults(results, kept, rejected);

    if (kept.length >= count) {
      break;
    }

    messages.push(
      ...retryMessages(response, results, entry, count - kept.length),
    );
  }

  const examples = kept.slice(0, count);
  return {
    entry,
    examples,
    rejected,
    disagreed,
    flawed: flawed.filter(({ fixed }) =>
      examples.some((example) => example.fixed === fixed),
    ),
  };
}

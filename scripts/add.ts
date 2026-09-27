import { readFile } from "node:fs/promises";
import draft, { heading, type Drafted } from "./entry-draft.js";
import triage, { describe } from "./entry-triage.js";
import { report } from "./entry-verify.js";
import write from "./entry-write.js";
import { modelName, unavailable } from "./ollama.js";

const usage = `Usage: npm run add "<phrase>"
       npm run add -- --file <path>       one phrase per line, # comments ignored

  --apply             write accepted entries into src/rules/no-bad-words.ts
  --attempts <n>      drafting rounds per phrase before giving up (default 3)
  --force             draft even for phrases an existing rule already covers

  OLLAMA_MODEL        model to run, default qwen3.8:27b
  OLLAMA_HOST         server to reach, default http://127.0.0.1:11434`;

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const value = (name: string) => {
  const at = argv.indexOf(`--${name}`);
  return at === -1 ? undefined : argv[at + 1];
};

const apply = flag("apply");
const force = flag("force");
const attempts = Number(value("attempts") ?? 3);
const file = value("file");

const taken = new Set(
  ["attempts", "file"].flatMap((name) => {
    const at = argv.indexOf(`--${name}`);
    return at === -1 ? [] : [at, at + 1];
  }),
);
const inline = argv.filter(
  (argument, index) => !argument.startsWith("--") && !taken.has(index),
);

const phrases = file
  ? (await readFile(file, "utf8"))
      .split("\n")
      .map((line) => line.replace(/#.*$/u, "").trim())
      .filter(Boolean)
  : inline;

if (phrases.length === 0) {
  console.error(usage);
  process.exit(1);
}

const triaged = phrases.map((phrase) => triage(phrase));

const covered = triaged.filter(
  ({ verdict }) => verdict.case === "covered" && !force,
);
const todo = triaged.filter((item) => !covered.includes(item));

covered.forEach((item) => {
  console.log(`\n${heading(item)}`);
  if (item.verdict.case === "covered") {
    item.verdict.entries.forEach((entry) => console.log(describe(entry)));
  }
});

if (todo.length === 0) {
  console.log(
    `\n${phrases.length} phrase${phrases.length === 1 ? "" : "s"}, all already covered. Nothing to add.`,
  );
  process.exit(0);
}

const problem = await unavailable();
if (problem) {
  console.error(`\n${problem}`);
  process.exit(1);
}

console.log(
  `\nDrafting ${todo.length} entr${todo.length === 1 ? "y" : "ies"} with ${modelName}.`,
);

const accepted: Drafted[] = [];
const failed: string[] = [];

for (const item of todo) {
  console.log(`\n${heading(item)}`);
  // eslint-disable-next-line no-await-in-loop
  const result = await draft(item, { attempts });
  result.attempts.forEach(({ drafted, verification }, round) => {
    const { entry } = drafted;
    console.log(
      `  attempt ${round + 1}: ${entry.selector}  ->  ${
        entry.suggestions
          ? entry.suggestions.map((s) => JSON.stringify(s)).join(", ")
          : JSON.stringify(entry.message)
      }`,
    );
    if (!verification.ok) {
      console.log(
        report(verification)
          .split("\n")
          .map((line) => `    ${line}`)
          .join("\n"),
      );
    }
  });

  if (result.accepted) {
    const { entry, subsumes } = result.accepted;
    accepted.push(result.accepted);
    console.log(`  accepted as [${entry.category}] ${entry.phrase}`);
    entry.examples.forEach(({ text, fixed }) =>
      console.log(`    "${text}"\n      -> "${fixed}"`),
    );
    if (subsumes.length > 0) {
      console.log(`  replaces: ${subsumes.join(", ")}`);
    }
  } else {
    failed.push(item.phrase);
    console.log(`  no draft passed verification after ${attempts} attempts`);
  }
}

console.log(
  `\n${accepted.length} accepted, ${failed.length} failed, ${covered.length} already covered.`,
);
if (failed.length > 0) {
  console.log(`Failed: ${failed.join(", ")}`);
}

if (!apply) {
  console.log(
    "\nDry run; nothing written. Pass --apply to write these entries.",
  );
  process.exit(0);
}

if (accepted.length === 0) {
  process.exit(1);
}

const written = await write(accepted);
console.log(
  `\nsrc/rules/no-bad-words.ts: +${written.added.length} -${written.removed.length}`,
);
if (written.removed.length > 0) {
  console.log(`  removed: ${written.removed.join(", ")}`);
}

written.skipped.forEach(({ phrase, reason }) =>
  console.log(`  skipped "${phrase}": ${reason}`),
);

console.log(
  "\nRun `npm test` and `npm run build-docs`. New entries are marked `automated: true` and owe a review.",
);

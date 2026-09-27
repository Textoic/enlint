import generate from "./entry-examples.js";
import {
  applySuggestion,
  introducedArtifacts,
  run,
  verifyExamples,
} from "./entry-verify.js";
import { readFixture, writeFixture } from "./entry-write.js";
import { modelName, unavailable } from "./ollama.js";
import { entries, type BadWordCategory } from "../src/rules/no-bad-words.js";

const usage = `Usage: npm run examples                       every entry with no examples yet
       npm run examples -- --automated        only entries marked automated: true
       npm run examples -- --category ai      only one category
       npm run examples -- --phrase "delve"   one entry, by exact phrase

  --count <n>      examples per entry (default 2)
  --attempts <n>   rounds per entry before giving up (default 3)
  --limit <n>      stop after n entries
  --force          regenerate entries that already have examples
  --dry-run        print what would be generated, write nothing
  --report         read the fixture and print the review queue; no inference
  --refresh        recompute the recorded fix of every replacement; no inference`;

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const value = (name: string) => {
  const at = argv.indexOf(`--${name}`);
  return at === -1 ? undefined : argv[at + 1];
};

if (flag("help")) {
  console.log(usage);
  process.exit(0);
}

const count = Number(value("count") ?? 2);
const attempts = Number(value("attempts") ?? 3);
const limit = Number(value("limit") ?? Infinity);
const force = flag("force");
const dryRun = flag("dry-run");
const category = value("category") as BadWordCategory | undefined;
const phrase = value("phrase");

const existing = await readFixture();

if (flag("report")) {
  const missing = entries.filter(({ phrase }) => !existing[phrase]);
  const broken = entries.flatMap((entry) =>
    (existing[entry.phrase] ?? [])
      .filter(() => entry.suggestions != null)
      .flatMap(({ text, fixed }) =>
        introducedArtifacts(text, fixed).map((problem) => ({
          phrase: entry.phrase,
          problem,
          fixed,
        })),
      ),
  );

  const affected = [...new Set(broken.map(({ phrase }) => phrase))];
  console.log(
    `${Object.keys(existing).length}/${entries.length} entries have examples, ${
      Object.values(existing).flat().length
    } in total.\n`,
  );

  if (affected.length > 0) {
    console.log(
      `${affected.length} entries produce broken text. The replacement is wrong, or its span is:\n`,
    );
    affected.forEach((phrase) => {
      const found = broken.filter((flaw) => flaw.phrase === phrase);
      const entry = entries.find((candidate) => candidate.phrase === phrase);
      console.log(`  ${phrase} — ${found[0].problem}`);
      console.log(
        `    ${entry?.suggestions?.map((s) => JSON.stringify(s)).join(", ")}`,
      );
      console.log(`    "${found[0].fixed}"`);
    });
  }

  if (missing.length > 0) {
    console.log(
      `\n${missing.length} entries have no examples. Either no run has reached them, or every sentence written to use them failed to match — which would mean the selector never fires. \`npm run examples\` settles which:\n`,
    );
    missing.forEach(({ phrase, selector }) =>
      console.log(`  ${phrase}\n    ${selector}`),
    );
  }

  process.exit(0);
}

if (flag("refresh")) {
  const fixture: Record<string, { text: string; fixed: string }[]> = {};
  const updated: { phrase: string; was: string; now: string }[] = [];
  const dropped: { phrase: string; text: string; problem: string }[] = [];

  entries.forEach((entry) => {
    const examples = existing[entry.phrase];
    if (!examples) {
      return;
    }

    const recomputed = examples.map((example) => {
      if (!entry.suggestions) {
        return example;
      }

      const [error] = run(entry, example.text);
      const [suggestion] = error?.suggestions ?? [];
      if (!suggestion) {
        return example;
      }

      const fixed = applySuggestion(
        example.text,
        suggestion as { range: [number, number]; text: string },
      )
        .replace(/\s+/gu, " ")
        .trim();
      if (fixed !== example.fixed) {
        updated.push({ phrase: entry.phrase, was: example.fixed, now: fixed });
      }

      return { text: example.text, fixed };
    });

    const kept = verifyExamples(entry, recomputed).filter(
      ({ example, problems }) => {
        if (problems.length === 0) {
          return true;
        }

        dropped.push({
          phrase: entry.phrase,
          text: example.text,
          problem: problems[0],
        });
        return false;
      },
    );

    if (kept.length > 0) {
      fixture[entry.phrase] = kept.map(({ example }) => example);
    }
  });

  if (updated.length === 0 && dropped.length === 0) {
    console.log("The fixture already agrees with what the rules produce.");
    process.exit(0);
  }

  if (updated.length > 0) {
    console.log(`${updated.length} recorded fixes recomputed:\n`);
    updated.forEach(({ phrase, was, now }) =>
      console.log(`  ${phrase}\n    was: "${was}"\n    now: "${now}"`),
    );
  }

  if (dropped.length > 0) {
    console.log(
      `\n${dropped.length} example${
        dropped.length === 1 ? "" : "s"
      } dropped, because they no longer hold. Run \`npm run examples\` to replace them:\n`,
    );
    dropped.forEach(({ phrase, text, problem }) =>
      console.log(`  ${phrase}\n    "${text}"\n    ${problem}`),
    );
  }

  if (!dryRun) {
    await writeFixture(fixture);
  }

  process.exit(0);
}

const selected = entries
  .filter((entry) => {
    if (phrase != null) {
      return entry.phrase === phrase;
    }

    if (category != null && entry.category !== category) {
      return false;
    }

    if (flag("automated") && !entry.automated) {
      return false;
    }

    if (force || !existing[entry.phrase]) {
      return true;
    }

    return verifyExamples(entry, existing[entry.phrase]).some(
      ({ problems }) => problems.length > 0,
    );
  })
  .sort((a, b) => Number(b.automated ?? false) - Number(a.automated ?? false))
  .slice(0, limit);

if (selected.length === 0) {
  console.log(
    phrase != null
      ? `No entry with the phrase "${phrase}".`
      : "Every selected entry already has examples. Pass --force to regenerate.",
  );
  process.exit(0);
}

const problem = await unavailable();
if (problem) {
  console.error(problem);
  process.exit(1);
}

console.log(
  `${selected.length} entr${selected.length === 1 ? "y" : "ies"}, ${count} example${
    count === 1 ? "" : "s"
  } each, with ${modelName}.\n`,
);

const fixture = { ...existing };
const unillustrated: { phrase: string; problem: string }[] = [];
const short: string[] = [];
const disagreements: { phrase: string; expected: string; actual: string }[] =
  [];
const flaws: { phrase: string; fixed: string; problem: string }[] = [];

for (const [index, entry] of selected.entries()) {
  // eslint-disable-next-line no-await-in-loop
  const { examples, rejected, disagreed, flawed } = await generate(entry, {
    count,
    attempts,
  });

  const position = `[${index + 1}/${selected.length}]`;
  if (examples.length === 0) {
    unillustrated.push({
      phrase: entry.phrase,
      problem: rejected[0]?.problem ?? "the model returned nothing usable",
    });
    console.log(`${position} ${entry.phrase} — NO EXAMPLE MATCHED`);
    console.log(`    ${entry.selector}`);
    rejected
      .slice(0, 2)
      .forEach(({ text, problem }) =>
        console.log(`    tried "${text}"\n      ${problem}`),
      );
  } else {
    if (examples.length < count) {
      short.push(entry.phrase);
    }

    console.log(
      `${position} ${entry.phrase} [${entry.category}]${
        entry.automated ? " (automated)" : ""
      }`,
    );
    examples.forEach(({ text, fixed }) =>
      console.log(`    "${text}"\n      -> "${fixed}"`),
    );
    disagreed.forEach(({ expected, actual }) => {
      disagreements.push({ phrase: entry.phrase, expected, actual });
      console.log(`    note: the rule produces "${actual}", not "${expected}"`);
    });
    flawed.forEach(({ fixed, problem }) => {
      flaws.push({ phrase: entry.phrase, fixed, problem });
      console.log(`    BROKEN: the replacement leaves ${problem}`);
    });

    fixture[entry.phrase] = examples;
    if (!dryRun) {
      // eslint-disable-next-line no-await-in-loop
      await writeFixture(fixture);
    }
  }
}

const illustrated = selected.length - unillustrated.length;
console.log(
  `\n${illustrated}/${selected.length} entries illustrated${
    dryRun ? " (dry run, nothing written)" : ""
  }.`,
);

if (short.length > 0) {
  console.log(
    `\nFewer than ${count} examples for ${short.length}: ${short.join(", ")}`,
  );
}

if (flaws.length > 0) {
  const affected = new Set(flaws.map(({ phrase }) => phrase));
  console.log(
    `\n${affected.size} entr${
      affected.size === 1 ? "y" : "ies"
    } produce broken text. The fixture records it, because it is what the linter really does:`,
  );
  [...affected].forEach((phrase) => {
    const [{ fixed, problem }] = flaws.filter((flaw) => flaw.phrase === phrase);
    console.log(`  ${phrase} — ${problem}\n    "${fixed}"`);
  });
}

if (disagreements.length > 0) {
  console.log(
    `\n${disagreements.length} replacement${
      disagreements.length === 1 ? "" : "s"
    } produced text no alternative the rule offers accounts for:`,
  );
  disagreements.forEach(({ phrase, expected, actual }) =>
    console.log(
      `  ${phrase}\n    rule:  "${actual}"\n    model: "${expected}"`,
    ),
  );
}

if (unillustrated.length > 0) {
  console.log(
    `\n${unillustrated.length} entr${
      unillustrated.length === 1 ? "y" : "ies"
    } could not be illustrated. A selector that will not fire on any sentence written for it is one that has probably never fired on anything:`,
  );
  unillustrated.forEach(({ phrase, problem }) =>
    console.log(`  ${phrase}\n    ${problem}`),
  );
}

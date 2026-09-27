import { byWord, containments, fixOf, wordsOf } from "./entry-index.js";
import type { BadWordEntry } from "../src/rules/no-bad-words.js";

const [, , ...argv] = process.argv;
if (argv.length === 0) {
  console.error("Usage: npm run lookup <word>");
  console.error(
    '       npm run lookup "a sense of"   (matches any word in it)',
  );
  process.exit(1);
}

const query = argv.join(" ").toLowerCase();
const queryWords = query.split(/\W+/u).filter(Boolean);

const related = (word: string) =>
  queryWords.some(
    (queryWord) =>
      word === queryWord ||
      (queryWord.length >= 4 &&
        word.length >= 4 &&
        (word.startsWith(queryWord) || queryWord.startsWith(word))),
  );

const exact = new Set(queryWords);
const matches = [...byWord]
  .filter(([word]) => related(word))
  .sort(
    ([a], [b]) =>
      Number(exact.has(b)) - Number(exact.has(a)) || a.localeCompare(b, "en"),
  );

if (matches.length === 0) {
  console.log(`Nothing on the list mentions "${query}". It is not covered.`);
  process.exit(0);
}

const broaderThan = containments().reduce((map, { broad, narrow }) => {
  const bucket = map.get(narrow);
  if (bucket) {
    bucket.push(broad);
  } else {
    map.set(narrow, [broad]);
  }

  return map;
}, new Map<BadWordEntry, BadWordEntry[]>());

const pad = (text: string, width: number) =>
  text.length >= width ? text : text + " ".repeat(width - text.length);

const phraseWidth = Math.min(
  44,
  Math.max(
    ...matches.flatMap(([, found]) => found.map(({ phrase }) => phrase.length)),
  ),
);

matches.forEach(([word, found]) => {
  const heading = exact.has(word) ? word : `${word} (related)`;
  console.log(
    `\n${heading} — ${found.length} ${found.length === 1 ? "entry" : "entries"}`,
  );
  if (found.length >= 3) {
    console.log(
      `  ${found.length} rules already turn on this word; consider one rule for it`,
    );
  }

  found.forEach((entry) => {
    const under = broaderThan.get(entry);
    console.log(
      `  ${pad(entry.phrase, phraseWidth)}  ${pad(entry.category, 15)}${
        under
          ? `sits under: ${under.map(({ phrase }) => phrase).join(", ")}`
          : ""
      }`,
    );
    console.log(`  ${pad("", phraseWidth)}  ${entry.selector}`);
    console.log(`  ${pad("", phraseWidth)}  -> ${fixOf(entry)}`);
    const others = [...wordsOf(entry)].filter((other) => other !== word);
    if (others.length > 0) {
      console.log(
        `  ${pad("", phraseWidth)}  also filed under: ${others.join(", ")}`,
      );
    }
  });
});

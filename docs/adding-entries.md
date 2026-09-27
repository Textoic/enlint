# Adding entries to no-bad-words

How to turn a word or phrase into an entry in `src/rules/no-bad-words.ts`.

This file is not generated. It is the reference a person reads before adding a
rule by hand, and it is also the prompt: `scripts/entry-draft.ts` reads it
verbatim and hands it to the local model, so anything written here changes what
the model produces. Keep it accurate and keep it short; every paragraph costs
context on every inference.

The harness that automates the loop is documented at the end.

## 1. Is it already covered?

Run `npm run lookup <word>` first, or let `npm run add` do it. There are four
answers, and only two of them mean "write a new entry".

| Case                         | Example                                                                                | What to do                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| An existing rule is broader  | adding "delve into"; `delve` exists                                                    | Keep the existing rule. Add nothing.                                         |
| An existing rule is narrower | adding "delve"; `delve into` exists                                                    | Add the broad rule, and decide whether the narrow one still earns its place. |
| Three rules circle one word  | adding "broad implication"; `profound implication` and `significant implication` exist | Replace all of them with one rule on the shared word.                        |
| Nothing comes back           | adding "laid the groundwork" to an empty list                                          | Add it.                                                                      |

A narrower rule earns its place next to a broader one for exactly two reasons,
and `test/rules/no-bad-words.test.ts` records which reason applies to each pair
that survives:

- **span** — the narrow rule exists to swallow a preposition or a modifier so
  its replacement is grammatical. `delve into` becomes "explore"; the broad
  `delve` rule spans only "delve", so merging the two would produce "explore
  into".
- **advice** — the narrow rule gives specific guidance the broad one cannot, and
  `src/index.ts` prefers the longer span, so the narrow rule's advice is what
  the writer actually sees.

If neither applies, the narrow rule can never say anything the broad one does
not already say. Drop it.

## 2. The span is what you are replacing

The reported error runs from the **leftmost matched token to the rightmost**,
inclusive. Words in between that the selector never named are inside it anyway.

`[lemma=need] > [xpos=NOUN] > [form=robust i]` names three tokens. On "we need a
robust solution" it reports characters 3–25 — `need a robust solution` — because
"a" sits between the leftmost and rightmost matches and gets swallowed. The same
is true of `delve into`: written as a descendant, it spans "delve deeper into"
on the padded form, "deeper" and all.

This is the single most common way a selector goes wrong. A `suggestions`
replacement has to be a grammatical stand-in for that whole stretch of text, not
just for the words the selector mentions. Write the selector, then say the span
out loud with the replacement substituted in.

## 3. Writing the selector

The selector is a `css-select` query over the dependency tree. Every entry is
one, and `src/query-parse.ts` is what runs it.

**Anchor on the head, descend to the modifiers.** The first compound in the
selector is the syntactic head of the phrase, not its first word. Word order in
the selector has no effect on the reported span, which comes from token
positions.

    an unwavering commitment   ->  [lemma=commitment] > [form=unwavering i]
    left an indelible mark     ->  [xpos=NOUN] > :matches([form=indelible i], [form=lasting i])
    walk slowly                ->  [lemma=walk] > [form=slowly i]

**Lemma for verbs and nouns, form for everything else.** A verb has to match in
every tense, so `[lemma=leave]` rather than `[form=left i]`; a noun has to match
singular and plural, so `[lemma=implication]`. Adjectives, adverbs and function
words do not inflect usefully, so match them by `form`.

**`i` on every `form`, never on `lemma`.** Across the 352 entries, 591 of 594
`form` tests carry the `i` flag and none of the 372 `lemma` tests do. Lemmas
come out of artisan already lowercased, so `i` there is noise; a `form` test without
it silently misses the word at the start of a sentence. The three exceptions are
hyphenated or accented spellings where case cannot vary.

**Skip articles and possessives.** Only 12 entries name "the", "a" or "an", and
every one of them does it to pull the article _inside the span_ so the
replacement can swallow it — `[form=fact i] > [form=the i] ~ [form=that i]`
spans "the fact that" so deleting it leaves nothing behind. If the article does
not need to be inside the span, leave it out; it is not what makes the phrase
bad, and naming it makes the rule miss "this fact that".

**Combinators, in order of preference.**

- `>` (child) is the default and covers 275 of 352 entries.
- `~` (sibling) when a word hangs off the same head rather than off the word
  before it, and it has to be inside the span. `shed light on` needs
  `[lemma=shed] > [form=light i] ~ [form=on i]`, because "on" is a sibling of
  "light"; leaving it out replaces only "sheds light" and leaves "explains on
  the problem".
- A bare space (descendant) only when artisan attaches the word at a depth that
  varies. There are four in the whole list. `delve into` is one: "delve deeper
  into" hangs "into" off "deeper", so a child combinator matched the bare form
  and missed the common padded one.

**`:matches(...)` for a family, one entry instead of five.** Put the `i` flag and
any `xpos` test inside each branch.

    :matches([lemma=offer], [lemma=present], [lemma=provide]) > [xpos=NOUN] > :matches([form=unique i], [form=valuable i])

**`[xpos=...]` does three jobs.** Disambiguating a homograph (`[lemma=endeavor][xpos=NOUN]`
against `[lemma=endeavor][xpos=VERB]`, filed as two entries); pinning a word to
one class so its relatives do not fire (`[form=audacious i][xpos=ADJ]`); and
standing in as a wildcard slot for a head whose identity does not matter
(`[lemma=navigate] > [xpos=NOUN] > [form=complex i]`).

The tag set is the eight tags in `src/types/input.ts`, and it is not Universal
Dependencies: determiners are `ADJ`, pronouns and numbers are `NOUN`,
prepositions and conjunctions are both `MARK`, modals and auxiliaries are
`VERB`. There is no `DET`, `ADP`, `PRON`, `NUM`, `AUX` or `PROPN`.

**Morphological features only when the meaning lives in them.** Ten entries use
one, and they are all hedges built on a modal: `[Mood=Pot] > [form=one i] ~ :matches([form=say i], [form=argue i])`
for "one might say". A selector may only name attributes the input contract
defines; the test enforces it.

**artisan's lemmas will surprise you.** "data" lemmatizes to "datum", "in" to
"inch", "cause" to "because" in some parses. Match those by `form`. You do not
have to memorize the list — the verification step in §5 catches every one of
them, and the fix is always to swap `lemma` for `form`.

## 4. Replacement or advice

**`suggestions` when the whole span can be swapped mechanically.** Each string
replaces the entire span. `:inflect(lemma)` is inflected to agree with the first
matched token, so one entry covers every tense: `[":inflect(shrink)"]` produces
"shrinks", "shrank" and "shrinking". Two hundred of the 349 suggestions use it.
A single `[""]` deletes the span, which is what empty phrases and opinion
markers get. Order them best-first; four is the most any entry has.

**The words immediately around the span are handled for you.**
`src/repair-suggestion.ts` widens the edit to take in what the replacement
invalidated, so these are no longer reasons to reach for a `message`:

- the article stops agreeing — "an affluent suburb" → "wealthy" comes out "a
  wealthy suburb", not "an wealthy suburb";
- the replacement brings its own determiner — "the multifaceted nature" → "the
  complex quality" does not come out "The the complex quality";
- a deletion leaves the comma that set the phrase off — "In my opinion, the
  policy will fail" → "The policy will fail", including the capital;
- a deletion leaves the "that" the phrase licensed — "It seems to me that the
  deadline slipped" → "The deadline slipped".

The repair is deliberately timid: every case above is decidable from the token
stream, and anything it cannot settle it leaves alone. In particular it never
changes an article before a word starting "u" or "eu", because "a unique blend"
and "an unusual blend" are both correct and the spelling does not say which.

**`message` when the fix reaches further than that.** Prose, addressed to the
writer, saying what to write instead. Use it when:

- a preposition outside the span survives and no longer fits — "gain an insight"
  → "learn" leaves "we learned into the process", and "add a layer of complexity
  to X" → "complicate" leaves "complicate to X";
- the recast changes part of speech, so a noun phrase becomes a clause with a
  verb: "the study aims to explore X" → "the study looks at X";
- the span swallows an object it has to keep — replacing "add insult to injury"
  wholesale loses whatever was between the matched words.

The test is whether the fix needs the sentence read to be written. Widening an
edit by one article or one comma is arithmetic; deciding where a stranded
preposition should go is not.

Prefer `suggestions`. A mechanical fix is one the editor can apply; advice is
one the writer has to act on. If a single word can stand in for the whole span
without touching anything around it, use it.

Entries with neither fall back to the category's default message. That is a
deliberate choice for a handful of formalisms and hedges where "just do not do
this" is the whole of the advice, not a shortcut for skipping the field.

## 5. Examples, and proving the entry works

Every new entry ships at least two examples: a sentence using the phrase, and
the same sentence with the fix applied. They are not decoration. A selector that
names an attribute that does not exist, or a lemma artisan never produces, matches
nothing at all and never errors — it just silently does nothing, forever.

`npm run add` verifies each example by parsing it with artisan and running the entry
against the real tree, and it rejects a draft unless, for every example:

1. the rule fires;
2. the reported span is the phrase, not a stray overlap elsewhere in the
   sentence;
3. applying a `suggestions` replacement to the span reproduces the stated fix
   (for `message` entries, the fix only has to differ from the original);
4. the fixed sentence no longer trips the rule.

Check 4 is what catches a replacement that swaps one flagged phrase for another.
Verified examples are stored in `test/fixtures/no-bad-words-examples.json` and
replayed by `test/rules/no-bad-words-examples.test.ts`, so an entry that quietly
stops matching after an artisan upgrade fails the suite instead of going unnoticed.

Write examples as ordinary prose a person might actually publish, and vary the
grammar between them — different tense, different subject, the phrase somewhere
other than the start of the sentence. Two examples that differ only in their
nouns prove almost nothing.

## 6. Naming and filing

`phrase` is the expression in plain English, as a reader would say it. It is the
sort key and the heading in the generated docs; it is never matched against
text. Join alternatives the selector's `:matches` covers with `/`
("emphasize/underscore/highlight the need/potential"). Distinguish homographs
with a parenthetical ("endeavor (noun)", "endeavor (verb)"). A leading article
is fine — `lookupKey` strips it for sorting, so "a beacon of" files under B.

`category` picks the default message and groups the generated docs. It does not
affect matching.

| Category         | What belongs in it                                                                |
| ---------------- | --------------------------------------------------------------------------------- |
| `ai`             | House style of language models: "delve", "tapestry", "underscore the importance". |
| `cliche`         | Expressions the reader has already seen a hundred times: "bury the hatchet".      |
| `empty`          | Adds no meaning; deleting it costs nothing: "the fact that".                      |
| `explained-verb` | A verb plus a modifier where one stronger verb exists: "walk slowly" → "crawl".   |
| `formalism`      | Academic or institutional register: "with the advent of".                         |
| `hedge`          | Doubt about the author's own claim: "it might be said that".                      |
| `opinion`        | Marks a statement as the author's opinion: "the way I see it".                    |
| `redundancy`     | Says the same thing twice: "added bonus", "actual fact".                          |
| `variation`      | A rare or long word standing in for a common short one: "utilize" → "use".        |

Set `automated: true` on anything the model wrote. It means the entry owes a
human review and nothing else; matching is unaffected. Drop the flag once a
person has read the entry and agrees with it.

Entries are sorted by `lookupKey(phrase)` and the test enforces it. After
editing, run `npm run build-docs`; never edit `docs/no-bad-words.md` by hand.

## 7. The harness

`npm run add` runs the whole loop above. Every inference goes to the local
Ollama install — nothing leaves the machine.

    npm run add "laid the groundwork"          # one phrase, dry run
    npm run add --file phrases.txt             # one phrase per line
    npm run add --file phrases.txt --apply     # write the accepted entries

For each phrase it triages against the existing list (§1), asks the model for a
draft with the relevant existing entries in front of it (§3, §4), verifies the
draft against artisan (§5), and feeds any failure back to the model to repair, up to
`--attempts` times. Nothing is written without `--apply`; the dry run prints
what it would have done.

    OLLAMA_MODEL   model to run, default qwen3.8:27b
    OLLAMA_HOST    server to reach, default http://127.0.0.1:11434

`--apply` splices accepted entries into `src/rules/no-bad-words.ts` at their
sorted position, removes any entry the draft declares it subsumes, formats the
file with prettier and updates the fixture. It refuses to place an entry inside
the generated `copula(...)` block; a new copula row is a one-line edit to that
table and should be made by hand.

Run `npm test` and `npm run build-docs` afterwards. The suite is the backstop:
it checks the sort order, duplicate phrases, unknown attributes, and every
containment pair against the reviewed list in
`test/rules/no-bad-words.test.ts` — a new entry that subsumes an old one will
fail there until the pair is either resolved or recorded with its reason.

## 8. Examples for entries that already exist

`npm run examples` fills the fixture for the entries already on the list, which
is the other half of the same job: an entry with no examples is an entry nobody
can check.

    npm run examples                       # every entry with no examples yet
    npm run examples -- --automated        # only the ones owing a review
    npm run examples -- --category ai      # one category
    npm run examples -- --phrase "delve"   # one entry
    npm run examples -- --report           # the review queue, no inference
    npm run examples -- --refresh          # re-agree with the code, no inference

Only the sentences come from the model. For an entry with `suggestions` the
fixed text is **computed** by running the rule, not taken from the model, so the
fixture shows what enlint actually does to a sentence rather than what a
model imagines it would do. The model is asked for its version anyway, and where
the two disagree the run says so — that disagreement is usually the rule being
wrong, and it is the fastest way to find a replacement that strands an article
or inflects to the wrong tense.

The other signal worth watching is an entry the model cannot illustrate at all.
Three rounds of sentences written specifically to use a phrase, none of which the
selector matches, means the selector almost certainly never matches anything.

`--report` prints both signals over the whole fixture without running the model,
which is the form to read when reviewing rather than generating:

- **entries that produce broken text** — a replacement that leaves an article
  disagreeing with the word after it ("an bonus"), a deleted phrase that leaves
  behind the comma that set it off (", the new policy will fail"), two
  determiners in a row. These are found by looking for damage the replacement
  introduced that the original sentence did not have, so they are facts about the
  rule rather than opinions about the prose.
- **entries with no examples at all**, with their selectors.

`--refresh` is the other zero-inference mode, for after the engine or the parser
changes under the fixture. Because a replacement's fixed text is a computation
rather than a recorded observation, it recomputes every one of them, and it drops
any stored example that no longer holds — reporting both, so a selector that
stopped matching surfaces as an entry needing examples rather than as a stale
assertion the regression suite keeps making. Run it before `npm run examples`
when a change has moved a lot of spans at once.

A source sentence is rejected before any of this if it is not grammatical
itself — most often because a model pasted an expression's leading article on
top of the one the sentence already had, giving "The a multifaceted nature". An
example built on bad English proves nothing and goes into a file a person reads.

The run writes after every entry, so it can be stopped and restarted. It skips
entries that already have examples, except where those examples no longer pass
verification: when a check gets stricter, rerunning is what brings the fixture
back up to it. `--force` regenerates regardless.

## 9. How much the fixture proves, and what it does not

One verified sentence per entry answers a narrow question: this selector fires
here. It does not show that the selector fires on the same expression written
differently, and that is where selectors actually fail — a rule names a tree
shape, and the tree for one expression changes with the clause around it.

Nothing in this repo measures that. To test it, take each verified sentence
from the examples fixture and ask again in six syntactic positions — embedded
under a verb, after a subordinate clause, coordinated with another clause,
after a time adverbial, with a trailing adverbial, as a question — none of
which touches the expression itself. `entries` and `runEntry` from
`@textoic/enlint/testing` run one entry in isolation for exactly this.

Record fragility; do not forbid it. A narrow selector may be exactly right, and
the number to watch is the diff against a saved snapshot of which rewordings
each entry survives, which regresses the moment an entry stops surviving one it
used to. Run the check after every artisan upgrade — that is the change most likely
to move a tree shape out from under a selector, and the failure is otherwise
completely silent.

Two things the fixture still cannot tell you. There are **no negative examples**,
so nothing here demonstrates that a rule stays quiet where it should — a selector
that fires on everything passes every check in this repo. And for a `message`
entry the recorded fix is prose a model wrote, checked only for differing from
the original and no longer tripping the rule; only the 516 replacement fixes are
computed, and only those carry the artifact checks.

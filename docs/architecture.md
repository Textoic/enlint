# Architecture and findings — Textoic

This file is the only place in this repository where prose about the code is
allowed to live. The linter rejects comments in source files, so everything a
comment would have said belongs here.

**How to use it.** Add an entry when you learn something the code cannot state
for itself: why a design went one way when another looks more obvious, what you
tried that did not work and the measurement that says so, an invariant that
spans files, or a constraint imposed from outside. Newest entries at the top of
the log. Date each one. Keep each entry to a single finding.

**What does not go here.** Anything a name can carry. If you are about to write
"this function converts X to Y", the function is misnamed. Fix the name instead.
Nor does routine history: git already records what changed and when.

## Log

### 2026-09-27, ignored cases are filtered before `settled`, and a case key is the entry's own name

Editors built on enlint need to silence one case of a rule ("very dirty")
without switching the rule off. Three rules have cases: `no-bad-words`,
`no-explained-intensifiers` and `no-explained-antonyms`. Their problems now
carry `case`: the entry's `phrase`, the intensified lemma, and the negated
lemma. The phrase is already unique across the 420 entries, and a catalog test
keeps it so; a generated key would change whenever an entry was reworded.

`ignore` is applied inside `lint`, before `settled`. Filtering the output
instead gives the wrong answer: a wide ignored problem that offers a
replacement supersedes the narrower problems it overlaps, so dropping it
afterwards would also drop them. The intensifier key is the head lemma, so
ignoring "dirty" also ignores "really dirty"; the catalog labels it
"very dirty" because that is how people search for it.

The catalog's examples run through the parser in a test. Five of the first
drafts reported nothing or reported another rule first: "I am not sure" is a
`no-bad-words` hedge before it is an antonym, and the lexical density example
from the docs is under the 16-word floor once shortened.

### 2026-09-27, artisan is a runtime dependency, pinned to a git tag until it is on npm

The provider was `"nlp": "file:../artisan"`, a sibling checkout installed
under the name `nlp`. It is now `@textoic/artisan`, taken from the `v0.1.0`
tag on GitHub; the name `artisan` on npm belongs to someone else. Three rules
import `inflect` from it, so it ships to every consumer as a dependency, and
the README no longer says the rules are independent of it. Once
`@textoic/artisan` is on npm, the git spec becomes `^0.1.0`. npm refuses no
git dependency at publish time, but a consumer would then need to clone and
build artisan on install.

artisan keeps `dist` out of git, so npm builds a git dependency only through
its `prepare` script. Before artisan had one, the install here held `data/`
and no `dist/`. npm records the tag's commit in `package-lock.json` as
`git+ssh://` even when the spec uses HTTPS, yet it still fetches the public
GitHub repository over HTTPS.

### 2026-09-27 — Codex and Claude share one lint gate, found through the repository root

`.codex/hooks.json` named its gate by an absolute path under one user's home
directory, so the hook exited quietly on every other checkout. It now asks
`git rev-parse --show-toplevel` for the root and runs
`.claude/hooks/lint-gate.mjs`. The Codex copy of the gate was byte-identical
and is gone. The gate finds the project from its own location, two levels up,
so either agent can run it. Nobody has checked whether Codex's edit payload
carries `tool_input.file_path`; if it does not, the gate exits 0 unseen, as
it did before. `CLAUDE.md` imports `AGENTS.md` for the same
reason: the two files were identical and would have drifted.

### 2026-09-10 — exemplar nouns and detached fragments are not enough evidence for structural warnings

`no-similes` now excludes a noun head. It also excludes an immediately preceding
noun without tense features when a clause boundary separates it from the
marker's head. The second check catches examples whose marker attaches to a
distant verb, as in "contemporary artists like Zheng Chongbin". Nouns with
tense features remain ambiguous: the fallback tags "sounds" and "feels" as
nouns in two labeled similes. This gives up nominal comparisons such as
"eyes like diamonds"; the input cannot distinguish those from exemplifiers.

The reviewer caught that excluding any adjacent noun hid "I landed on the
pavement like a sack of unwrapped potatoes" and "He swallowed the meal like a
wolf". Both attach "like" correctly to the verb. Requiring the intervening
boundary preserves those comparisons; both are now positive regressions.

Replaying all 14 occurrence labels from the full corpus documents, with their
Markdown blocks and offsets, removes all eight labeled false positives.
The fallback loader in `scripts/nlp.ts` retains all six labeled positives. The
trained loader in `test/trained-nlp.ts` retains three of six both before and after this change. Its other three already
hit the existing exclusions for "be", "sound" and "feel". No label was changed.

`no-noun-clusters` now requires contiguous noun modifiers immediately before
their head. Pronouns, digits and symbols cannot count as lexical nouns. The
provider tags numbers as NOUN, so counting tags alone turned "slice checks 3
batches" into a four-noun cluster under the fallback. The trained model already
tags the first "checks" and both providers tag "sizes" as verbs in the supplied
examples. Their remaining misparses do not justify guessing verb senses inside
this library. The upstream worth-before-gerund correction breaks the false
"Throughput note worth flagging" chain; it does not settle the gerund's own tag.

`no-absolute-phrases` now rejects participial roots and attachments crossing a
colon, semicolon, bracket, en dash or em dash. In the supplied fragments,
"doing" or "activating" becomes the root despite there being no finite main
clause. In the e-commerce example, "doing" attaches across the dash to "Pick".
These exclusions deliberately miss true absolutes across those boundaries.
They do not reject a whole sentence merely because it contains a dash.

The new regressions cover both provider modes, including raw and masked emphasis.
The full suite still has 17 unrelated word-rule failures, reproduced with the
unchanged upstream parser: fixture inventory, 14 example replays, containment,
and the invalid `[xpos=opinion]` selector. Those failures are outside this patch.

### 2026-09-10 — no-complex-verb-tenses is deleted, because it read coordinated clauses as one tense

The rule reported a verb as complex whenever one of its children was another
verb. A progressive has that shape, so it reported "was sleeping when the phone
rang" and "The dog was barking, and the neighbours were shouting". It had no
idea where a clause ends. Under the development parser it reported "opened the
door, walked to the window and looked outside" as a single complex tense,
because artisan hangs each coordinated verb below the first. Those three sentences
are ordinary English, and every one was reported.

The ASD-STE100 verb list the rule enforced is a house style for maintenance
manuals. A fix would need clause boundaries the parse does not mark, so the
rule is gone rather than patched. It was off by default, so default output does
not change. The `ErrorId` member and the config key are gone, and a config that
names the key is now a type error.

### 2026-09-10 — no-complex-noun-phrases is deleted, because parallel adjuncts parse as a chain

The rule counted prepositional phrases that hang one below another from a noun,
and reported more than two. artisan attaches a run of prepositional phrases to the
noun before each one, so adjuncts that sit side by side come out nested. Both
parsers report "the manager of the store in the town on Friday" and "left the
keys to the car on the table by the door". "on Friday" says when the meeting
happened and "on the table" says where the keys were left, but the tree hangs
each below the noun before it. Telling side-by-side
from nested attachment needs meaning the parse does not carry, so no limit on
the count fixes it.

The rule was off by default. `ComplexNounPhraseOptions` and its `RuleOptions`
key are gone with it, which leaves `no-high-lexical-density` as the only rule
that takes options.

### 2026-09-10 — "at a point in time" skips "this" and "that", or it hides their replacements

"at this point in time" → "now" and "at that point in time" → "then" report
the same span as the broad "at a point in time", which only gives advice.
`settled` breaks a tie in width and start by list order, and "at a point in
time" sorts first. Without the exclusion its message would win and both
replacements would disappear. Its selector puts
`:not(:has(> :matches([form=this i], [form=that i])))` on "point", and a test in
`test/rules/no-bad-words.test.ts` pins "At this point in time" to "now". The
containment test pairs the three on vocabulary, so the pairs are recorded as
reviewed.

The development parser tags "point" as a VERB after "that", "which", "what"
and "some", and hangs "at" below it. The broad entry therefore misses "At which
point in time did it fail?" under `scripts/nlp.ts` and catches it under
`test/trained-nlp.ts`. The same misparse is why "at that point in time" already
failed its fixture replay before this change. The new fixture examples use "a"
and "the", which both parsers attach as expected.

### 2026-09-10 — "built on top of" misses an active verb with an object

"We built our search feature on top of Elasticsearch" hangs "on" off
"feature", not off "built", so the child chain does not match. A descendant
combinator would match it, and would also match "on top of" anywhere below the
verb, including inside a relative clause on its object. The entry keeps the
child chain. It matches the passive "is built on top of" and the intransitive
"building on top of", and misses the active verb with an object.

### 2026-09-10 — "woven into" is replaced with "embedded in", not "embedded"

The span includes "into", because the entry has to anchor on it to avoid every
other use of "woven". Replacing the whole span with "embedded" would turn
"Security is woven into every stage" into "Security is embedded every stage".
The replacements carry the preposition: "embedded in" and "included in".

### 2026-09-09 — a past-tense feature and a noun-to-verb path do not prove the constructions these rules report

The supplied narrative examples exposed two assumptions in structural rules.
`no-absolute-phrases` treated `Tense: Past` without `VerbForm: Fin` as proof of
a participle. The provider uses exactly that feature bundle for ordinary verbs
such as "collapsed", "lived" and "met". The rule now requires `VerbForm: Part`.
This deliberately gives up ambiguous regular past absolutes such as "arms
crossed". Gerunds and explicit irregular participles such as "sword drawn"
remain covered. Inventing a list of body parts or posture verbs would conceal
the ambiguity rather than resolve it.

`no-nested-clauses` counted any noun followed by a verb along a dependency path
as another embedded clause. A prepositional object, an infinitive's object, or
a wrongly attached main predicate could therefore add a level. It now counts
only clauses introduced by an explicit relative pronoun, on a path between a
noun and a following verb. The nested relatives can still sit inside a
prepositional phrase. This gives up omitted relativizers and adverbial or
complement clauses; it does not repair the provider's remaining attachment
errors in the four reported examples.

The density examples contain fewer than 16 tokens apiece. Restoring the
documented 16-word floor from the current code's 12 clears them without moving
the percentage thresholds. The existing default-floor test failed before this
change and passes afterward.

### 2026-09-09 — a second negative clause supplies no affirmative alternative

`no-negated-contrasts` now checks the candidate predicate's polarity, including
negation on a copular predicate or a verb below an auxiliary. It does not search
every subordinate clause for negatives: those do not determine the matrix
predicate's polarity. Reporting predicates such as "swear" and "promise" are
excluded as restatements. Additive or concessive modifiers such as "also" and
"still" exclude ordinary `but` clauses unless the first side has a minimizer.
`not even` is scalar emphasis, not a removable contrasting tail.

The independent review caught an overly broad use of the reporting-predicate
exclusion: "He did not just act, but also promised" must still report an explicit
minimized contrast. Only restatement detection now applies that exclusion;
explicit `but` contrasts retain their reporting verbs.

The supplied examples run against both the trained provider and the fallback
provider. Retained positives cover all five affected rules, including noun
clusters whose tags are repaired in the sibling artisan package. The original
checkout had seven failing tests: the density floor and six unrelated word-rule
fixture or containment checks. The density failure is fixed; the other six are
unchanged.

### 2026-09-09 — the development loader has been passing a model envelope as weights

`scripts/nlp.ts` reads the versioned `{ featureSet, weights }` file as if it
were the weight map. Its output therefore follows the fallback tagger. Loading
the nested weights changes the word-rule fixture failures from six to fourteen,
so switching every development consumer is a separate migration. The existing
loader stays unchanged in this precision patch. `test/trained-nlp.ts` loads the
actual weights so the new regressions cover both provider modes explicitly.

Both repositories also needed `.codex/**` excluded from the project ESLint run,
as `.claude/**` already is. The local hook's `.mjs` file is outside the TypeScript
project; trying to type-check it prevented the required lint command from
finishing. Source and test lint rules remain unchanged.

### 2026-09-03 — the em dash rule asked whether both neighbours were words, so it skipped every dash next to a quote

`applyDashRule` required `previousToken.form` to end in `\w` and
`nextToken.form` to start with one. A dash after a closing quote, a `**`, or a
bracket has a PUNCT token on its left, so the rule said nothing. Over 160 corpus
documents that is 39 of 813 dash characters surviving the deterministic swap the
pipeline applies before any model runs, which is where the em dashes the review
frontend still showed were coming from.

**The two sides are not symmetric, and treating them so breaks dialogue.** The
rule now asks for a non-PUNCT token somewhere before the dash and requires the
token immediately after it to be a word. A quote can close on the left, which is
the case that was being missed; a quote opening on the right means an interrupted
line — `"What if she—" he stopped himself` — and that stays clean. The existing
test for the interrupted case uses the degenerate form with nothing at all after
the dash, so it passes either way and guards nothing; the realistic form is now
its own test.

**The swap's range must not cross anything the parser could not see.**
One Markdown caller masks inline code spans and `*`/`**` before parsing but applies the
swap to the raw source, so a range that runs from the previous token's end to the
next token's start deletes whatever was masked between them. `mattered — `
`` `hasDeclaredAttributes` `` ` scanning from genesis` lost its subject, and every
`**A/A2** — 16,000 rows` lost its closing `**` and italicised the rest of the
document. The range is now clamped to at most one character either side of the
dash, which is the space the swap exists to absorb and nothing else. Over 240
corpus documents the deterministic pass now changes no non-punctuation character;
before the clamp, 56 of 731 swaps deleted text, 46 of them on master already.

**The suggestion also left a double space.** Its range ran from the previous
token's end to the dash, and the replacement is `", "` — so the space before the
dash went and the space after it stayed. Every single swap did this: 712 double
spaces across those 160 documents, in 49 of the first 50. The range now ends at
the next token's start, which swallows both spaces and leaves exactly one.
`there he was—still` has no spaces to swallow, so its expected range is
unchanged.

### 2026-09-03 — no-negated-contrasts missed two shapes, both because it trusted where the parse hung `not`

`classify` reads the token `not` attaches to and decides from that. artisan does not
always attach it where the contrast is.

`"You've given us the outline the story is built from, not the story"` hangs
`not` off `built`, a VERB, so `isTail` rejected it before looking further — the
nominal being negated is the `story` that follows. The trailing branch now falls
back to the first nominal after the negation that is a sibling of it under the
same head **and repeats a nominal already in the sentence**. That last condition
is what keeps it narrow: `"He left, not knowing what to do"` and `"Do not worry,
it will be fine"` have no repeated nominal and stay clean, where widening
`hasCounterpart` to any earlier nominal would have flagged both.

`"is not to override those concerns but to ensure ..."` failed on
`conjunct.xpos === negated.xpos`, because `conjunctOf` returned the `to` marker
rather than the infinitive it introduces. It now descends through a MARK to its
first content child, so `but to ensure` offers `ensure` and the two infinitives
compare as the verbs they are.

**The descent must run parallel or it invents contrasts.** Descending through
every MARK made `"I cannot speak for him but from reading his annual reports"`
match, because the inner conjunct `reading` is a VERB and so is the negated
`speak`. The descent now happens only when the negated side carries a MARK child
with the same lemma as the conjunct's — `not to X but to Y`, `not by X but by Y`
— which is the parallel structure the pattern is made of. `not X but from Y-ing`
has no such parallel and stays clean.

**The tail must be a common noun.** `isNominal` accepts ADJ and this parser tags
`a` and `the` as ADJ, so the first match after the negation was the determiner,
not the noun, and the reported span came out as `", not the"`. Pronouns are
tagged NOUN, so `it` appearing twice in a sentence satisfied a lemma match and
flagged `"not pulling it back out"`. Both sides of the match are now restricted
to nouns with no `PronType`.

Across 560 corpus documents the rule moves from 253 findings to 265, losing none.
Eleven of the twelve additions are ordinary negated tails — "a mordant problem,
not a resist problem", "trading one discipline for another, not escaping
discipline". The sentence the whole investigation started from — "The value of
the economic analysis is not to override those concerns but to ensure ..." — was
never flagged at all, which is why the rewrite kept producing it.

### 2026-09-02 — `minimumWords` raised from 8 to 16, because short sentences are dense by construction

A short sentence has fewer function words to dilute its nouns, so the noun share
rises as the sentence gets shorter whether or not the prose is bad. Measured as
the share of sentences the rule flags, by sentence length:

```
corpus                  8-11    12-15    16-20    21-30      31+
human                    41%      34%      13%      13%      22%
claude-opus-4-8          34%      33%      30%      28%      27%
```

Human prose trips the rule three times more often in its short sentences than in
its long ones. That is not a property of the writing; it is a property of the
ratio. The old floor of 8 words put all of that noise inside the rule.

Sweeping the floor against the noun threshold, on the share of eligible
sentences flagged:

```
minWords  nouns%     human      AI    AI/human
       8      40       24%     30%        1.27
      12      40       20%     29%        1.48
      16      40       15%     28%        1.87
      16      45       11%     21%        1.82
```

Raising the floor to 16 nearly halves the false-positive rate on human prose
(24% to 15%) while barely moving how often the rule fires on model prose (30% to
28%), so it separates the two nearly twice as well. Raising `nounPercentage`
instead just makes the rule fire less on everything: the ratio hardly moves.
The floor is the lever; the percentage is not.

There is a second reason, from a rewrite pipeline built on this package.
The repair for a dense sentence is to break it up and give each piece a subject
and a verb. With the floor at 8, the pieces stayed eligible and kept scoring as
dense, so the rule punished its own advice. With the floor at 16 the pieces drop
out of scope, and "say it in shorter sentences" becomes advice the measure
agrees with.

**What this gives up.** A genuinely bad short sentence — "Implementation of
stakeholder engagement optimization." — is no longer flagged. That is the price
of not flagging the 41% of ordinary short human sentences that were being
flagged with it.

The tests that exercise the _measure_ now set `minimumWords: 8` themselves
rather than relying on the default, so the two concerns cannot be confused
again: the floor decides what is worth measuring, the percentages decide what
counts as dense.

An earlier note blamed `adjectivePercentage: 20` for
firing on ordinary English. That was wrong and is corrected here: the adjective
measure fires alone on 1% of human and 4% of model sentences. `nouns > 40%` does
essentially all the work (22% and 25%).

### 2026-09-01 — a problem with no replacement no longer silences the fixes inside it

`src/index.ts` used to drop the shorter of two overlapping problems, full stop.
The rules that report a whole sentence — `no-high-lexical-density` above all,
which spans 98% of its sentence on average and offers no replacement — therefore
swallowed every word-level fix inside every sentence they fired on. On a 500-word
finance abstract that cost 7 of 14 actionable findings, including
"leverage" → "use", "underscore" → "highlight" and an em dash swap. The writer
saw "56% of it is nouns" and nothing they could act on.

The old filter was also order-dependent, because it compared each problem against
`problems[index - 1]` — the previous problem in the sorted input — rather than
against the last problem it had kept. Given a sentence-wide flag at [0,100] and
word-level fixes at [10,20] and [30,40], the first was swallowed and the second
survived, for no reason a reader could predict.

A problem now supersedes the ones it covers only when it **carries a replacement
of its own**, or when it comes from the **same rule**. Both halves are load-bearing:

- The replacement test is the documented reason the filter exists. "delve into"
  → "explore" has to beat "delve" → "explore", or the edit reads "explore into";
  `no-passive-sentences` rewrites a whole clause and has to beat the explained
  antonym inside it. A rule that only describes a problem has no edit to win
  with, so it wins nothing.
- The same-rule test stops `no-bad-words` reporting "a sense of purpose" and
  "sense of" as two findings. Without it, dropping the replacement test alone
  doubled up every nested entry on the list.

The pass is now deterministic: widest first, keep what nothing already kept
supersedes, then sort back into document order. Deterministic, not
order-independent — `widestFirst` returns 0 for two problems of equal width and
equal start, so the stable sort falls back to the order the rules are registered
in, and reordering that array can flip which of two identically-spanned findings
survives.

**What this deliberately gives up.** Two different rules that both describe a
problem without offering a fix now both survive, where the old filter kept one.
"The system is not just fast but also cheap" reports the density flag, plus
`no-negated-contrasts` and `no-bad-sentence-structures` over nearly the same
clause with two different messages. That is one problem stated twice, and it
inflates any count of problems per sentence. Suppressing it needs
a way to tell "the same problem from two angles" from "a word inside a sentence",
and span alone cannot: both look like containment. Left as it is, because
reporting a duplicate is cheaper than hiding a fix, which is what the old
behaviour did.

Four rule tests asserted the masked output and now name the sentence-wide rules
in the list of rules they switch off, which is the convention those tests already
followed for every other rule they are not testing.

### 2026-09-01 — the density rule told writers to do the thing that raises its own score

`no-high-lexical-density` measures nouns against every non-punctuation token, so
the denominator is mostly function words. Its message asked the writer to "drop
the modifiers that carry no information", which removes words from the
denominator and none from the numerator. Following the advice raised the score.

Measured against a local model rewriting a flagged passage: 25 words at 56% nouns
became 10 words at 80%, and the whole document went from 15 density flags to 20
after a rewrite that obeyed the message. Every sentence came back still flagged,
which is what a reader reports as "the rewrite left my sentences alone" — there
was no edit of the kind being asked for that could clear the flag.

The measure is sound and the message was wrong. Unpacking a noun stack into a
clause adds the verbs and prepositions the stack had swallowed, and those land in
the denominator: the same three sentences unpacked came out at 21%, 30% and 23%,
comfortably clear. The message now asks for that and warns that the sentence
should get longer. The thresholds are untouched.

### 2026-08-30 — the local model was too slow for a hundred entries, so the examples were written by hand

`npm run examples` took about seven minutes per entry against qwen3.8:27b on
this machine, which is twelve hours for the hundred entries added on this date.
The sentences were written by hand instead and fed through the same checks the
harness applies — `verifyExamples`, plus the recomputed fix for every entry with
a replacement — so the fixture holds what the linter really does, exactly as a
model-generated run would. Nothing about the fixture format or the regression
test changed.

Three things the checks rejected, worth knowing before writing examples by hand:

- The **anchor check** compares the matched span against the words of `phrase`,
  and it does not inflect. An entry called "operationalize" whose example says
  "operationalized" is rejected when the parser cannot lemmatize the inflected
  form, because the span then shares no word with the phrase. Use the form the
  phrase is written in.
- The **artifact check** treats a sentence starting with "That", "Which" or
  "Whether" as a stranded complementizer, so "That begs the question." is
  refused as ungrammatical. Start the sentence differently.
- A one-word change to a sentence can move the tree out from under a selector.
  "It is worth noting that the deadline slipped." matches; add "twice" and artisan
  reattaches "noting" under "slipped", and it does not.

### 2026-08-30 — a rule may read the next sentence, and one now does

Every rule until now reduced over sentences one at a time, and
docs/input-format.md still says rules never look across a sentence boundary.
`no-negated-contrasts` breaks that, because the shape it has to find is
routinely written with a semicolon — "the thing that blows up is not the
deficit; it's the debt" — and artisan's sentencizer splits there. The rule reads the
following sentence only when the current one ends in a `Semi`, and only to ask
whether its root is a copula with a pronoun subject that offers a counterpart of
the negated element. Offsets are absolute across sentences, so the reported span
covers both halves.

The alternative was to stop splitting on semicolons in artisan. That changes the
parse of every semicolon in every corpus, and the two halves of a semicolon
really are independent clauses, so the split is right and the exception belongs
in the one rule that needs the pair.

### 2026-08-30 — what keeps "not X, Y" from firing on ordinary sentences

Seven guards, each of which was added because a real sentence tripped the rule,
or slipped past it, without them. The last three came out of running the rule over this
repository's own prose, which is the only place a rule of this shape shows what
it really does.

A negated tail needs a **counterpart**: an earlier sibling, or a parent, with
the negated element's own tag. Without it "He left, not knowing what to do"
reads as a contrast and loses its adjunct.

A restatement clause must sit **outside the negated element's subtree**. artisan
parses "He wasn't an enemy of the state, it was impossible" with `'t` attached
to the _second_ clause's verb, which made that verb both the negated element and
its own restatement.

A restatement, and a `but` conjunct, must **offer a counterpart of the same
tag** as the negated element. That is what separates "is not the cost, it's the
delay" (noun for noun) from "wasn't an enemy, it was impossible" (noun against
adjective), and "not the deficit, but the debt" from "not happy, but that is
another story".

A `but` conjunct must hang off the **negated element or one of its
ancestors**, not off its immediate head. artisan attaches "just" to the adjective in
"the village is not just quaint, but also cheap" and to the copula in "he is not
just a teacher, but also a coach", so anything narrower than walking the head
chain finds one and misses the other.

A restatement must **open where the negated chunk ends**: the comma or
semicolon that introduces it has to be the token right after the negated
element's subtree. Without that, "If the article does not need to be inside the
span, leave it out; it is not what makes the phrase bad" reads as a
restatement, because a semicolon and a pronoun subject are all the shape needs.

A **negated verb** restated by a clause needs that clause to be its sibling and
to have no verb between them. "She did not walk, she ran" passes; "Readers do
not need to know that someone is as busy as a bee, it has been said a million
times" does not, and artisan gives the two the same sibling structure, so the
intervening verbs are the only thing that separates them.

A negated tail runs to the end of the sentence **only when no comma, colon,
semicolon or dash stands between the chunk and that end**; otherwise it stops at
the chunk. A markdown table parses as one enormous sentence, and without this
the deletion for ", not a stray overlap" in this repository's README ran to the
end of the table.

### 2026-08-30 — the deletion span for a negated tail is not the subtree

For "the reported span is the phrase, not a stray overlap elsewhere in the
sentence", artisan attaches "elsewhere in the sentence" to the root rather than to
"overlap", so deleting the subtree of the negated noun leaves "the reported span
is the phrase elsewhere in the sentence". The rule therefore ends the deletion
at the closing comma when the chunk has one, and at the last non-punctuation
token of the sentence when it does not. A comma-delimited tail runs to the end
of the sentence in practice, which is what makes that safe.

### 2026-08-30 — what an independent review found, and what it changed

Two classes of defect, both of which the tests as written could not have caught.

**The deletion for a negated tail destroyed text.** It ended at the last
non-punctuation token of the sentence whenever no comma sat inside the negated
chunk, and the only guard looked for `Comm/Dash/Colo/Semi`. A closing bracket is
`Brck`, so "(AABBs, not points) for several reasons" deleted the bracket and the
clause after it. The guard now stops at any punctuation at all. The mirror
failure was the closing comma: it was searched for inside the negated token's
subtree, and artisan hangs the comma of "coffee, not tea, to the meeting" off the
following preposition, so the deletion left a stray comma. The rule now takes
the token immediately after the chunk, which is where a closing comma always is.

**The restatement shape fired on ordinary English.** Twelve sentences of the
"Do not worry, it will be fine" and "He can't drive, but he can ride a bike"
kind were reported, because a negated verb needed only a sibling clause with a
pronoun subject, and a `but` conjunct needed only a matching tag. Two guards
fixed all twelve: a `but` conjunct must not carry its own subject, which is what
separates a contrasted phrase from a contrasted clause, and a restated verb must
share the negated clause's subject, which is what separates "she did not walk,
she ran" from "the plan is not finished, it needs another week". "We are not
enemies, but friends" still reports, and should.

Two smaller ones from the same review: the span started inside a contraction
("`'t` drive"), and it now starts at the host word; and a restatement ended at
the subtree of whatever verb the parse chose as the clause head, which truncated
"I have not failed, I have found ten thousand ways that will not work" after
three words. It now runs to the end of the sentence, as every restatement does.

### 2026-08-30 — what the four new rules find in 22KB of real text

Measured on `test.md`, which is a saved chat transcript about collision
detection and the nearest thing in this repository to prose nobody wrote for a
rule.

- `no-negated-contrasts`: 2 hits, both the real shape — "(AABBs, not points)"
  and "most engines don't try to make GJK exact at zero distance, they bias
  toward 'collision' near zero".
- `no-complex-noun-phrases` at its default limit: 1 hit.
- `no-nested-clauses`: 0 hits, which is what a rule about two stacked relative
  clauses should find in conversational technical writing.
- `no-high-lexical-density` at its defaults: 119 hits, and with it on it
  swallows every other rule's findings in the same sentences, including one of
  the two negated contrasts. That is the number to look at before turning it on
  over a document.

### 2026-08-30 — three of the four new rules are off by default

`no-complex-noun-phrases`, `no-high-lexical-density` and `no-nested-clauses`
report a span that covers a whole noun phrase or a whole sentence, and
`src/index.ts` drops the shorter of two overlapping problems. Left on, each of
them swallows every `no-bad-words` finding inside the text it reports. Only
`no-negated-contrasts`, whose spans are phrase-sized, is on.

`no-high-lexical-density` also carries a `minimumWords` floor, default 8, which
is not part of the measure the rule is named for. Without it every two-word
sentence is 100% nouns and the rule reports the whole document. Set it to 1 to
measure every sentence.

### 2026-08-30 — a present-tense verb ending in -s was tagged Plur

artisan's lemmatizer merges the noun and verb readings of a word into one feature
bundle, so "uses", "walks" and "leverages" came out of the parser with
`Number: "Plur"` from the noun reading alongside `Person: 3, Tense: Pres` from
the verb reading. `inflect` asks for `Person === 3 && Number === "Sing"` before
it produces a third-person form, so every `:inflect(...)` replacement on such a
verb produced the bare lemma: "The algorithm leverages historical data" became
"The algorithm use historical data". Seventeen recorded fixes in the examples
fixture were wrong in exactly that way and had been recorded as correct.

The fix is a post-pass in artisan's `parse`, after the heads are assigned so no
parse decision changes: a token tagged VERB, third person, present, finite,
whose form is its lemma plus -s, -es or -ies, is `Number: "Sing"`. It is
deliberately conservative about suppletion — "are" does not start with "be", so
it keeps whatever number the parse gave it.

### 2026-08-30 — a hyphenated word at the end of a sentence ate the full stop

`acronymRegExp` in artisan's tokenizer allowed a trailing `[-.&]` with nothing after
it, so "game-changer." and "load-bearing." tokenized as one word including the
period. Any `[form=...]` selector for a hyphenated word missed it at the end of
a sentence, and the sentence had no terminator. The pattern now takes an
initialism with a trailing dot ("T.V.", "e.g.") as its own alternative and
otherwise requires a letter after every internal separator, which keeps
"A-B&C.D" whole and leaves "TV." as two tokens, exactly as artisan's tokenizer tests
already asserted.

### 2026-08-28 — comments moved out of the code

Comments are now a lint error everywhere in this repository, and the
prose that lived in them is below, under the file it came from. Nothing was
summarised on the way: each entry is the comment as it was written, so a
claim that was already stale is still stale. Correct one where you find it,
and delete one that only restates what a name already says.

---

## Design notes, by module

### `scripts/add.ts`

_from scripts/add.ts:8_

`npm run add` — turn a list of words and phrases into no-bad-words entries.

The loop for each phrase is the one docs/adding-entries.md describes: work out
whether the list already covers it, ask the local model for an entry with the
neighbouring rules in front of it, verify that entry against artisan, and hand any
failure back to be repaired. Nothing is written without --apply, because the
interesting output of a run is usually the triage: on a list of a hundred
fashionable phrases, most are already covered, and knowing which is worth more
than a hundred drafts.

_from scripts/add.ts:103_

One phrase at a time. Ollama serves one request at a time anyway, and a
batch that interleaved its output would be unreadable in a terminal, which
is where the triage is actually read.

### `scripts/build-docs.ts`

_from scripts/build-docs.ts:12_

Regenerates docs/no-bad-words.md from the rule data, so the documentation
cannot drift from what the linter actually flags. Run `npm run build-docs`
after editing src/rules/no-bad-words.ts.

### `scripts/entry-draft.ts`

_from scripts/entry-draft.ts:12_

Asks the local model for an entry, then refuses to believe it.

The loop is draft, verify against artisan, hand the failures back, draft again.
That loop is the whole reason a 27B model running on a laptop is enough for
this job: it does not have to be right, it has to be right eventually, and
every way it can be wrong is something entry-verify.ts can detect and put into
words. What the model is actually good at is the part no check can do —-
knowing that "delve into" wants "explore" and that "an enduring legacy" cannot
be fixed by deleting a word.

_from scripts/entry-draft.ts:22_

The guidelines are read at run time rather than inlined, so docs/adding-
entries.md is the only place they exist. A person editing that file to correct
something the model keeps getting wrong changes the prompt by doing so, which
is the only way a prompt this long stays true.

_from scripts/entry-draft.ts:31_

Entries chosen to show one technique each, because the model imitates what it
is shown far more reliably than what it is told. Looked up by phrase rather
than copied, so they cannot drift from the list.

_from scripts/entry-draft.ts:35_

anchor on the head, modifier below it
:inflect in a replacement
:matches for a family
sibling ~ to pull a word into the span
descendant, for a word artisan attaches at varying depth
xpos as a wildcard slot, and advice instead of a fix
message, because the replacement strands an article
deletion

_from scripts/entry-draft.ts:64_

Structured output, so the model cannot answer with prose or a markdown fence.

`fix` is an explicit choice rather than an optional field, because "either
suggestions or a message, never both" is the one rule about the shape of an
entry that a model asked for two optional fields will break every time. Both
arrays are always required and one of them is discarded below; a required
field the model must fill is more reliable than an optional one it may.

_from scripts/entry-draft.ts:114_

A draft carries the phrases it claims to replace alongside the entry itself,
because `--apply` has to remove them and a person reviewing a dry run has to
see them. They are not part of BadWordEntry: nothing on the committed list
remembers what it once replaced.

_from scripts/entry-draft.ts:193_

Later attempts run warmer. At temperature 0 a model handed the same failure
twice produces the same fix twice, and the loop burns its remaining rounds
re-reading its own mistake.

_from scripts/entry-draft.ts:209_

Sequential by design: each round is a correction to the round before it,
so there is nothing to overlap, and one local model serving one request at
a time is the whole performance story here.

_from scripts/entry-draft.ts:223_

The failed draft goes back in as the model's own turn, so the repair is a
correction to something it said rather than a fresh request it has to
reconstruct the context for.

### `scripts/entry-examples.ts`

_from scripts/entry-examples.ts:14_

Examples for an entry that is already on the list.

entry-draft.ts writes new entries; this writes the evidence for the 353 that
already exist, which is a different job with a different failure mode. The
entry is not on trial here — it is the thing being illustrated — so a sentence
the rule does not match is a bad sentence, not a bad rule, and the loop asks
for another one rather than rewriting the entry.

Except when it happens every time. An entry whose selector cannot be made to
fire on any sentence a model writes for it is an entry that has probably never
fired on anything, and saying so is the most useful thing this file does.

_from scripts/entry-examples.ts:26_

Only the sentences come from the model. For an entry with `suggestions`, the
fixed text is computed by applying the rule, because the point of the fixture
is to show what enlint actually does to a sentence, not what a model
imagines it would do. Asking anyway is deliberate: where the two disagree, the
rule's replacement is worth a second look, and that disagreement is reported.

_from scripts/entry-examples.ts:88_

Examples where the rule's replacement produced something the model did not
expect, and that no other replacement the rule offers accounts for either.
Not an error: the fixture keeps what the rule really does. It is a note that
the replacement may be the wrong one.

_from scripts/entry-examples.ts:93_

Examples where the replacement left visible damage — a stranded article, the
comma that set off a deleted phrase. The rule is broken, and this is the
most concrete evidence of it the harness can produce.

_from scripts/entry-examples.ts:126_

Warm from the start, unlike drafting. There is no single right answer to
"write a sentence using this phrase", and at temperature 0 an entry that
needs a second round gets the first sentence again.

_from scripts/entry-examples.ts:138_

The fixed text a `suggestions` entry really produces, substituted for the
model's guess before verification, so the fixture records the rule rather
than the model.

_from scripts/entry-examples.ts:162_

An entry usually offers several replacements, and the model picking the
third one is not a disagreement about anything. Only flag a fixed text
that none of the rule's own alternatives account for.

### `scripts/entry-index.ts`

_from scripts/entry-index.ts:9_

Answers "what does no-bad-words already say about this word?" — the question
that has to be settled before adding an expression to the list, and the one
the list itself cannot answer, because an entry is filed under one phrase but
names several words. "profound implication" and "broad implication" sit two
hundred entries apart under the alphabetical order; both are here under
"implication".

scripts/lookup.ts prints this, scripts/build-docs.ts renders it into the
generated documentation, and test/rules/no-bad-words.test.ts uses the
relations below to keep new overlaps from going unnoticed.

_from scripts/entry-index.ts:30_

The words a rule cannot match without, one set per alternative: the rule can
only fire on text containing every word of at least one of them. A
`:matches(...)` of three branches produces three sets.

This is the honest shape of the answer, and scripts/entry-triage.ts needs it:
flattening `:matches([lemma=utilize], [lemma=utilise])` into one set makes the
rule look like it needs both words, so a candidate "utilise" reads as
narrower than a rule that already covers it exactly.

_from scripts/entry-index.ts:46_

The same thing flattened across alternatives, which is what the containment
test below compares. Used rather than `wordsOf` because a word the selector
merely mentions says nothing about when it fires.

_from scripts/entry-index.ts:67_

Pairs where one rule needs a strict subset of the words another needs, so the
broader rule fires everywhere the narrower one does. This is the mechanical
half of the "is it already covered?" question: it finds the candidates, and a
person decides whether the narrower rule earns its place. It is a heuristic,
not a proof — it compares vocabulary, not tree shape, so it can pair two
rules that never actually overlap.

### `scripts/entry-triage.ts`

_from scripts/entry-triage.ts:5_

"Is this expression already covered?", answered mechanically.

scripts/lookup.ts asks the same question and prints the evidence for a person
to judge. This module reaches a verdict, because `npm run add` runs unattended
over a list of a hundred phrases and cannot stop at each one. The verdict is
a decision about vocabulary, not about meaning: it compares the words a
candidate phrase contains against the words each existing rule cannot fire
without, and it is deliberately the same comparison `containments()` makes, so
the harness and the test suite agree about what sits under what.

It is a heuristic. Two rules can share every word and never match the same
tree, and the verdict is handed to the model as context rather than obeyed
blindly. What it must not do is miss a containment the test suite will later
fail on, which is why it errs towards reporting one.

_from scripts/entry-triage.ts:20_

The words a candidate phrase brings with it, as `entry-index` keys.

Both the surface form and the lemma of every token, because `wordsOf` and
`requiredWordsOf` collapse `[form=x]` and `[lemma=x]` into one namespace:
somebody looking up "delve" is not asking which of the two a rule happens to
test, and neither is this.

_from scripts/entry-triage.ts:39_

The words worth counting rules against. Articles, pronouns and prepositions
are in nearly every phrase and in a good number of rules, so leaving them in
makes every candidate look like it has a dozen siblings. The test is
positional rather than a stoplist: this tag set puts determiners in ADJ and
pronouns in NOUN, but marks both with a PronType, and prepositions and
conjunctions are all MARK.

_from scripts/entry-triage.ts:75_

Everything `npm run lookup` would have printed, for the model to read and
for the dry run to show. Ordered most-relevant first: rules that share a
content word before rules that merely share a preposition.

_from scripts/entry-triage.ts:81_

Three is the threshold the whole exercise is built around: two rules about
"implication" are two rules, three are a category. The candidate counts as
one of the three, so two existing siblings is enough to trigger it.

_from scripts/entry-triage.ts:111_

The existing rule fires if any one of its alternatives is present, so it
is the broader of the two as soon as one alternative asks for nothing the
candidate does not already bring. Equal vocabularies land here too, which
is the right answer: a candidate naming exactly the words an existing
rule needs _is_ that rule.

_from scripts/entry-triage.ts:125_

The reverse needs every alternative to be narrower, because one branch
that the candidate does not cover is a branch the existing rule still has
to keep.

_from scripts/entry-triage.ts:155_

The pile that is invisible in the source file, where entries are filed by
phrase and "profound implication" and "broad implication" sit two hundred
lines apart.

_from scripts/entry-triage.ts:173_

One line per entry, in the shape `npm run lookup` prints, for the prompt and
for the dry run. The selector is included because it is what the model is
being asked to imitate, and the words because they are what the verdict was
reached on.

### `scripts/entry-verify.ts`

_from scripts/entry-verify.ts:10_

Does this entry actually do what it says?

A wrong selector is silent. It does not throw and it does not warn: it names
an attribute the input contract never defines, or a lemma artisan never produces,
and then matches nothing at all, forever. Reading one is not a reliable way to
tell, because the answer depends on how artisan happens to attach the words — the
entries file is full of comments recording a parse that turned out to be
something other than the obvious one.

So an entry is only accepted if it fires on real sentences, parsed by the real
model, and its replacement produces the text it claims to produce. That is the
whole of this module, and it is what makes a draft written by a small local
model safe to keep.

_from scripts/entry-verify.ts:26_

The attributes a selector may name, and the values the enumerated ones may
take. This mirrors src/types/input.ts: a rule can only select on something the
input contract promises will be there. test/rules/no-bad-words.test.ts checks
the committed entries against this same table, so a draft that would fail the
suite is rejected before it is ever written.

_from scripts/entry-verify.ts:80_

The selector's own problems, before any sentence is involved: it has to parse,
and it may only name attributes that exist. Returned as prose because the
strings go straight back to the model as repair instructions.

_from scripts/entry-verify.ts:132_

Run one entry, and nothing else, over one piece of text. The rest of the list
is deliberately absent: a draft is judged on whether it fires, not on whether
some other rule would have caught the sentence first.

_from scripts/entry-verify.ts:138_

Comparing a rewritten sentence to the one the harness produced is a
whitespace-and-capitalization argument otherwise. Deleting a span leaves two
spaces; replacing a span at the start of a sentence leaves a lowercase word
where the model wrote a capital. Neither is the entry being wrong, so neither
should fail it.

_from scripts/entry-verify.ts:158_

Damage visible without understanding the sentence.

In a source sentence this means the model wrote bad English and the example is
worthless — usually by inserting a phrase's leading article verbatim, so "a
multifaceted nature" lands in a sentence as "The a multifaceted nature".

In the text a replacement produced it means something else entirely: the rule
is broken. Deleting "at the end of the day" leaves the comma that set it off;
replacing "affluent" with "wealthy" leaves the "an" in front of it. Those are
not reasons to reject the example — the fixture has to record what the linter
really does — but they are the review queue.
"a" against "an" is about sound, not spelling, and the spelling does not
always say which: "a unique blend" and "an unusual blend" are both correct, and
nothing in the letters distinguishes /juː/ from /ʌ/. So words beginning with
"u" are not checked at all, nor acronyms ("an FBI agent"), which is why the
consonant test wants a second lowercase letter. The remaining vowels are
reliable apart from a short list — "a one-time fee", "a European bank" — and
the point is to catch a replacement that changed the sound it starts with,
which a false alarm here would cost an unnecessary regeneration to learn.

_from scripts/entry-verify.ts:186_

Deleting "it seems to me" from "It seems to me that the deadline slipped"
leaves "That the deadline slipped", which is a subordinate clause with
nothing to subordinate it to. Only reported when the original did not open
this way, so a sentence that always began "That approach failed" is not
accused of anything: `introducedArtifacts` does that comparison.

_from scripts/entry-verify.ts:197_

Only what this text has and the text it came from did not. Several sentences
are quoted or deliberately clipped, and an artifact the original already had
is not something the rule introduced.

_from scripts/entry-verify.ts:215_

The words of `phrase` that a match ought to land on, so a rule that fires on
something unrelated elsewhere in the sentence is caught. Function words are
left out: "of" appearing in the span proves nothing.

A phrase is written for a reader, not for a parser: "emphasize/underscore/
highlight the need/potential" joins alternatives with a slash and "endeavor
(noun)" carries a disambiguating parenthetical. Both are stripped first, or
artisan reads the notation as words and the anchors come out wrong.

_from scripts/entry-verify.ts:241_

Some expressions are function words all the way down — "as to whether",
"in order to", "the very". Filtering those out leaves nothing to anchor on,
and a check with no anchors rejects everything, including the sentence that
uses the phrase exactly as written. For those, every word counts.

_from scripts/entry-verify.ts:337_

Per-example results without the entry-level checks, for callers that are
building a set of examples one at a time rather than judging a finished draft.
`npm run examples` keeps whatever passes and asks for replacements only for
what did not, so it cannot use an all-or-nothing verdict.

_from scripts/entry-verify.ts:361_

Allowed on the committed list for a handful of formalisms, but never for
something a model just wrote: the category default is a decision, and a
draft that reaches it has not made one.

_from scripts/entry-verify.ts:381_

No point running sentences through a selector that cannot match anything;
every example would fail with the same uninformative "does not match", and
the real complaint is already in `broken`.

### `scripts/entry-write.ts`

_from scripts/entry-write.ts:7_

Puts an accepted entry into src/rules/no-bad-words.ts, at the position the
sort order demands, and its examples into the fixture the suite replays.

Editing source as text is usually a bad idea, and it is the right one here
for a narrow reason: the list is 2,300 lines of hand-written entries carrying
comments that record why a selector is shaped the way it is, and rewriting the
file from the evaluated data would delete every one of them. So the file is
treated as a sequence of members with an insertion point between two of them,
nothing else is touched, and prettier decides the formatting afterwards so the
result is byte-identical to what a person editing by hand would have produced.

_from scripts/entry-write.ts:39_

Splits the array body at commas that are not inside a nested structure, a
string or a comment. A regex cannot do this: the entries contain commas inside
selectors, inside `:matches(...)`, and inside nested arrays.

_from scripts/entry-write.ts:88_

Pairs the members in the file with the entries the module actually exports, so
a generated block's sort keys are known without evaluating it here. A literal
consumes one entry; anything else consumes every entry up to the next literal.

The alignment is also a check: if a member's phrase is not the next exported
entry, this file is not shaped the way the splice assumes and the safe move is
to stop rather than to insert into the wrong place.

_from scripts/entry-write.ts:177_

Sorted by phrase, because the file is written by two different scripts and
read by a person reviewing a diff. Insertion order would put whichever entry
was generated last at the bottom and make every run look like a rewrite.

_from scripts/entry-write.ts:209_

The array is the last top-level statement of its kind and closes on a line
of its own, which is what `\n];` finds. Searching for a bare `]` would find
the first one inside a selector.

_from scripts/entry-write.ts:245_

A key landing inside a generated block is a row in that block's table, not
a new member of the array. Adding it as a literal would sort correctly for
about a week and then confuse whoever next edits the table, so the harness
says so and leaves it alone: a copula row is a one-line edit by hand.

_from scripts/entry-write.ts:279_

prettier rather than careful string building: the entries are formatted by
`npm run format`, and an entry that survives one run of it unchanged is
indistinguishable from one typed by hand.

### `scripts/examples.ts`

_from scripts/examples.ts:12_

`npm run examples` — fill test/fixtures/no-bad-words-examples.json.

The fixture is two things at once, and this script exists for both. It is the
regression suite: every pair in it is replayed against artisan, so an entry that
silently stops matching fails a test instead of going unnoticed. And it is the
review material: 353 entries are hard to judge as selectors and easy to judge
as "here is a sentence, here is what the linter does to it".

The run is long — one inference per entry — so it writes after every entry.
Stopping it halfway leaves the work done so far on disk, and starting it again
picks up where it left off, because entries that already have examples are
skipped unless --force says otherwise.

_from scripts/examples.ts:60_

The review queue over everything already generated, which is a different
question from "what should I generate next?" and needs no model to answer. A
full run reports the entries it touched; this reports the list.

_from scripts/examples.ts:113_

Bringing the fixture back into agreement with the code, without a model.

Two things in it can go stale on their own. The `fixed` text of a replacement
entry is not data but a computation — the rule applied to the sentence — so a
change to what the engine produces makes every recorded fix for that entry
wrong, and recomputing it is arithmetic, not judgement. And a sentence that
used to match may stop matching, if a selector or the parser changed under it;
that example is a recorded fact that is no longer true, and keeping it would
have the regression test asserting the old behaviour.

Dropped examples are printed rather than quietly removed, and the entry then
shows up in --report as having none, which is the loudest thing the harness
can say about it.

_from scripts/examples.ts:231_

Examples that no longer pass are regenerated without being asked for. The
checks get stricter over time — rejecting ungrammatical source sentences
was added after the first full run — and rerunning this is how the fixture
catches up, rather than a flag somebody has to know to pass.

_from scripts/examples.ts:266_

Entries the model could not illustrate at all. Collected rather than printed
as they happen, because they are the point of the exercise and a long run
scrolls them off the screen.

### `scripts/lookup.ts`

_from scripts/lookup.ts:4_

`npm run lookup <word>` — every no-bad-words rule that mentions a word.

Run this before adding an expression to the list. It answers the four cases
that come up:

the word is already covered by a broader rule -> keep the broader rule
the word is covered only in a narrower form -> widen, or add and link
several rules already circle the same word -> abstract them into one
nothing comes back -> add it

The third case is the one that is invisible in the source file, because
entries are sorted by phrase: "profound implication" and "broad implication"
are two hundred entries apart there and adjacent here.

_from scripts/lookup.ts:30_

Prefix matching in both directions, so "implications" finds "implication"
and "implicat" finds both, without loading the lemmatizer for a lookup.
Prefixes rather than substrings: "implication" contains "on" and "at", and
matching those buried the answer under every rule about a preposition. Short
queries only match exactly, for the same reason.

### `scripts/nlp.ts`

_from scripts/nlp.ts:10_

Loads the artisan language model and exposes a single `parse(text)`.

The data files are located with `import.meta.resolve`, which asks Node to
resolve the specifier through artisan's package exports. The previous approach
hardcoded `../node_modules/nlp/data/dictionary.json` relative to this file,
which broke under hoisted installs, pnpm layouts and anything that moved
this script, and silently pointed at nothing if artisan reorganized its data
directory. artisan publishes `./dictionary.json` and `./weights.json` as export
subpaths, so this asks for those names and lets Node find them.

This module is dev-only: it reads the filesystem, and src/ deliberately
cannot. A browser or editor host loads the model its own way and calls the
linter with the parsed result.
JSON.parse is typed as returning `any`, so the caller states the shape it
expects. Nothing validates it: these are artisan's own data files, and if their
shape ever changes the tagger produces nonsense long before a type guard
here would help.

_from scripts/nlp.ts:37_

artisan's default export is the whole pipeline: sentencize, tokenize, then parse
each sentence. It used to be assembled by hand here out of the `nlp/parse`,
`nlp/tokenize` and `nlp/sentencize` subpaths, which meant this copy had to be
kept in step with changes to the pipeline's internal order.

### `scripts/ollama.ts`

_from scripts/ollama.ts:1_

The one place the entry harness talks to a language model.

Every inference runs against the local Ollama install, so drafting a hundred
entries costs nothing and no text leaves the machine. The model is named by
environment variable rather than baked in, because the harness is not tuned
to any particular one: a bigger model needs fewer repair rounds, a smaller
one needs more, and both work.

This is dev-only, like every other module under scripts/. Nothing in src/
knows a model exists.

_from scripts/ollama.ts:17_

qwen3 and its relatives emit a reasoning block before the answer. Ollama
strips it into a separate `thinking` field when the model declares the
capability, but not every build does, and a stray block in `content` turns
JSON.parse into a parse error rather than a useful complaint. Cutting it here
costs nothing on models that never produce one.

_from scripts/ollama.ts:25_

Structured output. Ollama constrains generation to the schema rather than
asking politely for JSON, which is what makes a 27B model usable here: it
cannot answer with prose, a markdown fence, or a field we did not ask for.

_from scripts/ollama.ts:42_

One turn against the local model, returning whatever the schema describes.

The caller states the shape it expects and nothing validates the parsed
object against the schema a second time: Ollama already constrained the
generation to it, and the verification step in entry-verify.ts is what
actually decides whether a draft is any good. A type guard here would only
catch the case where Ollama itself is broken.

_from scripts/ollama.ts:64_

Reasoning is dead weight here. The schema does the work the chain of
thought would have done, and the drafts are short enough that the
extra tokens cost more than they buy. Models without a thinking mode
ignore this.

_from scripts/ollama.ts:70_

Deterministic by default, so a rerun of a failed batch produces the
same draft and the repair loop is debugging one thing rather than
two. The repair loop raises it deliberately; see entry-draft.ts.

_from scripts/ollama.ts:74_

Long enough for the guidelines, the neighbouring entries and the
draft. Ollama silently truncates the front of the prompt when the
context is too small, which loses the guidelines and leaves the
model guessing from the examples alone.

_from scripts/ollama.ts:116_

Whether the server is up and has the model, checked once before a batch so a
run of two hundred phrases fails in the first second rather than the first
inference. Returns the problem as a string, or null if everything is ready.

### `src/antonyms.ts`

_from src/antonyms.ts:3_

Word pairs where negating one word yields the other, so that "not harmful"
can be reported as "harmless".

This table used to arrive on the token as `misc.antonym`, supplied by the
artisan dictionary. artisan stopped storing the pairings (it keeps antonyms only as
vocabulary, to learn which words exist and what part of speech they take), so
enlint owns the data now. That is the better arrangement anyway: which
negations are worth rewriting is an editorial judgement, and the input
contract in ./types/input.ts stays free of a field only one provider ever
supplied.

Antonyms are keyed by lemma and then by part of speech, because the pairing
often holds for one reading of a word and not another: "favored" as an
adjective has "unfavored", but as a verb it has no single opposite, and
reporting one would produce nonsense.

Deliberately absent are negations whose opposite is ambiguous or gradable:
"not freezing" is not "hot", and "not leave" is not "stay". Words that are
already lexicalized negatives ("illegal", "amoral", "impossible") are also
absent, so "not illegal" is left alone.

"know" used to be here, paired with "ignore". It is the same mistake one
step further in: "ignore" is to pass over something deliberately, and not
knowing is the absence of the knowledge, not a decision about it. "He
somehow didn't know when to stop" came out as "He somehow ignored when to
stop", which says he knew.

### `src/compile-queries.ts`

_from src/compile-queries.ts:4_

Turns a list of queries into a form that can be run against a sentence
without touching every query.

Two things happen here, and both are pure preparation: nothing in this file
decides whether a query matches, only which queries are worth asking.

1. Every selector is parsed once, at compile time. `queries-to-errors` used
   to hand selector strings to `query-parse`, which called `cssWhat.parse` on
   each of them for every sentence in the document. On a 259-sentence
   document and the 352 no-bad-words entries that is 91,000 parses of 352
   distinct strings, and it accounted for 46% of the rule's runtime.

2. Each query is indexed by the words it cannot match without, so a sentence
   only runs the handful of queries its own vocabulary could possibly
   satisfy. See `requiredLiterals` for what "cannot match without" means and
   why the answer is always safe.

The effect of (2) is that cost follows the sentence rather than the rule
list: on the same document the average sentence goes from evaluating all 352
selectors to evaluating 0.17 of them, and adding rules no longer makes every
sentence slower.

_from src/compile-queries.ts:26_

Only `form` and `lemma` are indexed. The other attributes a selector can name
(`xpos`, `Mood`, `Number`, ...) come from a small enumeration, so nearly
every sentence carries nearly all of them and they would partition nothing.

_from src/compile-queries.ts:31_

Pseudo-classes whose argument is a list of alternatives, any one of which
satisfies it. css-select accepts all three spellings; no-bad-words uses
`:matches`.

_from src/compile-queries.ts:36_

Index keys are namespaced by attribute so that `[form=saw i]` and
`[lemma=saw]` do not collide, and lowercased because a selector may or may
not carry the `i` flag. Folding case here can only make the index match more
often than the selector does, which costs a wasted `selectAll` and never a
missed error; the selector itself still decides.

_from src/compile-queries.ts:52_

The literals a single compound chain requires. A chain is a conjunction —
`a > b > c` matches only if every part does — so literals from every compound
in it are required together, and the traversal tokens themselves contribute
nothing. A `:matches(...)` inside the chain is a disjunction, so it splits
the answer into one alternative per branch.

_from src/compile-queries.ts:61_

`action` is checked because `[form!=x]`, `[form^=x]` and a bare
`[form]` are all AttributeSelectors, and none of them requires the
token to carry that value. Only `equals` does.

_from src/compile-queries.ts:74_

A branch with no literal of its own can match on features alone, so the
disjunction as a whole requires nothing and is skipped. Crossing it in
would invent a requirement that is not there.

_from src/compile-queries.ts:86_

Everything else — `:not(...)`, `:has(...)`, tag and feature tests —
deliberately falls through as "requires nothing". Under-reporting a
requirement only makes the index run a query it did not have to; the
reverse would silently drop errors, so anything not understood here is
treated as unconstrained.

_from src/compile-queries.ts:95_

The words a selector cannot match without, as a list of alternatives: the
selector can only match a sentence that contains every literal of at least
one alternative. A comma-separated selector, like a `:matches`, contributes
one group of alternatives per branch.

An empty alternative means "no literal requirement", which is what makes a
query unindexable rather than what makes it never match.

_from src/compile-queries.ts:105_

Every word a selector names anywhere, without deciding whether the selector
needs it: inside `:not(...)`, behind `[form^=...]`, in any branch. This is
what "which rules mention this word?" wants, and it is deliberately a
different question from `requiredLiterals`, which may only ever report a word
the selector genuinely cannot match without.

The words come back bare and lowercased, with `form` and `lemma` collapsed
together, because someone looking up "delve" is not asking which of the two
the rule happens to test.

_from src/compile-queries.ts:161_

A query with an alternative that requires nothing could match a sentence
containing none of its literals, so it cannot be indexed and has to run
every time. There are none in the rules as they stand, which is exactly
why this branch is easy to forget: a future feature-only selector such as
`[xpos=VERB][Mood=Pot]` would otherwise land in no bucket at all and
never fire again. test/compile-queries.test.ts asserts that every query
ends up in one bucket or the other.

_from src/compile-queries.ts:173_

One key per alternative is enough. Which literal of the alternative is
picked does not matter for correctness — `candidates` re-checks the whole
alternative before running anything — so the first is taken rather than
the rarest, and no word-frequency table is needed.

_from src/compile-queries.ts:189_

The queries worth running against `tokens`, as indices into `queries`.

Returned in ascending order so that a sentence sees its queries in the order
they were declared, exactly as it did when every query ran. Overlapping
errors of the same width are resolved by declaration order in src/index.ts,
so leaving this to the iteration order of a Set would make the output depend
on which literal happened to be looked up first.

### `src/css-select-adapter.ts`

_from src/css-select-adapter.ts:3_

Custom adapter for css-select.

See:
https://github.com/fb55/css-select#custom-adapters
https://github.com/fb55/css-select/blob/1aa44bdd64aaf2ebdfd7f338e2e76bed36521957/src/types.ts#L6-L96

_from src/css-select-adapter.ts:11_

Typed rather than a bare `new Map()`: an untyped map is Map<any, any>, and
every adapter method that read from it produced an `any` that spread
through the rest of the file.

_from src/css-select-adapter.ts:40_

Selectors address the token's own properties, its features and its
position information under one flat namespace, so `[lemma=be]`,
`[xpos=VERB]` and `[Mood=Pot]` all work. Names are matched exactly:
`[mood=Pot]` finds nothing, because the feature is `Mood`.

_from src/css-select-adapter.ts:52_

`Person` is a number and `Poss` and `Reflex` are booleans, so those are
worth stringifying. Everything else that reaches here is an object —
`misc.children` is an array — and no selector can usefully match
"[object Object]".

_from src/css-select-adapter.ts:89_

A space is emitted only where the source had one, which is why the
offsets are compared rather than just joining on " ": "I 'love' it"
must come back with the quotes tight against the word. Nodes with no
misc offset produce NaN, and every comparison against NaN is false, so
they simply run together as they did before.

### `src/index.ts`

_from src/index.ts:75_

`defaults` decides which of these actually run. no-mixed-dialects,
no-noun-clusters and no-special-punctuation are off there:
they encode a house style rather than a general improvement, so they are
opt-in. They are still listed here so that turning one on in a config is all
it takes; no-noun-clusters in particular used to be commented out, which made
it impossible to enable at all.

### `src/queries-to-errors.ts`

_from src/queries-to-errors.ts:14_

Compiling a query list parses every selector in it, so it is done once per
list rather than once per document. The cache is keyed on the array itself
because that is what a rule owns: no-bad-words builds its `queries` once at
module load, and no-mixed-dialects builds one array per locale and returns
whichever the config asks for. A WeakMap rather than a Map so a caller that
does build query lists on the fly does not leak them.

_from src/queries-to-errors.ts:37_

Only the queries whose words the sentence actually contains. This is a
filter, not a decision: every surviving query is still run in full, so
the result is the same as running all of them.

_from src/queries-to-errors.ts:68_

Inflected first, then fitted to the sentence: whether the
article in front of the span still agrees depends on the sound
the replacement actually starts with, which is not known until
`:inflect` has been resolved.

### `src/query-parse.ts`

_from src/query-parse.ts:6_

`queries` arrive parsed rather than as selector strings: parsing them here
meant re-parsing the same strings once per sentence, which was 46% of the
runtime of no-bad-words. src/compile-queries.ts parses them once.

_from src/query-parse.ts:50_

The selector matched, so a sibling satisfying it should exist.
If the adapter cannot produce one there is no token range to
report, and guessing would put the error on the wrong words, so
the match is dropped. Previously `sibling` was implicitly `any`
and this threw.

### `src/repair-suggestion.ts`

_from src/repair-suggestion.ts:3_

Making a replacement fit the sentence it lands in.

A suggestion is a text edit: replace the matched span with this string. That
is enough when the span is a self-contained phrase, and wrong in four ways
that recur across the entry list, because a span is chosen to describe the
bad wording and the edit has to leave behind a grammatical sentence.

Deleting "at the end of the day" from "At the end of the day, we must ship"
leaves ", we must ship". Replacing "affluent" with "wealthy" in "an affluent
suburb" leaves "an wealthy suburb". Neither is the entry being wrong: the span
is exactly the words the writer should not have written. What is missing is
that the words immediately around a span are part of its grammar — the comma
that set the phrase off has nothing left to set off, and the article agrees
with a sound that is no longer there.

So this widens the edit to take in the words the replacement invalidated. It
is deliberately mechanical and deliberately timid: every case here is
decidable from the token stream, and anything else is left alone. A
replacement that needs the sentence restructured — "add a layer of
complexity to X" becoming "complicate X", where the preposition has to go —
cannot be repaired by widening, and an entry that needs that should carry a
`message` instead of a replacement.

_from src/repair-suggestion.ts:35_

The "that" in "it seems to me that the deadline slipped" is licensed by the
hedge in front of it, so deleting the hedge has to take it too or the sentence
opens with a subordinate clause and nothing to subordinate it to.

The same word can be the subject instead — "it seems to me that will work" is
about a particular thing — and artisan tags both as MARK, so the tag cannot tell
them apart. What tells them apart is what follows: a complementizer introduces
a clause and so is followed by its subject, while a demonstrative _is_ the
subject and is followed by the verb.

_from src/repair-suggestion.ts:61_

The letters "h", "u" and "eu" are the reason this is a function and not a
regular expression. "an" goes before a vowel _sound_, and English spelling
does not reliably say which sound a word starts with: "a unique blend" and
"an unusual blend" are both correct, "an hour" and "a house" are both
correct. Rather than guess, this returns null for anything it cannot settle,
and a null means the article in the text is left exactly as the writer wrote
it. A replacement that keeps a wrong article is a cosmetic defect; one that
introduces a wrong article where the writer had it right is a regression.

_from src/repair-suggestion.ts:89_

Everything beginning "u" or "eu" is left alone: "a unique", "an umbrella",
"a European", "an eucalyptus tree" are all correct and indistinguishable
from the letters.

_from src/repair-suggestion.ts:140_

Worked out as token indices rather than offsets, because absorbing the
comma and absorbing the whitespace around it are two decisions about the
same boundary, and doing them in offsets let the second silently undo the
first.

_from src/repair-suggestion.ts:147_

A deleted phrase takes its punctuation with it. The comma in "In my
opinion, the policy will fail" belongs to the phrase being deleted, not
to the clause that survives, and the same comma appears on both sides
when the phrase is parenthetical: "The policy, for the most part,
reduced overhead" has to lose both or it reads as a comma splice.

_from src/repair-suggestion.ts:160_

Only when the span runs to the end of the sentence. A comma to the left
of a span with a clause still to come after it may well belong to
whatever came before: the comma in "After reviewing the data, it is
clear to me the strategy failed" closes the introductory clause, and
taking it out with the hedge would run two clauses together.

_from src/repair-suggestion.ts:168_

A complementizer the deleted phrase licensed goes with it. Only at the
start of a sentence: mid-sentence the clause it opens usually still has
something to attach to.

_from src/repair-suggestion.ts:175_

One side's whitespace goes with it, or the deletion leaves a gap. Which
side does not matter except at a sentence boundary, where there is only
one to take.

_from src/repair-suggestion.ts:188_

"In my opinion, the policy will fail" must not become "the policy will
fail". The next word inherits the sentence's opening capital, which means
taking it into the edit, since a suggestion can only rewrite what its
range covers.

Only when the deleted phrase was itself capitalized. A caller may be
linting a fragment rather than a sentence, and if it did not capitalize
the opening word neither should this: "the fact that he left" is a noun
phrase, and "He left" would be asserting something about it.

_from src/repair-suggestion.ts:212_

A replacement that brings its own determiner cannot be dropped in front of
the sentence's: "the multifaceted nature" replaced by "the complex quality"
would read "The the complex quality". The sentence's determiner is the one
that goes, because the replacement was written with its own.

### `src/rules/no-absolute-phrases.ts`

_from src/rules/no-absolute-phrases.ts:4_

Whether a token could be the non-finite predicate of a floating
participial/absolute clause. "Part" covers gerunds and irregular past
participles ("trembling", "broken"); regular past participles ("crossed",
"closed") share their surface form with the simple past and so carry no
VerbForm at all -- Tense=Past with VerbForm left unset is artisan's own
convention for that ambiguity (see e.g. `verbsAreCompatible` in the artisan
package), which this mirrors. VerbForm=Fin rules a token out outright: the
tagger only commits to that when it has positively resolved the word as
finite.

_from src/rules/no-absolute-phrases.ts:18_

A trailing reporting clause -- "he said" tagging a line of dialogue or
paraphrased speech onto the end of the sentence it belongs to ("He just
changed, he said.") -- has the exact shape of a right-floating absolute
phrase: tense-ambiguous ("say"/"said"/"said" share a form the way
"cross"/"crossed"/"crossed" do), its own pronoun subject, comma-adjacent.
What makes it a different construction is meaning, not structure: "he
said" doesn't describe or accompany the main clause's action the way an
absolute phrase does, it reports the main clause itself as the thing that
was said, with the "that" understood ("he said [that] he just changed").
There's no structural test for that distinction, so this is a closed list
of the common verbs of speech and thought this pattern is built on.

_from src/rules/no-absolute-phrases.ts:66_

The defining feature of an absolute phrase, as opposed to any ordinary
participial modifier: the participle has its own subject, distinct from
the main clause's. "Fingers crossed tightly" is "Fingers" + "crossed", a
complete (if non-finite) subject-predicate pair standing outside the main
clause -- that pairing is what makes it read as its own clause in the
first place, forcibly, which is the actual complaint this rule makes.
A participle with no subject of its own is instead either a normal
gerund/infinitive complement of something else in the sentence ("no point
perfecting a sentence", "meant deciding in advance") or a dangling
modifier that shares the main clause's subject ("Pressing her back
against the wall, she listened" -- "she" is presses, not some separate
subject "Pressing" governs) -- a real style issue in its own right, but a
different one, and not what was producing the false positives here.

A NOUN child carrying any PronType is excluded even though it passes the
tag check -- it is a pronoun standing in for a noun, not a noun. That rules
out the relative/subordinating case ("when", "which") the tagger forces to
NOUN -- artisan's spec keeps relative adverbs like "when" as MARK, but a rule
vetoes that reading in some contexts, and the feature survives the mistag
even though the xpos doesn't, so "when using CTB" reads as a bare
subordinate clause ("when [you are] using CTB"), not an absolute phrase
with "when" as using's subject. But it also rules out every ordinary
personal, indefinite and totive pronoun ("they", "others", "each", "it"),
and that exclusion is doing the heavier lifting: a genuine absolute-phrase
subject is always a full NP -- "Fingers", "his hands", "arms" -- because
the construction's whole job is to introduce a subject the main clause
hasn't already named. A pronoun, by contrast, always refers back to
something already established, and pairing one with a tense-ambiguous
predicate is the shape of a second independent clause, not a floating
aside: "some faces altered with greed, others paled with disappointment"
is two clauses in asyndetic parallel ("some X, others Y"), "they sat in
the senate, they presided in the councils" repeats its own subject rather
than introducing a new one, and "it being Christmas Eve and all" is a
pronoun tag on a clause the speaker already started, not a description
bolted onto it. None of the 24 genuine positives this rule was verified
against use a pronoun subject; this exclusion has no false negatives to
weigh against the false positives it removes.

A genuine absolute-phrase subject is a bare NP, never a clause wearing a
noun's tag. "the greater the prediction error, the more elevated the
anxiety levels, providing a novel explanation" attaches the whole
comparative-correlative construction ("the [X]er ..., the [Y]er ...")
under "error" as its outer wrapper, and "error" in turn ends up a child of
"providing" -- structurally a subject, but not one a reader would ever
recognize as "providing"'s. A subject whose own subtree still contains a
verb or an internal comma is the head of some larger clause-like structure
that landed here for unrelated attachment reasons, not a simple nominal.

_from src/rules/no-absolute-phrases.ts:127_

Coordinators join the floating clause to the main clause as an equal
rather than setting it off as a comma-only aside: "she waited, and paced"
is ordinary coordination, not an absolute phrase, even though "paced" is
exactly as tense-ambiguous as "crossed" is in "she waited, arms crossed".

_from src/rules/no-absolute-phrases.ts:136_

A subordinate clause reads exactly like a floating participle whenever its
verb happens to be tense-ambiguous: "As Phelps departed the Olympic pool
..." has "departed" as root's child, comma-adjacent, with its own subject
"Phelps" -- every test above passes it. What marks it as a clause rather
than an absolute phrase is the leading marker "As" itself, attached to
"departed" as a child positioned before it. Not every such child
disqualifies: a genuine fronted adverbial phrase ("At the end of the day,
the reason ... is ...") has "At" as a child too, but "At" heads a noun
phrase of its own ("the end of the day") -- it has children. "As" and a
relative "which" are bare, nothing attaches to them; they hand their
clause's subject straight to the verb they introduce. A leading MARK
child with no children of its own is the bare-subordinator case; one
heading its own noun phrase is an ordinary adjunct and does not count.

_from src/rules/no-absolute-phrases.ts:162_

A coordinated list member the parser has hung one level deep, rather than
as a direct sibling of the participle under root: "some of them looked
confused, but many leaned forward" attaches "looked" to root and nests
"but" -> "leaned" underneath "looked" itself, rather than putting "leaned"
alongside "looked" as another of root's children. `hasParticipleSiblingCloserToRoot`
and the coordinator gap-check above only see coordinators between root and
the participle's own boundary, so a coordinator buried inside the
participle's subtree like this slips past both. What marks it as
coordination rather than an absolute phrase's own internal structure
("trembling and shaking", two participles sharing one subject) is that the
second conjunct is a full clause with a subject of its own ("many"), not
another bare participle riding on the same subject.

_from src/rules/no-absolute-phrases.ts:198_

Inclusive of `to`: the comma that sets a right-floating participle off from
the main clause is often the participle's own leftmost descendant (its
leading child) rather than a token strictly between the two, so `to` -- the
participle subtree's near boundary -- has to be checked too, not just what
falls strictly between it and `from`.

_from src/rules/no-absolute-phrases.ts:220_

A trailing absolute phrase is the last thing in its clause, and a fronted
one is the first -- that is what "floating" means here, as opposed to a
parenthetical dropped in the middle of one. A coordinated list item that
the parser has (wrongly) hung directly off the root, rather than off the
clause it actually belongs to, looks like a floating participle by every
other test in this file: tense-ambiguous, comma-adjacent, no coordinator
in the gap. What it does not do is sit at the edge of the sentence -- there
is always another substantive root child further out (the rest of the
coordinated list, in "the entering, leaving, and trans groups"). A bare
adverb is not "substantive" for this purpose: it is ordinary for one to be
attached to the root instead of to the participle it modifies ("his
fingers trembling slightly" hangs "slightly" off the root, not off
"trembling"), and requiring the participle to be the literal last child
would wrongly reject that.

_from src/rules/no-absolute-phrases.ts:257_

Whether the participle's own phrase is wrapped in quotation marks on both
sides ("'they changed the deal on us.'" in "... the moral-economy language
-- 'it's not fair,' 'they changed the deal on us.'"). A second illustrative
quotation set off from the first by a comma looks exactly like a floating
participle by every structural test above -- tense-ambiguous, its own
pronoun subject, comma-adjacent -- but it is a quotation being cited, not
prose the writer wrote as an absolute phrase.

_from src/rules/no-absolute-phrases.ts:268_

A run of coordinated participial complements the parser has (wrongly) hung
directly off the root, one per comma ("get demolished, renovated,
reassigned" -- three parallel complements of "get", no absolute phrase
anywhere), passes every check above once the run is long enough to clear
`isEdgeOfClause` on its last member: each is tense-ambiguous, each sits at
a comma, and there is nothing beyond the last one. What marks the
difference from a genuine floating participle is that a real one shows up
alone -- nothing else root-attached between it and the root looks like
another participle waiting to be read the same way. Only the run's first,
closest-to-root member is judged on its own merits; here, that is
"demolished", which fails the comma check for want of a leading comma and
so correctly reports nothing.

_from src/rules/no-absolute-phrases.ts:294_

Whether a comma sits right at the seam between the participle's own phrase
and the rest of the clause -- either inside the phrase as its outermost
token (the usual case: the comma is the participle's own leading or
trailing child) or immediately outside it. A comma elsewhere in the gap
back to the root does not count: "Airway Remodeling: Unlike COPD's
destructive remodeling, asthma features ..." has a comma, but it is the
one before "asthma", nowhere near "Remodeling" -- what actually sits next
to "Remodeling" is a colon, and "title returns to the family" /
"convert to W-2" (list-item labels followed by "-- explanation") sit next
to an em dash. Neither marks off a floating participle; both mark off
something else (a heading, a label) that only happens to precede a
comma-bearing sentence somewhere further along.

_from src/rules/no-absolute-phrases.ts:319_

A participle floating either side of the main verb, set off from it by
nothing but a comma: "his fingers trembling slightly" trailing the clause,
or "Fingers crossed tightly" fronting it. Only the root's direct children
are considered -- a participle hanging off an object noun instead ("a
letter, translated into French") is modifying that noun, not the clause,
which is a different construction from the one this rule targets.

The comma count between the root and the participle must be odd, not just
non-zero: a paired aside ("was, in effect, trying") puts an even number of
commas in that gap, and the one immediately in front of the participle is
then closing the aside rather than setting the participle off from the
clause -- the same parity artisan's own `belongToTheSameClause` reasons from.

### `src/rules/no-bad-words.ts`

_from src/rules/no-bad-words.ts:4_

Every word and expression enlint flags on sight, in one list.

These were nine separate rules (no-cliches, no-empty-phrases, no-formalisms,
no-hedging, no-personal-opinion-phrases, no-redundancies, no-explained-verbs,
no-inelegant-variations, no-ai-writing). Splitting them meant that answering
"is this expression already covered?" took nine greps, and the same phrase
could plausibly belong to two or three of them. They are one rule now.

The list is sorted by `phrase`, ignoring a leading article, so it can be
scanned or bisected by eye. test/rules/no-bad-words.test.ts enforces that
ordering, the absence of duplicate phrases, and that every selector only
addresses attributes the input contract actually defines.

docs/no-bad-words.md is generated from this list by `npm run build-docs`.
Edit the entries, then regenerate; never edit the markdown directly.

_from src/rules/no-bad-words.ts:20_

Why an expression is on the list. This picks the default message and groups
the generated documentation, but it does not affect matching: every entry
reports the same `no-bad-words` id.

_from src/rules/no-bad-words.ts:35_

The expression in plain English, as a reader would say it. This is the
sort key and the heading in the generated docs, not something matched
against text: `selector` does the matching.

_from src/rules/no-bad-words.ts:42_

Replacements for the whole matched span. `:inflect(lemma)` is substituted
with the lemma inflected to agree with the first matched token. A single
empty string means the expression should just be deleted.

_from src/rules/no-bad-words.ts:49_

The selector, and usually the whole entry, was written by a language model
from a list of phrases, and no person has checked it since. It marks the
entry as owing a review: the selector may match more or less than the
phrase it is named after, and a `suggestions` replacement may not be
grammatical in every sentence it fires on. Nothing about matching changes.
Drop the flag once a human has read the entry and agrees with it.

_from src/rules/no-bad-words.ts:77_

"Become dry" is "dry"; "get smaller" is "shrink". Thirty-one entries share
one shape — a copula, an adjective, and the single verb that already means
both — and each used to be written out in full, repeating its own
`:matches(...)` of copulas. As a table they fit on one screen, which is the
only way to notice that "become moist" is missing, or that two rows disagree
about which copulas take "strong".

The copulas are listed per row rather than shared across the family, because
the variation is real rather than an artifact of how these were written:
"make old" and "make pregnant" are not English, so "old" takes become/get/grow
and "pregnant" takes become alone.

_from src/rules/no-bad-words.ts:91_

The adjectives, separated by spaces. A trailing `*` matches any inflection
of the word rather than that exact form. Comparatives cannot use it: the
lemma of "blacker" is "black", which would also catch "become black".

_from src/rules/no-bad-words.ts:181_

Descendant, because "cause" is a sibling of "root" in the singular ("the
root cause of poverty", where artisan reads "cause" as the conjunction and
lemmatizes it to "because") and its parent in the plural ("the root
causes"). Anchoring on "root" alone catches both.

_from src/rules/no-bad-words.ts:281_

artisan nests this left to right — "as" heads "far", which heads the second
"as" — and the copula hangs under that, so the whole idiom is one chain
rather than the sibling pair the shape suggests. `[lemma=concern]` rather
than the form so "as far as we are concerned" matches too.

_from src/rules/no-bad-words.ts:477_

"more" heads "than", not the other way round. The forms are spelled out
because artisan reads "bit" as the noun, lemma "bit", so `[lemma=bite]` misses
the past tense — which also costs the inflection its tense, and "He bit
off more than he could chew" comes back as "He overextend".

_from src/rules/no-bad-words.ts:736_

Descendant rather than child: "delve deeper into" hangs "into" off
"deeper" rather than off the verb, so a child combinator matched only the
bare "delve into" and silently missed the more common padded form.

_from src/rules/no-bad-words.ts:1015_

No replacement: the "into" that usually follows hangs off "insight" and
survives the substitution, which would leave "we learned into the
process".

_from src/rules/no-bad-words.ts:1049_

"in" lemmatizes to "inch", so it is matched by form. The chain is the
parse: "hang" takes "in", "in" takes "air", and "between" hangs off
"air" rather than off the verb.

_from src/rules/no-bad-words.ts:1358_

Anchored on the noun rather than on "leave", because artisan attaches a past
tense "left" below the noun ("left an indelible mark") and a present
tense "leaves" above it. Matching the adjective catches both, and also
the forms with no verb at all ("the lasting effects of the war").

_from src/rules/no-bad-words.ts:1428_

Descendant: the adjective hangs off the object ("makes the data
accessible") or off the verb ("make learning accessible") depending on
how artisan reads the object.

_from src/rules/no-bad-words.ts:1484_

A descendant combinator, which the rest of the list avoids, because artisan
attaches the discourse marker at a depth that varies with the clause it
introduces. It still discriminates: in "more specifically targeted tests"
the two words are not on one path, and the rule stays quiet.

_from src/rules/no-bad-words.ts:1494_

Narrower than "profound" on purpose, and here for the span: the broad
rule replaces one word, so "the most profound change" came out as "the
most deep change". This one takes "most" with it.

_from src/rules/no-bad-words.ts:1582_

One rule for four phrasings of the same move: "provide a valuable
insight", "offer a valuable lesson", "present a unique challenge",
"offering a unique perspective". The bare "provide insight" entry stays
for the form with no adjective.

_from src/rules/no-bad-words.ts:1935_

"on" is a sibling of "light" rather than its child, and it has to be
inside the span: replacing only "sheds light" leaves "explains on the
problem".

_from src/rules/no-bad-words.ts:2031_

artisan reads "a step forward" with "forward" as the head noun and "step"
below it, the opposite of "a step toward". The NOUN test on "forward"
also keeps the literal verb out ("she stepped forward").

### `src/rules/no-explained-antonyms.ts`

_from src/rules/no-explained-antonyms.ts:28_

"not" + verb + antonym pattern check.

The negation hangs off the verb but belongs to the predicate the
verb links to, as in "it will not be easy" => "it will be hard" or
"he does not seem careful" => "he seems careless". That reading only
holds when the sibling is the predicate itself, which in this tag
set means an adjective or an adverb. A MARK sibling is a preposition
or a conjunction introducing a phrase of its own, and there the
negation is on the verb rather than on what follows it: "I don't
feel like I owe you" is not "I feel unlike I owe you". Whatever
"don't feel" negates, it is not "like".

_from src/rules/no-explained-antonyms.ts:64_

"does not like" becomes "dislikes", so the auxiliary carrying the
tense has to be found and swallowed by the replacement: it is what
supplies the person and number the antonym must be inflected to, and
leaving it behind would produce "she does dislikes".

This used to look only at the negation's grandparent, on the
assumption that the auxiliary heads the verb it negates. artisan no
longer parses it that way — in "But I don't know", "don" hangs off
the conjunction and "know" is the root, so the grandparent is -1 and
the auxiliary was missed entirely. The token immediately before the
negation is the reliable place to look, since that adjacency is what
a contraction like "don't" or "can't" is.

_from src/rules/no-explained-antonyms.ts:89_

A negated verb is only worth rewriting inside a finite clause that
has the auxiliary to prove it: "she does not like that" becomes "she
dislikes that" because "does" says who and when. Without one there
is no tense to inflect to and usually no clause either — "Not like
that." is a fragment where "like" is a preposition the tagger read as
a verb, and the rewrite came out as "Dislike that.". The reading that
would earn the rewrite is "I do not like that", and that sentence has
the auxiliary.

### `src/rules/no-mixed-dialects.ts`

_from src/rules/no-mixed-dialects.ts:800_

TODO: This causes a false positive in the following sentence: "crushing me flat"
{
selector: "[lemma=flat][xpos=NOUN]",
suggestions: [":inflect(apartment)"],
"en-US": true,
"en-CA": true,
},

### `src/rules/no-noun-clusters.ts`

_from src/rules/no-noun-clusters.ts:9_

ASD-STE100 rule 2.1 allows clusters of at most three words, so four is
the first violation. The cluster is this noun plus its left children,
so three children is four words. The test was `> 3`, which counted the
children as if they were the whole cluster and let every four-word
cluster through.

### `src/rules/no-passive-sentences.ts`

_from src/rules/no-passive-sentences.ts:145_

No Number on the head of the phrase. artisan marks it on any noun whose form
says which it is, so what reaches here is the words where the form does
not: proper nouns ("Sarah"), and numbers standing in for a noun ("by
paragraph six"). Both are singular far more often than not, and the cost
is asymmetric — the verb is only inflected for number in the present
third person, where guessing plural gives "Sarah write the report" and
guessing singular gives "Sarah writes the report".

This used to read the article instead: an agent with "the" in front of it
was singular and a bare one was plural. That test never saw a real plural,
because a real plural has Number on it and returned above; all it ever
classified was the proper nouns, and it got every one of them wrong.

_from src/rules/no-passive-sentences.ts:221_

The negation that makes the active rewrite need do-support, as in
'is not impressed' => 'does not impress'.

It is not always a direct child of the verb. In "isn't yet shared" the parse
hangs "not" off "yet" and "yet" off "shared", so looking only at the verb's
children missed it: the sentence got do-support from
getLeftVerbComplementString, which searches the subtree, while the verb
itself was inflected to agree with the subject, giving "does not yet
shares". Both now ask the same question of the same subtree.

_from src/rules/no-passive-sentences.ts:370_

Words that make a "by" phrase a deadline or a place in the text rather than
the agent of the passive. "The work is done by Friday", "sales are doubled by
2030" and "the description is done by paragraph six" all have the shape this
rule looks for, and turning one of them around says the date did the work:
"Friday does the work", "2030 doubles sales", "Paragraph six does the
description".

A passive whose "by" phrase is one of these is agentless as far as the
rewrite is concerned, and agentless passives are already left alone, so the
sentence goes unreported rather than reported with a rewrite nobody can use.

The list is deliberately short and literal: every word on it names a moment,
a span of time, or a position in a document. Words that also name something
that can act are left off even where the temporal reading is the common one
— "held by a spring", "killed by the fall", "caused by line 42", "reviewed
by the panel" — because suppressing those costs a rewrite the writer wanted,
while suppressing a real deadline costs nothing. The long durations go the
same way: a deadline is written "by the end of the decade", where the head
is "end", but a stretch of time acting on something is written "its rim is
worn by decades of small conversations", and that is a sentence worth
turning around. Vaguer non-agents ("by design", "by hand", "by force") are a
different mistake and are not addressed here.

_from src/rules/no-passive-sentences.ts:462_

Whether the phrase after "by" names a time or a place in the text rather
than something that could have acted.

The head of the phrase is asked first, because that is what the phrase
names. "A few night disappearances" has a listed word in it and is still an
agent: what it names is the disappearances, and "night" only says which ones.

A head artisan gave no Number to is the other case. Every noun whose form says
singular or plural has one, so what is left is names ("Sarah") and numbers
("six", "2030") — and a number names nothing on its own. A number alone is a
year; a number counting a listed word is a place in the text, as in "by
paragraph six", where artisan hangs "paragraph" off "six". A number counting
anything else stays an agent: "by line 42" is a cause worth turning around,
and "Line 42 causes the bug" is the rewrite.

_from src/rules/no-passive-sentences.ts:545_

A proper noun keeps its capital when it moves from subject to object:
"Spain was visited by many tourists" becomes "Many tourists visited Spain",
not "...visited spain". The tag set folds proper nouns into NOUN so there is
no PROPN to test, but the lemma preserves the casing — "Spain" and "Cthulhu"
against "the" and "abyss" — which is enough to tell them apart.

_from src/rules/no-passive-sentences.ts:559_

The subject's subtree can run to the comma that separated it from the rest
of the sentence, as in "All his choices, all his surroundings, have been
determined by...". That comma joins the subject to what followed it, so
carrying it into the rewrite leaves a stray "...all his surroundings,".
Closing quotes and brackets are part of the phrase and stay.

### `src/rules/no-special-punctuation.ts`

_from src/rules/no-special-punctuation.ts:11_

An en dash is a hyphen wearing a costume. Nothing it does needs a dash: in
"50–70%" it is punctuating a range, which is a hyphen's job, and telling a
writer to rewrite the sentence around it is advice about a sentence that has
nothing wrong with it. So it is swapped for the character it was standing in
for, wherever it appears — there is no clause to move and nothing about the
sentence to weigh, which is why this answers before the tests below.

_from src/rules/no-special-punctuation.ts:43_

The dash itself, not the gap in front of it. Every other rule reports
the span of what it objects to, and a zero-width one cannot be quoted,
marked under an excerpt, or named to a model as the words to deal with.

### `src/testing.ts`

_from src/testing.ts:13_

The seam between the lean library and tooling that needs to see inside
`no-bad-words`: a consumer that wants to test one entry in isolation, or
check how narrowly its selector is written, rather than only calling
`lint()` over the whole rule set. Nothing here is new logic — it is the
same pieces `scripts/entry-*.ts` already use internally, reachable from
outside the package for the first time.

The verified example sentence for each entry — what `npm run examples`
writes to test/fixtures/no-bad-words-examples.json — is deliberately not
re-exported here: bundling it would mean a JSON import reaching outside
`src/`'s rootDir. A consumer that needs it, such as a robustness audit,
reads that file directly.

_from src/testing.ts:41_

Run one no-bad-words entry, and nothing else, over already-parsed
sentences. The rest of the list is deliberately absent: this judges
whether the entry fires, not whether some other rule would have caught the
text first.

_from src/testing.ts:51_

Which literal words (or lemmas) an entry's selector cannot fire without,
one set per alternative branch of the selector: it can only match text
containing every word of at least one of them. Flattening the branches
would make a `:matches(...)` of several words look like it needs all of
them at once, which is not what the selector says.

### `src/types/index.ts`

_from src/types/index.ts:1_

The types enlint exposes to callers, plus the internal shapes the rule
engine passes around. The structured text enlint consumes is described
separately in ./input.ts, which is the contract an NLP provider must meet.

_from src/types/index.ts:40_

The identifier reported on every lint error and used as the config key that
enables or disables the rule that produced it.

A const object rather than an enum: enum members are nominally typed, so
callers could not write `{ id: "no-bad-words" }` without importing this
module, and neither could the tests. The union below is structural, so the
string literal is the type.

_from src/types/index.ts:89_

A rule expressed as a css-select query over the dependency tree rather than
as code. `selector` addresses `form`, `lemma`, `xpos` and the members of
`feats` and `misc` as attributes; see src/query-parse.ts.

Each entry in `suggestions` replaces the whole matched span. The token
`:inflect(lemma)` within a suggestion is substituted with `lemma` inflected
to agree with the first token of the match, so a replacement for "utilized"
can be written once as ":inflect(use)" and come out as "used".

_from src/types/index.ts:109_

A list of queries prepared for matching: every selector parsed once, and an
inverted index from the words a selector requires to the queries requiring
them. Built by src/compile-queries.ts, which documents what goes into it.

`parsed`, `required` and `queries` are all indexed in parallel, so a query
index means the same thing in all four fields.

_from src/types/index.ts:127_

A token as the css-select adapter sees it. css-select addresses attributes
by string name, so the adapter needs an index signature that `ParsedToken`
deliberately does not have.

### `src/types/input.ts`

_from src/types/input.ts:1_

The structured-text contract enlint consumes.

enlint does no natural language processing of its own. It takes text
that some other component has already tokenized, tagged and dependency
parsed, and matches rules against that structure. This file is the whole
interface between the two: if a provider can produce `ParsedToken[][]`, it
can drive this linter.

The types here are deliberately declared as string literal unions rather
than TypeScript enums. An enum is a nominal type, so `AdpType: "Prep"` from
a provider is _not_ assignable to an enum member that happens to equal
"Prep", and every provider would need to import our enums to type-check.
Unions are structural, so a provider that emits the right strings satisfies
this contract without depending on enlint at all.

The taxonomy matches the `artisan` library (the current provider), but only the
subset enlint actually reads is reproduced. See docs/input-format.md
for the prose version of this contract, including which artisan fields are
deliberately absent and why.

_from src/types/input.ts:21_

The part-of-speech tag set: eight functional tags describing the job a word
does in the sentence, not its dictionary class. This is not Universal
Dependencies. Determiners and other pre-nominal modifiers are ADJ, pronouns
(including relative pronouns) are NOUN, numbers are NOUN, prepositions and
conjunctions are both MARK, and modals, auxiliaries and copulas are all
VERB. There is no DET, ADP, SCONJ, CCONJ, NUM, PRON, PART, PROPN, AUX or SYM.

A provider with a finer-grained tag set must fold it into these eight before
handing tokens over. Rules select on `xpos` constantly, so a mismatch here
silently disables large parts of the linter rather than failing loudly.

_from src/types/input.ts:45_

The only morphological case left in English: "we" (Nom) against "us" (Acc).
Rewriting a passive into the active swaps the two, so a provider that leaves
Case off will produce "Him pestered they".

_from src/types/input.ts:50_

Mood is only present on modal verbs: potential ("might"), necessitative
("must") or conditional ("would"). The indicative is left unmarked, so an
absent Mood is meaningful and rules test for it.

_from src/types/input.ts:79_

The morphological features enlint reads. Every one is optional: a
provider that cannot determine a feature must omit it rather than guess,
because several rules treat an absent feature as a distinct signal from a
present one (an unmarked Mood means indicative, for example).

The artisan library also emits `ConjType`, `NumType`, `Poss` and `Reflex`. No
rule reads them, so they are not part of this contract. A provider may
include them; they are ignored. Adding one here means a rule started
depending on it, and every provider must then supply it.

_from src/types/input.ts:100_

Positional information about the token within the original text.

The artisan library carries considerably more here (`pos`, `f`, `fused`,
`isUnit`, `isOpaque`, `prepPairs`, `parentDirection`). Those describe how
the parse was arrived at, which is the provider's business, not the
linter's. Only `at` and `children` are required.

_from src/types/input.ts:107_

Zero-based character offset of the token's first character in the original
text. Every lint error range is computed from these, so they must index
the exact string the caller passed in: no normalization, no re-encoding,
no stripping of whitespace. `at` plus `form.length` must land on the
character after the token.

_from src/types/input.ts:118_

One token of a dependency-parsed sentence.

Providers may attach further properties; enlint reads only these, and
rule selectors can address any of `form`, `lemma`, `xpos`, the members of
`feats` and the members of `misc` by name.

_from src/types/input.ts:124_

Index of this token within its sentence. Callers index sentences by id
directly, so ids must be dense, zero-based and in surface order:
`sentence[n].id === n`.

_from src/types/input.ts:128_

The token exactly as it appears in the source text, with original casing
and no normalization. Error ranges and contraction handling both measure
this string, so substituting a normalized form corrupts the offsets.

_from src/types/input.ts:132_

Dictionary form. Optional because a provider may not resolve every token,
but rules that select on `lemma` cannot fire without it, so omitting it
broadly degrades the linter rather than breaking it.

_from src/types/input.ts:136_

Id of this token's syntactic head, or -1 for the sentence root. Exactly
one token per sentence must have `head === -1`; enlint locates the
root by scanning for it and several rules return early when it is absent.
The head graph must be acyclic.

_from src/types/input.ts:146_

A document as enlint consumes it: sentences, each an array of tokens
in surface order. Sentence segmentation is the provider's responsibility.
Rules never look across a sentence boundary, so a provider that under-splits
(returning one sentence for a paragraph) will produce a parse whose single
root makes most structural rules miss.

### `test/compile-queries.test.ts`

_from test/compile-queries.test.ts:45_

The cases below are what keeps the index honest: anything that does not
pin a token to a specific word has to come back as "requires nothing",
because an invented requirement would silently drop errors.

_from test/compile-queries.test.ts:80_

The bucket that is easy to lose. A query with no literal requirement
cannot be indexed under any word, so if it is not collected into
`always` it lands nowhere and stops firing, with nothing to notice: it
simply never matches again.

_from test/compile-queries.test.ts:139_

The property the whole optimization rests on: filtering by required literals
never removes a query that would have matched. This checks it against the
real rule list on text chosen to make the rules fire — every entry's own
phrase — rather than on prose, where almost nothing matches and a broken
filter would still look correct.

_from test/compile-queries.test.ts:170_

Slashes mark alternatives in a phrase name ("become/get hot"), which
are not English; the first alternative of each is enough to make the
entry fire.

### `test/entry-triage.test.ts`

_from test/entry-triage.test.ts:6_

The four answers to "is this expression already covered?", which is the
decision `npm run add` makes before it spends an inference on anything.

Getting it wrong is expensive in both directions: a false "covered" silently
drops a phrase somebody asked for, and a false "new" adds a rule that can
never say anything the rule above it does not already say. Neither shows up
anywhere else — the list would simply grow a redundant entry, or not grow at
all.

_from test/entry-triage.test.ts:16_

The invariant that covers the most ground: an expression that is already an
entry has to come back covered, because the entry needs no word the phrase
does not contain. Running it over the whole list tests the vocabulary
comparison against 285 real selectors rather than a handful of made-up ones.

Phrases carrying `/`, `(` or `*` are left out: those are notation for the
reader ("emphasize/underscore/highlight the need/potential", "endeavor
(noun)"), not sentences, and parsing them as English is meaningless.

_from test/entry-triage.test.ts:26_

This used to carry three exceptions — "send shockwaves" and the two "heart
pounding" phrases — whose lemmas came out differently when artisan read them on
their own than when it read them in a sentence. The fix landed in artisan, so
the list is empty and the invariant now holds outright. Keep it that way: an
exception added here is a phrase `npm run add` would wrongly treat as new.

_from test/entry-triage.test.ts:57_

The entry is `:matches([lemma=utilize], [lemma=utilise], ...)`. Flattening
those branches into one set makes the rule look like it needs every word
in all of them, and a candidate matching one branch exactly then reads as
narrower than the rule that already covers it.

### `test/index.test.ts`

_from test/index.test.ts:12_

no-mixed-dialects is off in `defaults`, so "The colour faded." reports
nothing even though the default locale is en-US. The test that turns the
rule on reports the same sentence.

### `test/nlp.ts`

_from test/nlp.ts:1_

The tests parse real text with the real artisan model rather than hand-building
token trees, so a change in artisan's tagging or parsing shows up here as a test
failure instead of as a surprise at runtime.

### `test/query-parse.test.ts`

_from test/query-parse.test.ts:120_

The cases are written as selector strings because that is how a rule
author writes them; query-parse itself takes them parsed, which is
what src/compile-queries.ts hands it at runtime.

### `test/repair-suggestion.test.ts`

_from test/repair-suggestion.test.ts:7_

The repair layer is only reachable through a suggestion, so it is exercised
the way it runs: a selector, a sentence, and the text applying the first
suggestion produces. Testing it through the engine also pins down the thing
that made these defects hard to see in the first place — that the span, the
inflection and the repair all have to agree.

### `test/rules/no-bad-words-examples.test.ts`

_from test/rules/no-bad-words-examples.test.ts:8_

Replays every example that `npm run add` verified when the entry was written.

The entries the harness produces are only as good as the parse they were
written against, and that parse is not fixed: artisan gets retrained, a lemma
changes, a word starts attaching to a different head, and a selector that
worked silently stops matching. No other test would notice. A rule that
matches nothing throws nothing, reports nothing and passes everything.

The fixture is data rather than a table in this file because `--apply` writes
to it, and a generated file that a script rewrites is easier to trust than a
script that edits a test.

_from test/rules/no-bad-words-examples.test.ts:46_

`verifyExamples` rather than the whole-draft `verify`, which also applies
the standards a _new_ entry is held to: at least two examples, and an
explicit replacement or message rather than the category default. Both are
right when a model is proposing an entry and wrong here. Fifteen entries on
the list deliberately fall back to their category's message, and an entry
with one verified example is better evidence than an entry with none —
neither is a reason to fail a replay. `npm run examples` reports both as
shortfalls, which is where that belongs.

### `test/rules/no-bad-words.test.ts`

_from test/rules/no-bad-words.test.ts:39_

The error runs to 13, the edit to 14: a deletion takes the space beside it
as well, or "the fact that he left" comes back as " he left". See
src/repair-suggestion.ts.

_from test/rules/no-bad-words.test.ts:67_

The entry list is the rule. These check the list itself rather than any
behaviour, because the failures they catch are silent: a selector naming an
attribute that does not exist matches nothing at all, and never errors.

_from test/rules/no-bad-words.test.ts:94_

Pairs where one entry needs a strict subset of another's words, so the
broader rule fires wherever the narrower one does. Every pair below was
read and kept, for one of two reasons:

span the narrower rule exists to swallow a preposition or a modifier
so that its replacement is grammatical. "delve into" becomes
"explore"; the broad "delve" rule only spans "delve", so merging
the two would produce "explore into".
advice the narrower rule gives specific guidance the broad one cannot,
and src/index.ts prefers the longer span, so it is the advice the
writer actually sees.

A new pair showing up here is not a failure so much as an unmade decision:
either the narrower rule earns its place for one of those reasons and
belongs in this list, or the broader rule already covers it and it should
be dropped. Nothing else in the suite would notice a rule that can never
say anything the rule above it does not already say.

_from test/rules/no-bad-words.test.ts:160_

The attributes a selector may name live in scripts/entry-verify.ts, which
is where `npm run add` checks a draft before writing it. Sharing the table
is the point: a draft rejected by the harness and an entry rejected here
have to be rejected for the same reason, or the harness produces entries
that fail the suite.

### `test/rules/no-explained-antonyms.test.ts`

_from test/rules/no-explained-antonyms.test.ts:116_

This used to report "don't know" => "ignore". Not knowing something is
the absence of the knowledge; ignoring it is a decision about it, so the
rewrite asserted the opposite of the sentence. The pairing is gone from
src/antonyms.ts and nothing is left to fire here.

_from test/rules/no-explained-antonyms.test.ts:130_

"like" is tagged VERB here and there is no auxiliary, so the clause the
rewrite would need ("I do not like that") is not in the sentence. The
old output was "Dislike that.".

_from test/rules/no-explained-antonyms.test.ts:138_

"don't" negates "feel"; "like" is the complementizer of the clause after
it, not the predicate. The old output was "I don't feel unlike I owe
you".

### `test/rules/no-passive-sentences.test.ts`

_from test/rules/no-passive-sentences.test.ts:348_

The sentence also opens with "At the end of the day", which
no-bad-words reports separately. Its edit runs past the error, to 27:
deleting the phrase takes the comma that set it off with it, and hands
the sentence's opening capital to the word that inherits the position —
the opening quotation mark does not count as the sentence starting. See
src/repair-suggestion.ts.

_from test/rules/no-passive-sentences.test.ts:478_

artisan gives a proper noun no Number. This used to read the article in
front of it instead and call an agent without one plural, which made
every name in the present tense come out as "Sarah write the report".

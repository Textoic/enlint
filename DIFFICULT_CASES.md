# Difficult cases

Cases another agent should pick up. Each one is a thing this repository asked
for that the parser, the tagger or the query engine cannot support yet, with
what was tried and where the wall is.

## 1. "single most important" cannot be spanned

**Asked for:** `single most important` → `crucial`, as one `no-bad-words` entry.

**The problem:** artisan does not connect "single" to the phrase it modifies. In
"The single most important factor is trust" the parse is

```
single  NOUN  head=is
most    ADV   head=important
important ADJ head=factor
factor  NOUN  head=is
```

"single" is tagged NOUN and attached to the root verb, so it is not an ancestor,
a descendant or a sibling of "important". No selector can span "single most
important", because a reported span runs from the leftmost matched token to the
rightmost and the two words have no path between them.

**What it needs:** "single" before a superlative is a determiner-like modifier
and should be ADJ, attached to the noun the superlative modifies. That is a
tagger decision, and the tagger is a trained perceptron plus grammar rules, so
the fix is either a grammar rule for `single` + superlative or a training
example. Neither was attempted here.

**Meanwhile:** `most profound`, `significant` and `importance` already cover
much of the ground this entry would have covered.

## 2. Verbs the dictionary does not know

**Asked for:** `operationalize`, `showcase`, `internalize` (and any other -ize
verb) as lemma-anchored entries.

**The problem:** `data/dictionary.json` in artisan has no entry for
"operationalize", and lists "showcase" as a NOUN only. An unknown word gets no
lemma and is tagged NOUN, so `[lemma=operationalize]` matches nothing and
`[lemma=showcase]` misses "showcasing" and "showcased". The lemmatizer's
`verbLemmaSuffixes` (`/(?:ise|ify|ate)$/`) does not include the American `-ize`
either, and even with it the `-ed` and `-ing` analyzers only resolve a stem the
dictionary already knows.

**What was done instead:** those entries enumerate the inflections by `form`,
which works but is verbose and misses forms nobody listed.

**What it needs:** either `-ize`/`-ized`/`-izing` handled in
`src/lemmatize/index.ts` as a productive verb suffix, or the words added to the
dictionary build. The first is the real fix; the second is a data change.

## 3. A verb still carries the features of its noun reading

**Partly fixed.** `parse` now corrects `Number` on a present-tense third-person
verb whose form is its lemma plus -s (see artisan's architecture log for
2026-08-30), because every `:inflect(...)` replacement on such a verb was
producing the bare lemma.

**What is left:** the underlying conflation. artisan's lemmatizer merges the noun
and the verb readings of a word into one feature bundle and the tagger's choice
never prunes it, so nouns come out carrying `Tense`, `VerbForm` and `Person`
("span", "phrase" and "trust" all do), and verbs carry a noun's `Number`.
`docs/tokens.md` says `Number` is a feature of a noun, so this is a
specification violation as well as a bug. Reconciling the bundle against the
chosen tag would move features under several rules at once, including
`no-passive-sentences`, which reads `Number` and `Person` on nouns for
agreement. It needs its own change with the corpus in front of it.

## 4. "begs the question" attaches to the wrong head in a long object

**Asked for:** `this begs the question` as a `no-bad-words` entry.

**The state:** the entry works — `[lemma=beg] > [lemma=question]` fires on "That
begs the question" and on "The result begs the question whether we should stop".

**The problem:** it misses "This begs the question of who pays", where artisan makes
"pays" the object of "begs" and hangs "question" under "pays" as its subject.
The phrase is the same; only the trailing "of who pays" moved the attachment.
This is the fragility `docs/adding-entries.md` §9 describes, and it is a parser
question rather than a selector one.

## 5. `marking/shaping the` fires on the subject as well

**Asked for:** `marking/shaping the`, written as a noun plus a determiner.

**The problem:** a selector cannot say "the noun that comes after the verb".
`:matches([lemma=mark], [lemma=shape]) > [xpos=NOUN] > [form=the i]` matched
both "The vote marked" and "marked the end" in the same sentence, because the
subject also has a determiner. The entry now anchors on the gerund forms
("marking", "shaping"), which is the shape the request named and which the
subject case cannot produce, but the general problem stands for any entry of
this shape: `boast a` has it too, and only avoids it because "boast" rarely
takes a determined subject.

**What it needs:** either an order-aware combinator in `src/query-parse.ts` (a
"child to the right of" step), or a rule-level filter. Both are engine changes.

## 6. "serve as" still fires when the tagger misreads a past-tense verb as a noun

**The entry:** `serve/stand/function/operate as` matches only when "as" heads a
noun — `... > [form=as i] > [xpos=NOUN]` — so a temporal clause is excluded:
"She stood as the anthem played" is quiet, because "played" is a VERB.

**The problem:** "He served the meal as the sun set" still fires, because artisan
tags "set" in "the sun set" as NOUN rather than as a past-tense verb. The entry
then sees a nominal object and offers "write 'is' or 'are'", which is wrong
advice for that sentence.

**What it needs:** the same thing case 1 needs — a tagger that reads "the sun
set" as subject plus verb. The entry gives advice rather than a replacement, so
the failure costs the writer a bad suggestion rather than broken text.

## 7. `:inflect(be)` produces "were" for a verb with no number

**Where it showed:** the first version of the `serve/stand/function/operate as`
entry replaced the span with `:inflect(be)`, and on "The tower stood as a
warning" it produced "The tower were a warning". artisan gives "stood" a `Tense` and
nothing else, and `inflectBe` in artisan reads `Person && Person !== 2 && Number ===
"Sing"` before it says "was", so an unmarked past verb falls through to "were".

**What was done instead:** that entry now carries advice rather than a
replacement, which sidesteps the question.

**What it needs:** either artisan giving a finite past verb the number of its
subject, or `inflectBe` defaulting to the singular when it knows nothing. Both
are decisions about artisan's feature model and belong with case 3.

## 8. The hardest centre-embedding is the one `no-nested-clauses` misses

**The rule works** on "The report that the analyst who the board hired drafted
was lost" and on the same sentence without the relativizers.

**The problem:** "The book that the student who the tutor praised recommended
sold out" reports nothing. artisan makes "book" the root of the sentence, tags
"sold" as an ADJ, and never gives the subject a head verb — so there is no
"between the noun and its verb" for the rule to look in. The parser fails on the
sentence in roughly the way a reader does, which is exactly the sentence the
rule exists to catch.

**What it needs:** a parse. This is the same class of problem as case 1: the
tagger and the transition parser, not the rule.

## 9. A list of bare nouns is tagged as verbs

**Where it showed:** `no-high-lexical-density` reports nothing for "Tea, coffee,
milk, sugar, bread and butter were on the list", which is 7 nouns in 11 words.
artisan tags "milk", "sugar" and "bread" as VERB and makes "milk" the root, so the
rule counts 4 nouns and finds 33%.

**Why it matters beyond this rule:** every rule that counts tags inherits the
error, and a comma list of noun/verb homographs is common in the kind of prose
this linter is aimed at.

**What it needs:** the tagger to use the coordination — a comma list whose other
members are unambiguous nouns should push the ambiguous ones to NOUN. That is a
feature in artisan's featurizer, not a rule change.

## 10. Word-level entries that a domain sense makes wrong

`catalyst` replaces the word with "trigger" or "cause", which is right for "the
strike was a catalyst for change" and wrong for "the platinum catalyst speeds up
the reaction". `realm` replaces with "area" or "field", which is wrong for a
king's realm. `landscape` says "if you mean a field or a situation rather than
scenery, say which", which is the same problem handled with advice instead of a
replacement.

These were asked for as word-level entries and they are filed as written, with
`automated: true`. The fix, if the false positives annoy, is the one the
`landscape` entry already uses: turn the replacement into advice, and let the
writer decide which sense they meant. A selector cannot tell the two senses
apart, because the tree is the same.

## 11. `is a reminder` and `represent/mark a shift` use a descendant step

Both need it. artisan attaches "reminder" under "of" in "was a reminder of how
quickly things changed" and directly under the copula in "is a reminder that
rules bind everyone", and it does the same to "shift" in "marked a shift in how
the paper covers science". A child combinator matches one and misses the other.

The cost is that a descendant step can cross a clause boundary: "He is my
brother and a reminder sat on the desk" reports the span "is my brother and a
reminder". `docs/adding-entries.md` §3 already limits descendant steps to
exactly this case, and there are now six in the list rather than four.

**What it needs:** a depth-limited descendant step in `src/query-parse.ts`, or a
combinator that crosses a preposition but not a clause.

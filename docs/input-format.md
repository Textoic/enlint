# The input format

enlint does no natural language processing. It takes text that something
else has already tokenized, tagged and dependency parsed, and matches rules
against that structure. This page is the contract between the two halves.

The types are in [`src/types/input.ts`](../src/types/input.ts), which is the
authority; this page explains the parts that a type cannot.

The current provider is the `artisan` library. Everything here is a **subset** of
what artisan emits, and it is deliberately a subset: a second provider should have
to supply only what the rules actually read.

## The shape

```ts
type ParsedText = ParsedToken[][]; // sentences, each an array of tokens

type ParsedToken = {
  id: number; // index within the sentence
  form: string; // the token exactly as written
  lemma?: string; // dictionary form
  head: number; // id of the syntactic head, -1 for the root
  xpos: PosTag; // one of eight functional tags
  feats: LexicalFeatures; // morphological features, all optional
  misc: { at: number; children: number[] };
};
```

Providers may attach more; enlint reads only these.

## What each field has to guarantee

**`id`** must be dense, zero-based and in surface order, so that
`sentence[n].id === n`. Rules index the array by id constantly and never search
for a token by id.

**`form`** must be the token exactly as it appears in the source: original
casing, no normalization, no unescaping. Two things depend on this. Error
ranges are computed as `misc.at + form.length`, so a substituted form puts the
error on the wrong characters. And casing is the only signal for proper nouns
(see the tag set below), so lowercasing forms makes "Spain was visited by many
tourists" rewrite to "many tourists visited spain".

**`lemma`** is optional because a provider may not resolve every token, but it
is not optional in practice: most entries in `no-bad-words` select on it, and
without lemmas the linter quietly finds much less. Lemmas of proper nouns keep
their capital (`"Spain"`), which is how the passive rewriter tells a proper
noun from a common one.

**`head`** points at the token's syntactic head, or `-1` for the sentence root.
Exactly one token per sentence must be the root. enlint finds it by
scanning for `head === -1`, and several rules return early when there is none,
so a sentence with no root is silently not linted. The head graph must be
acyclic; `parse-to-subtree.ts` walks it to the root and will not terminate
otherwise.

**`misc.at`** is the zero-based character offset of the token's first character
in the original text. This is the single most important field: every reported
range and every suggestion range is derived from it, and the caller applies
those ranges to the string it passed in. Offsets must index that exact string.

**`misc.children`** lists the ids of the token's dependents in any order, and
must agree with `head`: `tokens[t.misc.children[n]].head === t.id` for every n.

## The tag set

Eight functional tags: `NOUN VERB ADJ ADV MARK PUNCT INTJ X`.

Tags describe the job a word does in the sentence, not its dictionary class.
This is **not** Universal Dependencies, and the differences are where a new
provider will go wrong:

| Universal Dependencies                           | here   |
| ------------------------------------------------ | ------ |
| `DET`, and other pre-nominal modifiers           | `ADJ`  |
| `PRON`, including relative pronouns, and `PROPN` | `NOUN` |
| `NUM`                                            | `NOUN` |
| `ADP` (prepositions) and `SCONJ`/`CCONJ`         | `MARK` |
| `AUX`, modals and copulas                        | `VERB` |
| `SYM`                                            | `X`    |

There is no `DET`, `ADP`, `SCONJ`, `CCONJ`, `NUM`, `PRON`, `PART`, `PROPN`,
`AUX` or `SYM`. A provider with a finer-grained tag set must fold it into these
eight before handing tokens over.

Getting this wrong fails quietly rather than loudly. Rules select on `xpos`
throughout, so emitting `DET` for determiners does not raise an error; it just
means every selector mentioning `ADJ` stops matching.

Because proper nouns are folded into `NOUN`, the only way to recognize one is
its capitalized `lemma`. That is why `form` and `lemma` casing matters.

## Features

All optional, all read by at least one rule:

| Feature     | Values                                                                 | Read by                                                                           |
| ----------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `AdpType`   | `Prep`, `Post`                                                         | no-bad-words, no-mixed-dialects                                                   |
| `Case`      | `Nom`, `Acc`                                                           | no-passive-sentences                                                              |
| `Mood`      | `Pot`, `Nec`, `Cnd`                                                    | no-bad-words, no-explained-antonyms, no-passive-sentences                         |
| `Number`    | `Sing`, `Plur`                                                         | no-explained-antonyms, no-passive-sentences                                       |
| `Person`    | `1`, `2`, `3`                                                          | no-explained-antonyms, no-passive-sentences                                       |
| `PronType`  | `Art`, `Dem`, `Prs`, `Tot`, `Neg`, `Rel`, `Ind`                        | no-bad-words, no-high-lexical-density, no-negated-contrasts, no-passive-sentences |
| `PunctType` | `Peri`, `Qest`, `Excl`, `Quot`, `Brck`, `Comm`, `Colo`, `Semi`, `Dash` | no-negated-contrasts, no-passive-sentences                                        |
| `Tense`     | `Pres`, `Past`                                                         | no-absolute-phrases, no-explained-antonyms, no-passive-sentences                  |
| `VerbForm`  | `Fin`, `Part`                                                          | same as `Tense`                                                                   |

Two conventions that are easy to get backwards:

- An **absent** feature is meaningful. Mood is only marked on modals, so the
  indicative is unmarked and rules test for its absence. A provider that
  guesses a value where it does not know one will produce false positives.
- **Gerunds are present tense**: `Tense: "Pres"` with `VerbForm: "Part"`. Only
  irregular past participles ("taken") and gerunds ("taking") are `Part`;
  every other form is `Fin`.

artisan also emits `ConjType`, `NumType`, `Poss` and `Reflex`. No rule reads them,
so they are not part of this contract. A provider may include them and they are
ignored. Anything added to `LexicalFeatures` becomes something every provider
has to supply, so it should be added only when a rule genuinely needs it.

## What is deliberately not here

artisan's tokens also carry `misc.pos`, `misc.f`, `misc.fused`, `misc.isUnit`,
`misc.isOpaque`, `misc.prepPairs` and `misc.parentDirection`. Those describe
how the parse was arrived at — candidate tags, corpus frequencies, attachment
direction — which is the provider's business, not the linter's.

`misc.antonym` used to be part of this contract, and is the cautionary tale.
artisan supplied it from its dictionary, enlint's `no-explained-antonyms`
read it, and when artisan stopped storing antonym pairings the rule went silently
dead: no type error, no test that isolated it, just a rule that stopped finding
anything. Which negations are worth rewriting is an editorial judgement, so
that data now lives in [`src/antonyms.ts`](../src/antonyms.ts) where the rest
of enlint's editorial judgements live.

The lesson generalizes. If something is a **judgement about English usage**, it
belongs in enlint. If it is a **fact about this sentence**, it belongs in
the input.

## Selectors

Rules written as queries (`no-bad-words`, `no-mixed-dialects`) address tokens
with css-select syntax over the dependency tree, where `>` means "head of".
Attributes come from three places flattened into one namespace: the token's own
properties (`form`, `lemma`, `xpos`), its `feats`, and its `misc`.

```
[lemma=be] > [form=it i] ~ [form=clear i] > [form=to i] > [form=me i]
```

**Attribute names are matched exactly.** `[Mood=Pot]` works and `[mood=Pot]`
matches nothing at all — it does not error. Three selectors in the codebase had
this bug (`[mood=Pot]`, `[tense=Pres]`, `[verbForm=Part]`) along with one
naming a `PronType` value that does not exist (`[PronType=Int]`), and all four
had simply never matched anything. `test/rules/no-bad-words.test.ts` now checks
every selector's attribute names and values against the table above, so the
mistake fails a test instead of silently disabling a rule.

## Sentence segmentation

Splitting text into sentences is the provider's job. Each sentence is expected
to have exactly one root, so a provider that returns a whole paragraph as one
"sentence" produces a parse whose single root makes most structural rules miss.

Almost every rule works inside one sentence. The exception is
`no-negated-contrasts`, which reads the following sentence when the current one
ends in a `Semi`, because "X is not Y; it's Z" is one thought that artisan splits in
two. Offsets are absolute over the whole text, so a span may cross the boundary.

## Supplying your own parser

Implement `ParsedText` and call the default export:

```ts
import lint from "@textoic/enlint";

const errors = lint(yourParser(text));
```

`test/nlp.ts` and `scripts/nlp.ts` show the artisan wiring. Note that `src/` is
compiled with `"types": []` and cannot reach for a Node API, so loading a model
from disk is the host's problem, not the library's.

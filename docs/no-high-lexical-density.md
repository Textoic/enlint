# No High Lexical Density

Lexical density is the share of a sentence that carries content rather than
grammar. Past a point the reader has to hold too many things at once, and the
usual cause is a verb that has been turned into a noun and given modifiers.

> The implementation of the new policy framework required extensive
> consultation with regional stakeholder groups and a comprehensive assessment
> methodology drawn from prior work.

Half of that sentence is nouns and two thirds is nouns and adjectives together.
The rule measures three shares per sentence and flags it when any of
them is over its limit:

| Option                       | Default | What it measures                             |
| ---------------------------- | ------- | -------------------------------------------- |
| `nounPercentage`             | 40      | nouns, as a share of the words               |
| `adjectivePercentage`        | 20      | adjectives, as a share of the words          |
| `nounAndAdjectivePercentage` | 50      | the two together                             |
| `minimumWords`               | 16      | sentences shorter than this are not measured |

```js
lint(parsed, {
  ...defaults,
  "no-high-lexical-density": { nounPercentage: 45, minimumWords: 12 },
});
```

The denominator is every token that is not `PUNCT`. Pronouns and determiners
are excluded from both numerators, because the tag set folds them into `NOUN`
and `ADJ` and counting "it" and "the" as content would measure the opposite of
what the rule is for: the test is `feats.PronType`, which every pronoun and
determiner carries and no content word does.

`minimumWords` is not part of the measure; it decides which sentences are worth
measuring at all. Without it "Costs rose." is 100% nouns and every short
sentence in a document is an error. Set it to 1 to measure everything.

This rule is on by default. It reports the whole sentence and offers no
replacement, and `lint` only lets a problem supersede the ones it covers when it
carries a replacement of its own, so the shorter problems inside the sentence
are still reported.

## Shortening a sentence does not lower its density

The denominator is every word, so cutting a hedge or a modifier removes one word
from the bottom of the fraction and none from the top, and the share rises:

| rewrite of the same 25-word sentence  | words | nouns |
| ------------------------------------- | ----- | ----- |
| original                              | 25    | 56%   |
| the same thing said in fewer words    | 10    | 80%   |
| the noun stacks spelled out as claims | 30    | 30%   |

The fix is to unpack: name who does what to whom, and let the verbs and
prepositions that takes come back in. The sentence gets longer, and that is the
measure working rather than failing.

The same arithmetic is why `minimumWords` exists and why it is 16. A short
sentence has few grammar words to dilute its content words, so its share is high
whether or not it reads badly. Measured over a corpus of human writing, the
median noun share falls from 50% in sentences of four to seven words to 27% in
sentences of twenty-one to thirty. A single threshold cannot serve both ends,
so the rule declines to judge the short end rather than flag ordinary prose.

**This leaves a hole, and callers should know about it.** A dense sentence can
be pushed under the floor by chopping it into fragments, and the fragments can
be denser per word than the sentence they replaced:

> The department review process requires extensive documentation of budget
> allocation decisions, project milestone completion records, and quarterly
> performance assessment summaries.

> Budget allocation decisions need documentation. Project milestone completion
> records need documentation. Quarterly performance assessment summaries need
> documentation too.

The first is flagged; the three fragments are not, and they run at 78% nouns
against the original's 75%. Anything that rewrites text to clear this rule needs
a check the split cannot move, such as the noun share of the whole passage.

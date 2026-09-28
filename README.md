# Textoic

Textoic emulates a human editor that finds flaws in your writing and helps you fix them.

Whatever writing skill you have, at least in drafts you likely use many words and phrases that dilute or pollute your writing. You picked them up from other writers and spread them through your own writing, thinking they are normal, accepted or even good. Textoic saves your time by finding them and offering suggestions to replace them, making editing shorter and more effective.

## Getting started

```
npm install @textoic/enlint
```

This project is a library to build extensions on any product (i.e. Google Chrome, Google Docs, Microsoft 365, Visual Studio Code, etc.) that supports Javascript. The editing rules are decoupled from natural language processing so that any NLP solution can be used as long as its output follows [the input format](docs/input-format.md). The current provider is [artisan](https://github.com/Textoic/artisan).

You can test the library running the following command in a terminal:

```
npm run start "Your awesome text"
```

with any sentence. The output will be the list of problems found in the text in
JSON format: each one is a rule id, a span, a message, and — where the rule
has one — a mechanical replacement suggestion computed with no model involved.
That is the whole surface this library offers: rules in, problems and
suggestions out.

Linting a whole document (Markdown or plain text), turning those mechanical
suggestions into an LLM-written replacement, and reviewing a rule's behaviour
across a corpus are left to the code that calls this package.

### The rules

Every rule reports an id you can use to switch it off. Three are off by default
because they encode a house style rather than a general improvement: pass a
config to turn them on. That matters more than it looks. `no-special-punctuation` is the rule that objects
to the em dash, which is the single most model-skewed thing in the corpus — eight
times as common in a model's prose as in a person's — and until you ask for it,
nothing reports one. It objects to the two dashes differently: an em dash gets
advice, because what replaces it depends on the sentence, and an en dash gets a
hyphen, because that is what it was standing in for.

Rules compete for the text they report. `lint` lets a problem that offers a
replacement supersede every shorter problem it overlaps, so a long replacement
hides the word-level fixes inside it. A problem that only describes what is
wrong supersedes only shorter problems from its own rule, so the sentence-wide
`no-high-lexical-density` leaves every fix from other rules in place.

| Rule                                                             | Default | What it finds                                                   |
| ---------------------------------------------------------------- | ------- | --------------------------------------------------------------- |
| [`no-bad-words`](docs/no-bad-words.md)                           | on      | Every flagged word and expression, all 451 of them              |
| `no-absolute-phrases`                                            | on      | "We scrambled along the shore, the waves splashing at our feet" |
| `no-bad-sentence-structures`                                     | on      | "not just X but Y", over a shorter span than the rule below     |
| [`no-explained-antonyms`](docs/no-explained-antonyms.md)         | on      | "not harmful" for "harmless"                                    |
| [`no-explained-intensifiers`](docs/no-explained-intensifiers.md) | on      | "very bad" for "awful"                                          |
| [`no-high-lexical-density`](docs/no-high-lexical-density.md)     | on      | Sentences that are mostly nouns and adjectives                  |
| [`no-negated-contrasts`](docs/no-negated-contrasts.md)           | on      | "the span is the phrase, not a stray overlap"                   |
| [`no-nested-clauses`](docs/no-nested-clauses.md)                 | on      | "The report that the analyst who the board hired drafted"       |
| [`no-passive-sentences`](docs/no-passives.md)                    | on      | Full passives, with an active rewrite                           |
| `no-similes`                                                     | on      | "targeted like a missile"                                       |
| [`no-mixed-dialects`](docs/no-mixed-dialects.md)                 | off     | "colour" in American English, and the reverse                   |
| [`no-noun-clusters`](docs/no-noun-clusters.md)                   | off     | "stainless steel protection strips"                             |
| `no-special-punctuation`                                         | off     | Em dashes between two words                                     |

Two rules were removed on 2026-09-10: `no-complex-noun-phrases` and
`no-complex-verb-tenses`. Both reported ordinary prose far more often than bad
prose; [docs/architecture.md](docs/architecture.md) records why.

```js
import lint, { defaults } from "@textoic/enlint";

lint(parsed, { ...defaults, "no-mixed-dialects": true, locale: "en-GB" });
```

A config replaces the defaults rather than merging with them, so `lint(parsed, {})` runs nothing at all.

### Ignoring specific cases

Three rules work from a list of cases: `no-bad-words` (one case per
expression), `no-explained-intensifiers` (one per intensified word) and
`no-explained-antonyms` (one per negated word). Every problem they report
carries a `case` key, and `ignore` in the config drops matching problems
before the overlap resolution runs, so an ignored wide problem never hides a
narrower one:

```js
lint(parsed, {
  ...defaults,
  ignore: {
    "no-explained-intensifiers": ["dirty"],
    "no-bad-words": ["delve into"],
  },
});
```

Keys match without regard to case or surrounding space. The other rules report
no `case`, so the only way to silence them is to switch the rule off.

### The rule catalog

`@textoic/enlint/catalog` describes the rules for a settings screen:
`ruleCatalog` gives each rule's name, summary, description, default and
examples, and `casesOf(id)` lists the cases of a case-based rule with a label
and the replacements it offers.

```js
import { casesOf, ruleCatalog } from "@textoic/enlint/catalog";
```

`no-negated-contrasts` reports the same "not just X but Y" shape as
`no-bad-sentence-structures`, over a longer span, so with both on the newer rule
always wins the overlap and the older one is never heard. Decide which you want
and switch the other off.

One rule takes settings instead of `true`, and an object turns it on:

```js
lint(parsed, {
  ...defaults,
  "no-high-lexical-density": { nounPercentage: 45, minimumWords: 12 },
});
```

`no-high-lexical-density` measures each sentence three ways — nouns,
adjectives, and the two together, as a share of every token that is not
punctuation — against `nounPercentage` (40), `adjectivePercentage` (20) and
`nounAndAdjectivePercentage` (50), and ignores sentences shorter than
`minimumWords` (16).

### Adding words and phrases

`no-bad-words` is a list, and the list is never finished. Two commands work on it:

```
npm run lookup <word>            what the list already says about a word
npm run add "<phrase>"           triage it, draft an entry, verify it against artisan
npm run examples                 example sentences for entries that already exist
```

`add` answers the question `lookup` asks. It works out whether an existing rule
already covers the phrase, is narrower than it, or is the third rule to circle
the same word; asks a language model for an entry with the neighbouring rules in
front of it; and then refuses to keep that entry unless it fires on real
sentences, parsed by the real model, and its replacement produces the text it
claims to. A failure goes back to the model to repair. Nothing is written
without `--apply`.

`examples` does the same for entries that are already on the list, and writes
them to `test/fixtures/no-bad-words-examples.json`, which the suite replays. It
is both a regression test and the only practical way to review a list this long:
a selector is hard to judge, and "here is a sentence, here is what the linter
does to it" is easy. For an entry with `suggestions` the fixed text is computed
by running the rule rather than taken from the model, so the fixture shows what
the linter really does — including when that is wrong. `--report` prints the
review queue over the whole fixture and `--refresh` brings it back into agreement
with the code after a change; neither runs the model.

A harder question stays open. A selector names a tree shape, so an entry can
fire on its own example and miss the same expression written differently. No
check here catches that failure;
[docs/adding-entries.md](docs/adding-entries.md#9-how-much-the-fixture-proves-and-what-it-does-not)
describes how to test for it.

Inference runs against a local [Ollama](https://ollama.com) install, so nothing
leaves the machine and a batch costs nothing but time. The model is set with
`OLLAMA_MODEL` and defaults to `qwen3.8:27b`. The `--report` and `--refresh`
modes of `examples` use no model at all.

[docs/adding-entries.md](docs/adding-entries.md) is how to write an entry — the
reference for doing it by hand, and, read verbatim at run time, the prompt for
doing it with the harness.

An entry is written against a sentence somebody composed for it, which is the
right way to build a rule and the wrong way to find out what it does to text
nobody wrote for it. Before you trust a new entry, run the linter over real
writing and read what it reports.

## Why?

You will find this document useless if you want to:

1. Use many words to say nothing.
2. Write impenetrably.
3. Pad your writing to reach a target word count.

Before you laugh at any of those three points, think them through. Those three goals are the cause for much of the world's printed words. They plague people who communicate ideas, whether it's politicians who want to appear honest, posturing intellectuals who want social approval or writers working for someone else who imposes restrictions on their writing such as a minimum word count.

Textoic will help you if you want to:

1. Communicate ideas efficiently and effectively.
2. Spare the reader from ambiguity and confusion.
3. Remove fluff from your writing.

## Guidelines vs Rules

Any attempt to impose a style will always meet with three main problems:

1. Friction: The adopter has to destroy old habits and create new ones, but people disdain change.
2. Learning: The adopter needs to remember a set of guidelines and rules.
3. Enforcement: The adopter needs to actively apply these guidelines and rules while working.

I promise that the friction of these guidelines is worth the trouble because they will genuinely improve your writing. But what is interesting is what I can do about learning and enforcement.

You can find dozens of great books and articles on writing well. Their problem is that they are hard to remember and enforce. Even if you remember all the rules, it takes a lot of practice and effort to constantly remind yourself that you have to apply them. And you will still sometimes slip because we all have blind spots.

A nasty "the fact that" will sneak into one of your sentences. Then, while you are editing, it will feel natural, right even. Or you might write a dead passive like "The boat was sailed north" without realizing what you've done and have the chance to repent.

That is why I will focus less on the guidelines you should remember and more on the enforceable, automatic rules that will rid your writing of fluff.

## The guidelines

If you want to persuade, transmit ideas or tell a story, these are general principles that will improve your writing:

1. Use the active voice.
2. Write words people like.
3. One idea per sentence.
4. Affirmative is better than negative.
5. Verbs are better than nouns. Nouns are better than adjectives and adverbs.
6. Avoid new words as they will likely be short-lived.
7. Choose substance over style, even if it contradicts any of these rules.

## Bad syntax

The way you build thoughts into sentences has the highest impact on your writing. It is also the hardest thing to change. There is bad writing everywhere, and you passively absorb it. When you read a book, an article or even a tweet, your mind adapts to the pattern it sees. So when you write, you will borrow structures, words and whole phrases from what you've read.

This can pervert your writing and make you think you are an inherently bad writer, or worse, make you think you are a good writer. The mistakes covered here are the direct consequences of breaking the guidelines.

## Phrases and words

This section presents concrete examples of words and phrases that harm your writing. These and more are automatically detected by Textoic, so you can use that tool and come here only to learn which words are flagged and why.

The sections below argue the case. For the exhaustive list of every expression the linter flags, with its replacement, see [docs/no-bad-words.md](docs/no-bad-words.md).

### Empty phrases

These are the easiest problem, so we will start here. Some of them are benign filler that only dulls the reader's brain, like "for the most part." Others are malign phrases that you use consciously or unconsciously for questionable ends, like "the fact that."

_At the end of the day_, the reader will realize that _the fact that_ they are used in modern diction is, _for all intents and purposes_ a distraction.

Instead of plainly saying what I meant, I danced around with words to eventually get to the point. Instead of saying "Empty phrases distract the reader" I used filler to make you gradually lose interest in what I was saying to the point where your mind turns off because you are bored. And when you have to compete with Youtube and Instagram for people's short attention spans, you will quickly lose them.

Here is a short list of empty phrases that can be removed without changing the sentence:

- All things being equal
- At the end of the day
- Can't doubt/help but
- For all intents and purposes
- For the most part
- In the process of
- The fact that
- Can't help but

Additionally, there are two words that rob your modifiers of their meaning:

- Rather
- Somewhat

A somewhat well-written sentence will be rather empty of these two.

### Bloated phrases

~~In the event that~~ If you want to hold on to your readers' attention, you should avoid unnecessary constructions ~~for the reason that~~ because they are boring. Everybody has seen them already being used by many writers. They are pure noise that you will be glad to remove and watch how a dry, dead sentence breathes again.

Just imagine having the sentence

1. The water is then heated up to the point where it begins to boil.

You know something is wrong with it. You are trying to say something so simple yet you have so many words. If you replace "up to the point" with until, you get the much simpler 2) The water is then heated until it begins to boil

The fog clouding the sentence is gone. Now the other problems are easier to see, so you can finally write it as: 3) The water is then heated until it boils.

A bloated phrase doesn't just cause a problem: it hides other problems. Remove all of them and editing will be a lot easier.

### False objectivity

Some words and phrases are there just to make a text look like it's objective and therefore true. If your intent is to deceive your readers, then this section will help you. But be careful, as these phrases are double-edged swords.

They will make your text cold and abstract because instead of dealing with opinions and concrete actions you will be peddling impersonal "facts". The most common path to false objectivity is using the passive without agent, i.e. "The studies were conducted under strict regulations" instead of "The scientists conducted the studies under strict regulations."

Here are some expressions to add a tinge of objectivity to your writing:

- The fact that
- There is/are/were
- X is thought/considered/regarded

### Similes

Use similes sparingly, only when they have a funny effect or are a truly original analogy.

The reader does not need to know that someone is "as busy as a bee" or "as free as a bird", it's been said a million times before, no need to say it more.

In sentences like

> She felt drained, the weight of the recent scandal bearing down on her like a collapsing skyscraper.

The simile doesn't add anything new or any additional information. You can rewrite such a sentence by removing the bad imagery and instead use a verb that is stronger to convey the emotion you are looking for:

> The recent scandal oppressed her. She felt exhausted and drained.

## Unenforceable rules

Unfortunately, some stylistic horrors escape automatic rules, so automatic rules can't fully replace human editing. Here are some cases.

### Misused polysemic words

Words such as "employ" are pedantic when they mean "use" but perfectly reasonable when they mean "provide employment." If an automatic proofreading system marked them as pedantic, it would likely cause more harm than good: the user would waste time going over false positives. Or, even worse, edit these false positives after trusting the machine over the writer or misunderstanding the context.

Instead, we provide a handy list of misused polysemic words and their suggested replacements:

| Word       | Part of Speech | When it means / Replacement | Example                                               |
| ---------- | -------------- | --------------------------- | ----------------------------------------------------- |
| attempt    | verb           | try                         | It attempts to examine                                |
| concern    | verb           | be about                    | This piece concerns                                   |
| concerning | preposition    | about                       | The discussion concerning the environment             |
| constitute | verb           | is                          | The finding constitutes                               |
| employ     | verb           | use                         | Regarding the technique here employed                 |
| endeavor   | verb           | try                         | We endeavor to prove                                  |
| exist      | verb           | is                          | There still exists doubt on this issue                |
| likewise   | connector      | also                        | Andrews likewise found that when the heat evolved on. |

### Sexist language

Writers who are afraid of sexism have turned to the virtue-signaling phrases "he/she," "him/her" and similar monstrosities. First of all, realize that this doesn't make sense in a verbal conversation, so why would you use it in a text? Especially when there is a much better solution:

1. If the gender of the subject is known, name it explicitly.
2. If it is unknown or generic, use the plural.

Examples of how to apply these simple rules:

1. "The person then indicates that he/she consents to the vasectomy." vs. "The man then consents to the vasectomy."
2. "When each student receives the exam, he/she may not leave the room until the end." vs "After receiving their exam, students may not leave the room until the end."

Whenever I read "he/she" I just think the writer is lazy and he/she should do his/her job.

### Weak modifiers

Some words can be helpful in small doses and harmful in abundance. Indefinite modifiers like "some" can help you some. But if you write sentences like "_Most_ men work _many_ hours to gain _some_ satisfaction" then you have a problem.

Weak words:

- Vague quantifiers. Examples: some, many, nearly, roughly, i.e. "Most of them commit crimes" could be the more precise "Ninety-two percent of them commit crimes."
- Vague intensifiers. Examples: very, much, i.e. "He is very pleased" could use a word that already means "very pleased" to become "He is delighted."
- Finally when it means "At which point." Example: "Finally, we went to the movies" could be the more descriptive "After waiting for sixteen minutes, we went to the movies."

### Mixing passive and active voice

_Example_: "The rebels were either imprisoned, driven underground or ruthlessly shot soldiers to escape."

The initially passive verb "were imprisoned" is still passive in the second verb, "driven", but becomes active in the third verb, "shot". This is a source for trouble, as the reader will expect a passive verb but instead gets an active.

This forces the reader to pause after "shot" because instead of the rebels being shot, it's the rebels who do the shooting.

_Solution_: Stick to a single voice for a single sentence.

### Complex conjuncts

_Example_: "His expulsion came shortly after the news and the discovery of new evidence did nothing to help him."

Notice how up to "new evidence" you think the expulsion comes after "the news and the discovery of new evidence." When you realize that "the discovery of new evidence" is actually a subject, you have to backtrack to reinterpret the sentence.

There are two problems: there is an unnecessary coordinate and there is a nominalized subject. If we remove one at a time, we find the path to an unambiguous sentence:

"His expulsion came shortly after the news and the discovery of new evidence did nothing to help him."
"His expulsion came shortly after the news and the new evidence did nothing to help him."
"His expulsion came shortly after the news. The new evidence did nothing to help him."

Your conjuncts will be a lot better if you stick to these restrictions:

1. If you coordinate two verbs, they must share a common argument.
2. Don't nest conjuncts inside conjuncts.
3. Keep the elements of a conjunct as simple as you can.

The first sentence violates rules 1 and 3. Here are other examples of sentences that violate some of these rules:

- "John, Mary, Jack and his kids, and Susan will come" (Rule 2)
- "The fall of civilization as we know it, the grim, ghastly, gaunt conversion of morality to a decrepit, cadaveric shade of its former self and degeneracy will all befall us." (Rules 2 and 3)

But even if you follow these rules, you might still have ambiguity in apparently simple sentences as this one: "John, the firefighter, and I live together."

Does the sentence mention three people (John, the firefighter, I) or only two (John, I)? The problem here is that the part of some conjuncts look like appositives. In this case you could try rewriting it by changing the order to avoid ambiguity, i.e. "I, John and the firefighter live together" or even the more verbose but explicit "The three of us live together: John, the firefighter and I."

_Solution_: Stick to simple conjuncts.

### Repurposed verb tenses

_Example_: "He wishes to have expelled members back on the board"

Up to "back", the reader understands this sentence as "he wishes he would have expelled members..." sooner? before it was too late? But then comes "back" and it turns out that it's actually "he wishes to return _the_ expelled members to the board."

This is a sign of a larger cause for ambiguity and garden-paths: repurposed verbs. The past participle and the gerund of many verbs is used as a modifier of nouns and verbs, i.e. "a disgraced teacher," "a running politician," and the gerunds are also used as nouns i.e. "the beginning of the end."

It's usually fine if these repurposed verbs appear in simple sentences. But the thing changes when they are welded as coordinates, glued to subclauses, or thrust into prepositional arguments. Just look at the following examples:

- Breaking the deal made before meeting the company offered a deal, John feared showing up.
- Using these ridiculous repurposed verbs, complex coordinated clauses and weird syntactic structures, no good will come.
- The dawning of this new era, heralded revolution for ages, inevitably and fast approaching fulfilling of a dormant dream will dawn upon us.

_Solution_: Avoid complex syntactic structures in general. If you must use one, make sure the repurposed verb is unambiguous.

### Garden-path sentences

Certain sneaky expressions will sound good to you, inducing you to think they are always correct. But you will often use them where they can confuse readers by making them mentally retrace their steps, like the famous sentence "The horse raced past the barn fell."

This is called a _garden-path_ sentence. This kind of sentence is more common than you would expect, and it can happen for a variety of reasons. Editing may fail to remove them because the editor can interpret it like the writer, skip over it or think it doesn't matter.

### Abusing emphasis

**Don't abuse emphasis itself!**

Bold font, emphatic pronouns (the reflexive pronouns used after a noun i.e. "the king himself") and the exclamation point are useful to indicate something is important, but they have diminishing returns. The more you use them, the less they mean. Think of each of them as having a small "cool-down" period of X words so that you can find at most one exclamation point or emphatic pronoun in any chunk of X words.

## Bad description verbs

Think, say, know, see.

Cogitate, verbalize, be cognizant of, catch sight of.

Notice any difference? The first line are _things people do_; the second are sorry excuses that bad writers use to avoid repetition.

Why avoid repetition though?

If you have characters that "think" eight times in a paragraph, maybe the problem isn't your choice of words. All these derivative verbs and abominable phrases are writing smells: they mean something smells bad in your writing.

"Nooo, I can't just say 'think!' I need this one specific shade of meaning that only 'cerebrate' provides!" Wrong. Using pretentious words for simple things signals that, well, you don't **think** critically. Just because a word exists doesn't mean you should use it.

To finish, a Litmus test for pointless, pretentious diction: take Google Trends and put in the word or phrase. If the most popular query is "cogitate definition" or "define cogitate" then it's probably unnecessary.

## Sources

Here is a list of some material we have used either directly or as inspiration in building Textoic:

Long-form content:

- [George Orwell: ‘Politics and the English Language’](http://www.orwell.ru/library/essays/politics/english/e_polit)
- William Zinsser: ‘On Writing Well’
- [Everyone Can Write Better (and You Are No Exception)](http://homepages.ed.ac.uk/martinc/msc/doc/hc.pdf)

Articles:

- [Shane Arthur: ‘297 Flabby Words and Phrases That Rob Your Writing of All Its Power’](https://smartblogger.com/weak-writing/)
- [100+ Words to Use Instead of VERY in English](https://7esl.com/words-to-use-instead-of-very/)
- [Proofreading: 7 Editing Tips That’ll Make You a Better Writer in 2022](https://smartblogger.com/proofreading-editing-tips/)
- [The 15 Best Editing Tips to Craft Clear Content](https://coschedule.com/blog/editing-tips/)
- [25 Editing Tips for Tightening Your Copy (Plus an Editing Checklist)](https://thewritelife.com/edit-your-copy/)
- [11 Tips for Editing Your Own Writing (Plus a Checklist)](https://www.constant-content.com/content-writing-service/2017/10/11-tips-for-editing-your-own-writing/)

Dialect difference lists:

- https://www.californiasys.com/wp-content/uploads/2019/08/UK-vs-US-vs-NZ-English-VOCABULARY-SPELLING-differences.pdf
- https://www.fionalake.com.au/info/translations/australian-american-words
- https://www.englishclub.com/vocabulary/british-american.htm
- https://www.englisch-hilfen.de/en/words/be-ae.htm

Technical writing:

- [ASD-STE100 Simplified Technical English specification](http://asd-ste100.org/).

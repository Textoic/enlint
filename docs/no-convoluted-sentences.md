# No Convoluted Sentences

A sentence can be long and easy, and it can be short and hard. What makes it
hard is the number of clauses hung on one another:

> A review calls a page painterly and a reader who was bored starts to think
> the boredom was a personal failure, so the next writer keeps the sofa and
> the exact nap of the fabric, because the review never asked whether anybody
> needed the nap.

"and", "who", "so", "because" and "whether" each open another clause, and the
reader has to keep track of which clause explains which. The rule counts
those joins and reports the sentence when it has more than three.

## What counts as a join

- A coordinator ("and", "but", "or", "yet", "nor") with a verb before it and
  a clause of its own after it: a noun, then a tensed verb, before the next
  punctuation mark. "Tom and Ann left" and "a coat and a hat" join nouns and
  count nothing. A coordinator that opens the sentence joins it to the
  sentence before and counts nothing.
- A subordinator or a relative word ("because", "so", "if", "when", "while",
  "although", "since", "unless", "whether", "that", "which", "who", "what",
  "where", "why", "how" and a few more) with a tensed verb after it and
  before the next punctuation mark.
- A relative clause with no marker, as
  [`no-unmarked-relatives`](no-unmarked-relatives.md) finds it.

A tensed verb is a verb that is no "-ing" form and does not follow "to". A
helper and its verb are one: "was bored", "can check", "has been seen".

These do not count:

- "that" pointing at a noun ("that book", "none of that");
- "so" and "as" grading the next word ("so good that", "so much time here
  that"). In "as much as he could" the second "as" opens a clause and counts
  once;
- "after", "as", "before", "once", "since" and "until" used as a preposition
  or an adverb. They count only when a subject follows directly and a tensed
  verb comes before the next join word: "once they are married" counts, and
  "He once said", "as a nurse" and "after dinner" do not;
- a join word after an article ("a while"), and "because of";
- a question word that opens a question ("What does it cost?");
- the second word of "so that", "as if" and "as though".

## The cap

Three joins pass and four are reported. Counted through the lab's profiler,
the author's 13 essays hold 375 sentences and six of them are reported
(1.6%). 60 model-written essays hold 1,414 sentences and 184 are reported
(13.0%). A cap of two was not adopted: in a first count it reported about
one of the author's sentences in twenty.

The reported span is the whole sentence. The rule offers no replacement.

## What it gets wrong

It reads tags and the words themselves, and heads only for the unmarked
relative.

- A tensed verb the parser tags as a noun loses its join. Under the trained
  tagger the sentence above counts four joins and not five, because "keeps"
  comes out a noun, so it passes the cap by one join only. artisan has not
  been fixed for it.
- A clause joined with no word is not counted, except the unmarked relative:
  "She said she knew he thought they believed it was over" counts nothing,
  and neither does a run of clauses between commas ("He came, he saw, he
  left, he slept").
- Verbs that share one subject count nothing: "I bought the car and sold the
  house and painted the fence".
- Two nouns joined in front of a verb ("nouns and verbs are") count as a
  clause.
- "As a teacher she works hard" counts "as", because a noun and a verb
  follow it.
- A false report of `no-unmarked-relatives` adds a join here.

# No Unmarked Relatives

A relative clause can follow its noun with nothing to mark where it starts:

> You get art by working inside rules another person can check.

"another person can check" describes "rules", and "that" is missing between
them. The reader takes "rules another person" for one phrase until "can"
arrives. The rule reports the noun and the clause, and offers "that":

> You get art by working inside rules that another person can check.

## What is reported

A verb that hangs on a noun in front of it, with a subject of its own between
the two, and that subject's phrase starting directly after the noun. Then the
clause must be one a relative clause can be:

- It has a gap for the noun. The last verb of the clause has no object after
  it ("letters he wrote"), or the clause holds a preposition with no object
  ("a floor somebody made a mess on"). A noun of time after the verb is no
  object ("the paragraph they type the next morning").
- Or the noun is one that takes any clause: "way", "time", "reason",
  "moment", "day", "year", "place" ("the way I want to", "every time he
  comes through a door").

These are left alone, because the parser hangs them the same way and they are
no relative clauses:

- A main clause after a fronted phrase: "Thanks to the ironies of life I
  found the answer", "As a teacher she works hard", "Last year we moved",
  "For a while he stayed home". No verb stands above the noun, and the noun
  is bare, or names a time, or the sentence opens on a preposition.
- An object set in front of its clause: "Some I found interesting."
- An indirect question: "which noun we are referring to".
- A clause that starts with a relative word: "A writer copies what he reads."
- A clause told to the noun: "I told the boy he needs books."
- A noun that is a personal pronoun, a relative pronoun or a connective.

The span runs from the noun to the last verb of the clause's verb group. The
suggestion inserts "that " in front of the clause's subject.

## How often

Counted through the lab's profiler, per 1,000 words: 1.8 in the author's 13
essays (10 reports in 5,632 words) and 5.0 in 60 model-written essays (141
reports in 28,170 words). Read by hand in an earlier count, about one report
in ten on the model essays was wrong and four of eleven on the author's.

## What it gets wrong

- A second object: "a compliment they pay a pile of clutter" has an object
  after the verb and is missed.
- A clause the parser hangs on the wrong noun: "Instagram, Twitter and
  Facebook all process the posts" reports "Facebook all process", and "And in
  poetry we have ..." reports "poetry we have".
- "How common a word is decides ..." reports "common a word is", because
  "common" is tagged a noun.
- A numeral subject: "Chapter one starts".
- A fronted phrase the guards do not cover: "In only a few years she had
  claimed all the land she could, but still she craved more" reports "still
  she craved", and "The more he reads the less he knows" reports twice.
- Sentences artisan parses wrongly, none of them fixed yet: "The house Jack
  built fell down" ("built" becomes the root), "I like dogs you can train"
  ("like" is a marker and "dogs" a verb), and "the letters the man she loved
  wrote", where only the inner clause is found.

The rule is off by default. The author's own essays use the unmarked form
("the exact picture you have in mind"), and it is ordinary English. The rule
is for a text that has to stay easy for a second-language reader, and for
measuring how often a writer drops the marker.

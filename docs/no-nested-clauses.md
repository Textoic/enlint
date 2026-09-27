# No Nested Clauses

A subject and its verb can be pulled apart by clauses that sit between them.
One is ordinary English. Two stack unfinished clauses in the reader's head
until the verb finally arrives:

> The report that the analyst who the board hired drafted was lost

Between "report" and "was" there are two subject-verb pairs — "the analyst …
drafted" and "who the board hired" — so the reader holds three subjects before
any of them gets a verb. "The report was lost" is the same fact.

The rule walks down from a noun whose head is a verb, counting the `NOUN > VERB`
steps on the longest path, and only through tokens that lie between the noun and
that verb. One pair passes; two or more is an error. The same clauses after the
verb cost the reader nothing and are not reported, which is why "We lost the
report that the analyst who the board hired drafted" is quiet.

The reported span runs from the start of the subject to the last word before its
verb.

The rule can only report what artisan parses. "The book that the student who the
tutor praised recommended sold out" is the hardest shape of all and reports
nothing, because the parser leaves that sentence without a main verb —
`DIFFICULT_CASES.md` records it.

This rule is on by default. Its spans are long, but it offers no replacement,
and `lint` only lets a problem supersede the ones it covers when it carries a
replacement of its own. The shorter findings inside the span survive.

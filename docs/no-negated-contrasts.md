# No Negated Contrasts

Defining something by what it is not costs the reader a step: they hold the
wrong thing in mind, then throw it away. The rule finds three shapes of that
move and asks for the positive half on its own.

**The negated tail.** A comma, "not", and a rejected alternative at the end of
the sentence. The suggestion deletes the tail, from the comma to the end of the
chunk:

> the reported span is the phrase, not a stray overlap elsewhere in the sentence

becomes "the reported span is the phrase". A closing comma ends the tail
instead, so "The report, not the memo, was lost" becomes "The report was lost".

**The minimized contrast.** "not just X, but also Y", and the same with
"merely", "only", "simply" and "solely". Both halves are true, so the advice is
to join them: "He is not just a teacher, but also a coach" becomes "He is a
teacher and a coach".

**The restatement.** A negation followed by the positive version, joined by
"but", a semicolon, or a comma splice. "The thing that blows up is not the
deficit; it's the debt" becomes "But it's the debt that blows up". artisan splits a
sentence at the semicolon, so this is the one rule that reads the sentence after
the one it is working on.

A plain negation is not a contrast and is left alone: "The report was not lost"
and "He left, not knowing what to do" report nothing. The tail shape asks for a
counterpart of the same part of speech before it fires. The restatement shape
asks for three things: it must open on the comma or semicolon right after the
negated chunk, it must offer a counterpart of the same part of speech, and where
the negated element is a verb the restating clause must be its sibling with no
verb in between. Together those keep a comma splice of two unrelated clauses
quiet — "Readers do not need to know that someone is as busy as a bee, it has
been said a million times" reports nothing.

A negated tail runs to the end of the sentence only when no comma, colon,
semicolon or dash stands in the way; otherwise it stops at the end of the
negated chunk. That matters on text a parser reads as one long sentence, such as
a markdown table.

`no-bad-sentence-structures` finds the "not just X but Y" shape as well, over a
shorter span, so with both rules on this one wins the overlap.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint, { defaults } from "../../src/index.js";
import tells from "../../src/tells.js";
import nlp from "../nlp.js";
import trainedNlp from "../trained-nlp.js";

const kindsIn = (text: string) => tells(nlp(text)).map(({ kind }) => kind);

const spansIn = (text: string) =>
  tells(nlp(text)).map(({ start, end }) => text.slice(start, end));

const flagged = (text: string, id: string) =>
  lint(nlp(text), defaults)
    .filter((error) => error.id === id)
    .map(({ start, end }) => text.slice(start, end));

describe("tells: a noun with a clause hung on it", () => {
  [
    "The open-source pieces every product shares.",
    "The same rules where you already write.",
  ].forEach((text) => {
    it(`finds "${text}"`, () => {
      assert.deepEqual(kindsIn(text), ["noun-fragment"]);
      assert.deepEqual(spansIn(text), [text.slice(0, -1)]);
    });
  });

  [
    "Every product shares these open-source pieces.",
    "No.",
    "A week under the sun.",
    "The rules changed where you already write.",
    "What are the rules you already know?",
  ].forEach((text) => {
    it(`leaves "${text}" alone`, () => {
      assert.deepEqual(kindsIn(text), []);
    });
  });
});

describe("tells: an idea announced and praised", () => {
  (
    [
      [
        "There's one more effect, and it's the one I like best.",
        ["teaser", "comma-and"],
      ],
      ["And here's the thing nobody tells you.", ["teaser"]],
      ["The best part is the price.", ["teaser", "equation"]],
    ] as const
  ).forEach(([text, kinds]) => {
    it(`finds "${text}"`, () => {
      assert.deepEqual(kindsIn(text), kinds);
    });
  });

  it("leaves a plain count alone", () => {
    assert.deepEqual(kindsIn("I ate one more apple and left."), []);
  });
});

describe("tells: here is, then a colon", () => {
  it("finds the announcement", () => {
    assert.deepEqual(
      kindsIn(
        "Here's the whole job, and it fits in a Saturday afternoon plus some waiting:",
      ),
      ["announcement", "comma-and"],
    );
  });

  it("leaves here without a colon alone", () => {
    assert.deepEqual(kindsIn("Here is the report you asked for."), []);
  });
});

describe("tells: a tail that comments on its own sentence", () => {
  it("finds it and reports the tail only", () => {
    const text =
      "A small cheque in the right year outgrows a fat one, which is the bit a page buries in a chart.";
    assert.deepEqual(kindsIn(text), ["which-tail"]);
    assert.deepEqual(spansIn(text), [
      ", which is the bit a page buries in a chart",
    ]);
  });

  it("leaves a which that describes a noun alone", () => {
    assert.deepEqual(kindsIn("He sold the car, which had never run well."), []);
  });
});

describe("tells: figures given too exactly", () => {
  it("finds the arithmetic once and the long decimal", () => {
    const text = "Thirty years is 3.869 times 1.967, near 7.61, or 14.9744.";
    assert.deepEqual(spansIn(text), ["3.869 times 1.967", "14.9744"]);
  });

  it("leaves a rounded figure alone", () => {
    assert.deepEqual(kindsIn("It grows by 1.07 each year, to 7.61."), []);
  });
});

describe("no-bad-sentence-structures reports the tells", () => {
  it("flags the tagline", () => {
    assert.deepEqual(
      flagged(
        "The open-source pieces every product shares.",
        "no-bad-sentence-structures",
      ),
      ["The open-source pieces every product shares"],
    );
  });
});

describe("no-negated-contrasts: a bare tail", () => {
  it("flags a noun phrase negated after a comma", () => {
    assert.deepEqual(
      flagged(
        "Ransomware is the real threat, not a bored data centre in Oregon.",
        "no-negated-contrasts",
      ),
      [", not a bored data centre in Oregon"],
    );
  });

  [
    "I asked him, not that it mattered.",
    "She left early, not because she was tired.",
    "He came, but not to see me.",
  ].forEach((text) => {
    it(`leaves "${text}" alone`, () => {
      assert.deepEqual(flagged(text, "no-negated-contrasts"), []);
    });
  });
});

describe("no-bad-words: the new entries", () => {
  it("flags a result that lands near a number", () => {
    assert.deepEqual(
      flagged("Forty years lands near 14.97 in the end.", "no-bad-words"),
      ["lands near"],
    );
  });

  it("leaves a plane that lands alone", () => {
    assert.deepEqual(
      flagged("The plane lands at Heathrow tonight.", "no-bad-words"),
      [],
    );
  });

  it("flags the pitch", () => {
    assert.deepEqual(
      flagged("But the answer is simpler than you think.", "no-bad-words"),
      ["than you think"],
    );
  });
});

const providers = [
  ["the development parser", nlp],
  ["the trained parser", trainedNlp],
] as const;

const BEAT = "beat (comparison)";
const MATTER = "matter (verb)";

const wordTells = new Set(["beat-comparison", "matters-claim", "can-cannot"]);

const found = (text: string, parse: typeof nlp) =>
  tells(parse(text))
    .filter(({ kind }) => wordTells.has(kind))
    .map(({ kind, start, end }) => [kind, text.slice(start, end)] as const);

const listed = (text: string, parse: typeof nlp, phrase: string) =>
  lint(parse(text), defaults)
    .filter((error) => error.id === "no-bad-words" && error.case === phrase)
    .map(({ start, end }) => text.slice(start, end));

const fallbacks = (text: string, parse: typeof nlp, kind: string) =>
  found(text, parse)
    .filter(([one]) => one === kind)
    .map(([, words]) => words);

const reported = (text: string, parse: typeof nlp, phrase: string) => [
  ...listed(text, parse, phrase),
  ...fallbacks(
    text,
    parse,
    phrase === BEAT ? "beat-comparison" : "matters-claim",
  ),
];

providers.forEach(([provider, parse]) => {
  describe(`no-bad-words: "beats" for a comparison, under ${provider}`, () => {
    (
      [
        ['The year "the $200" begins beats its size.', "beats"],
        ["But how can 10 years beat 30?", "beat"],
        ["That is why the year beats the amount.", "beats"],
        ["Nothing beats a warm bath.", "beats"],
        ["Ten years of patience will beat any clever trick.", "beat"],
        ["Starting at 25 beats starting at 35.", "beats"],
        ["An early start does beat a bigger deposit.", "beat"],
        ["It beats the alternative.", "beats"],
      ] as const
    ).forEach(([text, word]) => {
      it(`lists "${text}"`, () => {
        assert.deepEqual(listed(text, parse, BEAT), [word]);
        assert.deepEqual(found(text, parse), []);
      });
    });

    it("reports a comparison the parser reads as a noun, once", () => {
      assert.deepEqual(
        reported("Starting early beats saving more.", parse, BEAT),
        ["beats"],
      );
    });

    [
      "He beat me at chess.",
      "She beats the eggs with a fork.",
      "Beat the eggs until stiff.",
      "The Lakers beat the Celtics last night.",
      "My heart beats a little faster when I run.",
      "The song has 120 beats per minute.",
      "He walked his beat every night.",
      "You can't beat a free lunch.",
      "The police beat the protesters.",
      "The team will try to beat the record.",
      "The man beats his dog.",
      "That beats me.",
      "The general will beat a retreat.",
      "The cook beats the eggs with a fork.",
      "Rain beats against the window.",
      "The sun beats down on the roof.",
    ].forEach((text) => {
      it(`leaves "${text}" alone`, () => {
        assert.deepEqual(reported(text, parse, BEAT), []);
      });
    });
  });

  describe(`no-bad-words: a claim that something matters, under ${provider}`, () => {
    (
      [
        ["That’s why the year you start matters so much.", ["matters"]],
        [
          "Does saving $20 now matter if you can save $200 later? It matters.",
          ["matter", "matters"],
        ],
        ["Now here is the part that actually matters.", ["matters"]],
        ["What matters is the year you begin.", ["matters"]],
        ["The first ten years matter most.", ["matter"]],
        ["It mattered to her.", ["mattered"]],
        ["Every choice you make matters.", ["matters"]],
        ["Only the total matters.", ["matters"]],
        ["Why does this matter?", ["matter"]],
      ] as const
    ).forEach(([text, words]) => {
      it(`lists "${text}"`, () => {
        assert.deepEqual(listed(text, parse, MATTER), words);
        assert.deepEqual(found(text, parse), []);
      });
    });

    it("reports a claim the parser reads as a noun, once", () => {
      assert.deepEqual(
        reported(
          "Being consistent matters more than being clever.",
          parse,
          MATTER,
        ),
        ["matters"],
      );
    });

    [
      "It doesn't matter which one you pick.",
      "That never mattered.",
      "It no longer matters.",
      "Nothing else matters.",
      "No matter what you do, the tax applies.",
      "As a matter of fact, he left early.",
      "It is only a matter of time.",
      "These matters are private.",
      "To make matters worse, it rained.",
      "Family matters are private.",
      "She is an expert in matters of state.",
      "The course will cover subject matter from three fields.",
      "Scientists can explain why matter exists.",
      "The universe is mostly dark matter.",
      "We can convert matter into energy.",
    ].forEach((text) => {
      it(`leaves "${text}" alone`, () => {
        assert.deepEqual(reported(text, parse, MATTER), []);
      });
    });
  });

  describe(`tells: a can set against a can't, under ${provider}`, () => {
    [
      "Money can buy a bigger contribution. It can't buy back last year.",
      "But you can increase a payment later; you can’t issue yourself ten extra years.",
      "The amount can be fixed later. The start date can't.",
      "Your first pay cheque buys something your later pay cheques can't buy.",
      "The amount can be fixed later, but the start date cannot.",
      "Money can buy a bigger contribution. It can never buy back last year.",
      "You can earn more money but you can't earn more time.",
    ].forEach((text) => {
      it(`finds "${text}" once, from its first word to its last`, () => {
        assert.deepEqual(found(text, parse), [
          ["can-cannot", text.slice(0, -1)],
        ]);
      });
    });

    [
      "I can't swim.",
      "You can install it with npm. It can't run on Windows yet.",
      "The parser can read Markdown. If the file is very large, the editor can't open it at all.",
      "He can't come tonight. She can come tomorrow.",
      "We can't know what the court will decide.",
      "A can of beans sat on the shelf. It can't have been there long.",
      "Can you come on Friday? I can't.",
      "He asked if I can come. I can't.",
      '"I can do it," he said. "You can\'t," she replied.',
      "I opened the can. I can't.",
      "I need to sleep and I can't sleep.",
      "She asked me to stay but I can't stay.",
      "You can say that you can't come.",
      "You can tell them you can't attend.",
      "You can go.\n* You can't stay.",
      "The tool can export a PDF.\n\n## Limits\n\nIt can't export Word files.",
      "- You can pay by card.\n- You can't pay by cheque.",
      "The amount can be fixed later.\n\nThe start date can't.",
    ].forEach((text) => {
      it(`leaves ${JSON.stringify(text)} alone`, () => {
        assert.deepEqual(found(text, parse), []);
      });
    });
  });
});

describe("tells: two in one passage", () => {
  it("lists the comparison and finds the tail in the same sentence", () => {
    const text =
      "A small cheque in the right year beats a fat one, which is the bit a page buries in a chart.";
    assert.deepEqual(kindsIn(text), ["which-tail"]);
    assert.deepEqual(listed(text, nlp, BEAT), ["beats"]);
  });

  it("reports a can and a can't once when a second can't follows", () => {
    const text = "I can swim but I can't dive. I can't fly.";
    assert.deepEqual(found(text, nlp), [
      ["can-cannot", "I can swim but I can't dive"],
    ]);
  });
});

describe("the three reports together", () => {
  it("lists the comparison and the claim, and flags the pair", () => {
    const text =
      "That is why the year beats the amount. It matters. The amount can be fixed later. The start date can't.";
    assert.deepEqual(flagged(text, "no-bad-words"), ["beats", "matters"]);
    assert.deepEqual(flagged(text, "no-bad-sentence-structures"), [
      "The amount can be fixed later. The start date can't",
    ]);
  });
});

describe("no-bad-words: carry weight", () => {
  it("no longer offers a word the list reports", () => {
    const [error] = lint(nlp("His opinion carries weight here."), defaults);
    assert.deepEqual(
      error.suggestions?.map(({ text }) => text),
      ["counts"],
    );
  });
});

const structures = (text: string, parse: typeof nlp, kind: string) =>
  tells(parse(text))
    .filter((tell) => tell.kind === kind)
    .map(({ start, end }) => text.slice(start, end));

providers.forEach(([provider, parse]) => {
  describe(`tells: one noun set equal to another, under ${provider}`, () => {
    (
      [
        [
          "An apostrophe in the middle of a fight is the writer making you stop for a pronunciation exercise.",
          "An apostrophe in the middle of a fight is the writer",
        ],
        [
          "That flip is time you do not get back, and it lands in the middle of the bit you were actually reading.",
          "That flip is time",
        ],
        [
          "A puzzle you did not ask for is just an interruption.",
          "A puzzle you did not ask for is just an interruption",
        ],
        [
          "A village in Dumas was somebody else's street the whole time.",
          "A village in Dumas was somebody else's street",
        ],
        [
          "Art is the thing you are left with when somebody has worked inside rules.",
          "Art is the thing",
        ],
        ["Because the rules were the work.", "the rules were the work"],
      ] as const
    ).forEach(([text, span]) => {
      it(`finds "${text}"`, () => {
        assert.deepEqual(structures(text, parse, "equation"), [span]);
      });
    });

    [
      "The house is in the valley.",
      "The plan is to leave early.",
      "It was a mistake.",
      "This is a test.",
      "There is a problem.",
      "Is the answer a number?",
      "The book was written in 1920.",
      "The report is long.",
      "The writer is making you stop.",
      "Thirty years is 3.869 times 1.967.",
    ].forEach((text) => {
      it(`leaves "${text}" alone`, () => {
        assert.deepEqual(structures(text, parse, "equation"), []);
      });
    });
  });

  describe(`tells: a second clause hung on ", and", under ${provider}`, () => {
    [
      'People will tell you "But it made the world feel lived in" and sometimes a small detail does that, and a lot of the time the world was already clear.',
      'They looked, the picture did not answer, and a staff member with a laptop called that "a failure of attention".',
      "The fog came in, and the boats stayed out.",
      "The rules are old, and nobody reads them.",
      "People stand there and feel nothing, and then they decide they have failed some test.",
    ].forEach((text) => {
      it(`finds "${text}"`, () => {
        assert.deepEqual(structures(text, parse, "comma-and"), [", and"]);
      });
    });

    [
      "I bought bread, milk, and eggs.",
      "She came home, and went to bed.",
      "He was tired, hungry, and cold.",
      "We tried the door, the window, and the cellar hatch.",
      "She wrote the book and he sold it.",
      "After lunch, and before the meeting, he slept.",
      "Tom, Ann, and the dog went out.",
      "I bought bread, milk, and eggs that looked fresh.",
      "We visited Paris, Rome, and the town where she was born.",
      "He packed a tent, a stove, and everything he needed.",
    ].forEach((text) => {
      it(`leaves "${text}" alone`, () => {
        assert.deepEqual(structures(text, parse, "comma-and"), []);
      });
    });
  });

  describe(`no-bad-words: "sit" and "land" for where a thing is, under ${provider}`, () => {
    (
      [
        ["The rarest sit with specialists who already wanted them.", "sit"],
        ["The book sits unfinished on a table.", "sits"],
        ["The plot sits there.", "sits"],
        ["The canvas is where the fault sits.", "sits"],
        ["It sits on shelves in american apartments unread.", "sits"],
        ["The fog sits over the Court of Chancery.", "sits"],
        ["The trophy still sits on the shelf.", "sits"],
      ] as const
    ).forEach(([text, word]) => {
      it(`lists "${text}"`, () => {
        assert.deepEqual(listed(text, parse, "sit (place)"), [word]);
      });
    });

    [
      "She sat on the bench.",
      "The children sat down.",
      "People sit in meetings for the whole volume.",
      "The crowd that stayed will sit with hundreds of pages.",
      "The cat sat on the mat.",
      "I'm gonna sit down and read this through.",
      "Nobody sat near him.",
      "You sat through that subplot waiting for it to do something.",
      "They are not sitting there with a red pencil.",
      "The teacher sat at her desk.",
      "The king sat on the throne.",
    ].forEach((text) => {
      it(`leaves "${text}" alone`, () => {
        assert.deepEqual(listed(text, parse, "sit (place)"), []);
      });
    });

    (
      [
        [
          "That flip is time you do not get back, and it lands in the middle of the bit you were actually reading.",
          "lands",
        ],
        ["The puns do not land.", "land"],
        ["You can hear where the line lands.", "lands"],
        ["It means saying a thing so it lands.", "lands"],
        ["A writer still has to land a sentence.", "land"],
      ] as const
    ).forEach(([text, word]) => {
      it(`lists "${text}"`, () => {
        assert.deepEqual(listed(text, parse, "land (place)"), [word]);
      });
    });

    [
      "The plane landed at noon.",
      "She landed a job at the bank.",
      "We landed in Lisbon.",
      "The waste land got the same treatment.",
      "The pilot will land the plane.",
      "The bird landed on the roof.",
      "The ball landed in the garden.",
      "The cat landed on its feet.",
    ].forEach((text) => {
      it(`leaves "${text}" alone`, () => {
        assert.deepEqual(listed(text, parse, "land (place)"), []);
      });
    });
  });

  describe(`no-bad-words: "strip away" and "shared understanding", under ${provider}`, () => {
    (
      [
        ["The edit strips away everything the reader liked.", "strips away"],
        [
          "Strip the rhyme away and you are reading prose.",
          "Strip the rhyme away",
        ],
      ] as const
    ).forEach(([text, span]) => {
      it(`lists "${text}"`, () => {
        assert.deepEqual(listed(text, parse, "strip away"), [span]);
      });
    });

    ["She stripped the wallpaper.", "Strip that out and it's prose."].forEach(
      (text) => {
        it(`leaves "${text}" alone`, () => {
          assert.deepEqual(listed(text, parse, "strip away"), []);
        });
      },
    );

    it("lists a shared understanding", () => {
      assert.deepEqual(
        listed(
          "They never reach a shared understanding of the book.",
          parse,
          "shared understanding",
        ),
        ["shared understanding"],
      );
    });

    it("leaves a plain understanding to the broader entry", () => {
      assert.deepEqual(
        listed(
          "Our understanding of the rule changed.",
          parse,
          "shared understanding",
        ),
        [],
      );
    });
  });
});

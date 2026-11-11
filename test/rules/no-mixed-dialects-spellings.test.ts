import assert from "node:assert/strict";
import { describe, it } from "node:test";
import lint from "../../src/index.js";
import nlp from "../nlp.js";

type Spelling = [american: string, british: string, sentence: string];

const LOCALES = ["en-US", "en-GB", "en-AU", "en-CA"];

const britishIn = {
  ize: ["en-GB", "en-AU"],
  commonwealth: ["en-GB", "en-CA", "en-AU"],
  britishAndAustralian: ["en-GB", "en-AU"],
};

const ize: Spelling[] = [
  ["criticized", "criticised", "They criticized the plan."],
  ["emphasizes", "emphasises", "She emphasizes the cost."],
  ["summarized", "summarised", "He summarized the report."],
  ["characterized", "characterised", "Critics characterized the book as dull."],
  ["minimized", "minimised", "We minimized the risk."],
  ["maximize", "maximise", "They maximize the profit."],
  ["specializes", "specialises", "She specializes in tax law."],
  ["symbolizes", "symbolises", "The flag symbolizes the nation."],
  ["standardized", "standardised", "They standardized the forms."],
  ["civilize", "civilise", "They tried to civilize the colonies."],
  ["colonized", "colonised", "Spain colonized the island."],
  ["idolize", "idolise", "Kids idolize the singer."],
  ["sympathize", "sympathise", "I sympathize with them."],
  ["agonized", "agonised", "He agonized over the choice."],
  ["fantasized", "fantasised", "She fantasized about money."],
  ["theorized", "theorised", "Scientists theorized about the cause."],
  ["modernized", "modernised", "They modernized the factory."],
  ["normalized", "normalised", "The data was normalized."],
  ["legalized", "legalised", "The state legalized gambling."],
  ["romanticize", "romanticise", "Writers romanticize the past."],
  ["trivialize", "trivialise", "You should not trivialize the risk."],
  ["glamorize", "glamorise", "Films glamorize crime."],
  ["mobilized", "mobilised", "The army mobilized the reserves."],
  ["visualize", "visualise", "I can visualize the room."],
  ["patronize", "patronise", "You should not patronize me."],
  ["scrutinized", "scrutinised", "Auditors scrutinized the books."],
  ["terrorized", "terrorised", "The gang terrorized the town."],
  ["vandalized", "vandalised", "Kids vandalized the station."],
  ["jeopardizes", "jeopardises", "The delay jeopardizes the deal."],
  ["categorized", "categorised", "We categorized the files."],
  ["capitalize", "capitalise", "You should capitalize the first word."],
  ["publicized", "publicised", "They publicized the event."],
  ["stabilized", "stabilised", "The pilot stabilized the plane."],
  ["neutralized", "neutralised", "The acid neutralized the base."],
  ["organization", "organisation", "The organization grew."],
  ["civilization", "civilisation", "The civilization fell."],
  ["realization", "realisation", "The realization hurt."],
  ["colonization", "colonisation", "The colonization lasted decades."],
  ["specialization", "specialisation", "Her specialization is tax law."],
  ["characterization", "characterisation", "The characterization was weak."],
  ["visualization", "visualisation", "The visualization helped."],
  ["categorization", "categorisation", "The categorization failed."],
  ["normalization", "normalisation", "The normalization step failed."],
  ["modernization", "modernisation", "The modernization cost millions."],
  ["standardization", "standardisation", "The standardization took years."],
  ["analyzed", "analysed", "She analyzed the data."],
  ["paralyzed", "paralysed", "Fear paralyzed him."],
  ["catalyzes", "catalyses", "The enzyme catalyzes the reaction."],
  ["standardized", "standardised", "A standardized test was given."],
  ["specialized", "specialised", "A specialized tool helped."],
  ["civilized", "civilised", "The civilized world watched."],
  ["paralyzed", "paralysed", "The paralyzed man walked."],
];

const commonwealth: Spelling[] = [
  ["favor", "favour", "Do me a favor."],
  ["vapor", "vapour", "The vapor rose."],
  ["armor", "armour", "The knights wore armor."],
  ["endeavor", "endeavour", "The endeavor failed."],
  ["valor", "valour", "He fought with valor."],
  ["odors", "odours", "The odors faded."],
  ["clamor", "clamour", "The clamor grew."],
  ["splendor", "splendour", "The splendor of the hall impressed us."],
  ["rigor", "rigour", "The study lacks rigor."],
  ["vigor", "vigour", "He worked with vigor."],
  ["savior", "saviour", "They called him a savior."],
  ["parlor", "parlour", "The parlor was empty."],
  ["candor", "candour", "I liked her candor."],
  ["rumors", "rumours", "The rumors spread."],
  ["tumor", "tumour", "The tumor shrank."],
  ["colorful", "colourful", "The colorful flags hung there."],
  ["honorable", "honourable", "He was an honorable man."],
  ["favorable", "favourable", "The reviews were favorable."],
  ["neighborhood", "neighbourhood", "The neighborhood changed."],
  ["behavioral", "behavioural", "The behavioral study ended."],
  ["caliber", "calibre", "The caliber of the gun was small."],
  ["somber", "sombre", "The mood was somber."],
  ["specter", "spectre", "The specter of war returned."],
  ["luster", "lustre", "The pearls lost their luster."],
  ["meager", "meagre", "The meal was meager."],
  ["saber", "sabre", "He drew his saber."],
  ["centimeters", "centimetres", "The line is ten centimeters long."],
  ["millimeters", "millimetres", "It moved two millimeters."],
  ["millimeter", "millimetre", "It moved one millimeter."],
  ["centimeter", "centimetre", "The line is one centimeter long."],
  ["kilometers", "kilometres", "It is five kilometers away."],
  ["kilometer", "kilometre", "It is one kilometer away."],
  ["liter", "litre", "The bottle holds one liter."],
  ["liters", "litres", "The bottle holds two liters."],
  ["armored", "armoured", "The armored car came."],
  ["favored", "favoured", "The favored team lost."],
  ["rumored", "rumoured", "The rumored deal fell through."],
  ["grayer", "greyer", "The skies grew grayer."],
  ["grayest", "greyest", "It was the grayest day."],
  ["jewelers", "jewellers", "The jewelers closed early."],
  ["modeler", "modeller", "The modeler built a ship."],
  ["modelers", "modellers", "The modelers built a ship."],
  ["woolens", "woollens", "She packed her woolens."],
  ["totaling", "totalling", "The costs are totaling a million."],
  ["quarreling", "quarrelling", "They are quarreling again."],
  ["marveling", "marvelling", "We are marveling at the view."],
  ["canceling", "cancelling", "They are canceling the trip."],
  ["traveling", "travelling", "She is traveling abroad."],
  ["traveler", "traveller", "The traveler slept."],
  ["travelers", "travellers", "The travelers slept."],
  ["modeled", "modelled", "He modeled the data."],
  ["modeling", "modelling", "She is modeling the data."],
  ["labeled", "labelled", "They labeled the boxes."],
  ["labeling", "labelling", "They are labeling the boxes."],
  ["fueled", "fuelled", "The fire was fueled by oil."],
  ["fueling", "fuelling", "They are fueling the plane."],
  ["leveled", "levelled", "They leveled the field."],
  ["leveling", "levelling", "They are leveling the field."],
  ["signaled", "signalled", "The referee signaled a foul."],
  ["signaling", "signalling", "She is signaling a turn."],
  ["counseled", "counselled", "He counseled the students."],
  ["counseling", "counselling", "She is counseling the students."],
  ["quarreled", "quarrelled", "They quarreled all night."],
  ["marveled", "marvelled", "We marveled at the view."],
  ["channeling", "channelling", "She is channeling her anger."],
  ["dialed", "dialled", "He dialed the number."],
  ["dialing", "dialling", "He is dialing the number."],
  ["totaled", "totalled", "The costs totaled a million."],
  ["jeweler", "jeweller", "The jeweler closed early."],
  ["woolen", "woollen", "She wore a woolen hat."],
  ["gray", "grey", "The sky turned gray."],
  ["offense", "offence", "The offense was minor."],
  ["pretense", "pretence", "The pretense fooled nobody."],
  ["pajamas", "pyjamas", "He wore pajamas."],
  ["mustache", "moustache", "He shaved his mustache."],
];

const britishAndAustralian: Spelling[] = [
  ["plowed", "ploughed", "The farmer plowed the field."],
  ["plowed", "ploughed", "A plowed field lay there."],
  ["artifacts", "artefacts", "The museum keeps artifacts."],
  ["aluminum", "aluminium", "The can is made of aluminum."],
  ["skeptics", "sceptics", "The skeptics laughed."],
  ["skeptical", "sceptical", "She was skeptical."],
  ["skepticism", "scepticism", "The skepticism spread."],
  ["maneuver", "manoeuvre", "The maneuver worked."],
  ["fetus", "foetus", "The fetus grew."],
  ["anemia", "anaemia", "She has anemia."],
  ["esophagus", "oesophagus", "The esophagus burned."],
  ["estrogen", "oestrogen", "The estrogen level rose."],
  ["pediatric", "paediatric", "She works in a pediatric ward."],
  ["airplane", "aeroplane", "The airplane landed."],
  ["donut", "doughnut", "He ate a donut."],
  ["aging", "ageing", "The aging actor retired."],
];

const dialectErrorsIn = (text: string, locale: string) =>
  lint(nlp(text), { locale, "no-mixed-dialects": true })
    .filter(({ id }) => id === "no-mixed-dialects")
    .map(({ start, end, suggestions }) => ({
      flagged: text.slice(start, end),
      suggested: (suggestions ?? []).map(({ text: suggestion }) => suggestion),
    }));

const expectedFor = (wrong: string, right: string, flagged: boolean) =>
  flagged ? [{ flagged: wrong, suggested: [right] }] : [];

const checkGroup = (spellings: Spelling[], british: string[]) =>
  spellings.forEach(([american, britishWord, sentence]) => {
    const britishSentence = sentence.replace(american, britishWord);
    LOCALES.forEach((locale) => {
      const wantsBritish = british.includes(locale);
      it(`${locale}: "${sentence}"`, () => {
        assert.deepEqual(
          dialectErrorsIn(sentence, locale),
          expectedFor(american, britishWord, wantsBritish),
        );
      });
      it(`${locale}: "${britishSentence}"`, () => {
        assert.deepEqual(
          dialectErrorsIn(britishSentence, locale),
          expectedFor(britishWord, american, !wantsBritish),
        );
      });
    });
  });

describe("no-mixed-dialects: -ize and -yze spellings", () => {
  checkGroup(ize, britishIn.ize);
});

describe("no-mixed-dialects: -our, -re, doubled l and other spellings", () => {
  checkGroup(commonwealth, britishIn.commonwealth);
});

describe("no-mixed-dialects: spellings Canada shares with the United States", () => {
  checkGroup(britishAndAustralian, britishIn.britishAndAustralian);
});

describe("no-mixed-dialects: words that look like a spelling pair and are not", () => {
  [
    "Thomas Gray wrote an elegy.",
    "She drank Earl Grey tea.",
    "I was tired after the trip.",
  ].forEach((text) => {
    LOCALES.forEach((locale) => {
      it(`${locale}: "${text}"`, () => {
        assert.deepEqual(dialectErrorsIn(text, locale), []);
      });
    });
  });
});

describe("no-mixed-dialects: the plural noun analyses", () => {
  it("is not taken for the verb", () => {
    assert.deepEqual(
      dialectErrorsIn("The analyses were careful.", "en-US"),
      [],
    );
  });
});

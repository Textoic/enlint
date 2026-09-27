import queriesToErrors from "../queries-to-errors.js";
import { ErrorId, type ParsedToken, type Query } from "../types/index.js";

export type BadWordCategory =
  | "ai"
  | "cliche"
  | "empty"
  | "explained-verb"
  | "formalism"
  | "hedge"
  | "opinion"
  | "redundancy"
  | "variation";

export type BadWordEntry = {
  phrase: string;
  category: BadWordCategory;
  selector: string;
  suggestions?: string[];
  message?: string;
  automated?: boolean;
};

export const categoryMessages: Record<BadWordCategory, string> = {
  ai: "Avoid words and expressions that are common in AI-generated writing.",
  cliche: "Avoid clichés that make your writing stale",
  empty: "Remove empty phrases that add nothing to your writing",
  "explained-verb":
    "Avoid verb + adverb constructions when there's a stronger, shorter alternative",
  formalism: "Avoid formal or academic phrases if you aim for a natural tone",
  hedge: "Avoid cautious language to make your writing more persuasive",
  opinion:
    "Omit unpersuasive constructions that indicate something is the author's opinion",
  redundancy: "Replace redundant expressions with stronger single words",
  variation: "Prefer short, common words over rare words and long expressions",
};

export const lookupKey = (phrase: string) =>
  phrase.toLowerCase().replace(/^(?:an?|the) /u, "");

type CopulaRow = [
  copulas: string,
  adjectives: string,
  replacement: string,
  governed?: string,
];

const anyOf = (selectors: string[]) =>
  selectors.length === 1 ? selectors[0] : `:matches(${selectors.join(", ")})`;

const copula = (rows: CopulaRow[]): BadWordEntry[] =>
  rows.map(([copulas, adjectives, replacement, governed]) => {
    const verbs = copulas.split(" ");
    const words = adjectives.split(" ");
    const [verb, ...rest] = replacement.split(" ");
    return {
      phrase: `${verbs.join("/")} ${words
        .map((word) => word.replace(/\*$/u, ""))
        .join("/")}${governed ? ` ${governed}` : ""}`,
      category: "explained-verb",
      selector: `${anyOf(verbs.map((verb) => `[lemma=${verb}]`))} > ${anyOf(
        words.map((word) =>
          word.endsWith("*")
            ? `[lemma=${word.slice(0, -1)}]`
            : `[form=${word} i]`,
        ),
      )}${governed ? ` > [form=${governed} i]` : ""}`,
      suggestions: [[`:inflect(${verb})`, ...rest].join(" ")],
    };
  });

export const entries: BadWordEntry[] = [
  {
    phrase: "aamof",
    category: "variation",
    selector: "[form=aamof i]",
    suggestions: ["actually"],
  },
  {
    phrase: "ability to navigate",
    category: "ai",
    selector: "[lemma=ability] > [form=to i] > [lemma=navigate]",
    message:
      "Rewrite with the equivalent of 'can handle' or 'knows how to get through'",
  },
  {
    phrase: "according to me",
    category: "opinion",
    selector: "[form=according i] > [form=to i] > [form=me i]",
    suggestions: [""],
  },
  {
    phrase: "actual fact",
    category: "redundancy",
    selector: "[lemma=fact] > [form=actual i]",
    suggestions: [":inflect(fact)"],
  },
  {
    phrase: "add a layer",
    category: "ai",
    selector: "[lemma=add] > [form=layer i]",
    message: "Rewrite with 'add an extra element'",
  },
  {
    phrase: "add a layer of complexity",
    category: "ai",
    selector: "[lemma=add] > [lemma=layer] > [form=of i] > [form=complexity i]",
    suggestions: [":inflect(complicate)"],
  },
  {
    phrase: "add insult to injury",
    category: "cliche",
    selector: "[lemma=add] > [lemma=insult] > [form=to i] > [form=injury i]",
    suggestions: [":inflect(aggravate)"],
  },
  {
    phrase: "added bonus",
    category: "redundancy",
    selector: "[lemma=bonus] > [form=added i]",
    suggestions: ["bonus"],
  },
  {
    phrase: "address the root cause",
    category: "ai",
    selector: "[lemma=address] > [lemma=cause] > [form=root]",
    message:
      "Name what actually causes the problem and say you are fixing that, instead of 'addressing the root cause'",
  },
  {
    phrase: "affluent",
    category: "variation",
    selector: "[lemma=affluent]",
    suggestions: ["wealthy"],
  },
  {
    phrase: "after all is said and done",
    category: "variation",
    selector:
      "[form=after i] > [lemma=be] > [form=all i] ~ [form=said i] > [form=and i] > [form=done i]",
    suggestions: ["at last"],
  },
  {
    phrase: "aim to explore",
    category: "ai",
    selector: "[lemma=aim] > [form=to i] > [lemma=explore]",
    message:
      "Say what the work does, not what it aims to do: 'the study aims to explore X' => 'the study looks at X'",
  },
  {
    phrase: "align with",
    category: "ai",
    selector: "[lemma=align] > [form=with i]",
    suggestions: [":inflect(match)", ":inflect(agree)", ":inflect(fit)"],
  },
  {
    phrase: "all things being equal",
    category: "empty",
    selector: "[form=being i][xpos=VERB] > [form=things i] ~ [form=equal i]",
    suggestions: [""],
  },
  {
    phrase: "along the lines of",
    category: "variation",
    selector: "[form=along i] > [lemma=line] > [form=of i]",
    suggestions: ["like"],
  },
  {
    phrase: "alternative choice",
    category: "redundancy",
    selector: "[lemma=choice] > [form=alternative i]",
    suggestions: [":inflect(choice)"],
  },
  {
    phrase: "amiable / amicable",
    category: "variation",
    selector:
      ":matches([form=amiable i][xpos=ADJ], [form=amicable i][xpos=ADJ])",
    suggestions: ["friendly"],
  },
  {
    phrase: "amidst",
    category: "variation",
    selector: "[form=amidst i]",
    message:
      "Rewrite using the word 'during', 'in' or 'among' depending on what makes the most sense given the context",
  },
  {
    phrase: "amongst",
    category: "variation",
    selector: "[form=amongst i]",
    suggestions: ["among"],
  },
  {
    phrase: "an analysis of the data",
    category: "ai",
    selector: "[lemma=analysis] > [form=of i] > [form=data i]",
    message: "Rewrite as a phrase: 'the data shows'",
  },
  {
    phrase: "an approach ensures",
    category: "ai",
    selector: "[lemma=ensure] > [lemma=approach]",
    message:
      "Say who does what and what happens as a result, instead of crediting the approach",
  },
  {
    phrase: "as a matter of fact",
    category: "variation",
    selector: "[form=as i] > [form=matter i] > [form=of i] > [form=fact i]",
    suggestions: ["actually"],
  },
  {
    phrase: "as a result of",
    category: "variation",
    selector: "[form=as i] > [form=result i] > [form=of i]",
    suggestions: ["because"],
  },
  {
    phrase: "as far as I am concerned",
    category: "opinion",
    selector:
      "[form=as i] > [form=far i] > [form=as i] > [lemma=be] > [lemma=concern]",
    suggestions: [""],
  },
  {
    phrase: "as mentioned earlier",
    category: "empty",
    selector: "[form=as i] > [lemma=mention] > [form=earlier i]",
    suggestions: [""],
  },
  {
    phrase: "as to whether",
    category: "redundancy",
    selector: "[form=as i] > [form=to i] > [form=whether i]",
    suggestions: ["whether"],
  },
  {
    phrase: "as we can see",
    category: "empty",
    selector: "[form=as i] > [lemma=can] > [lemma=see]",
    suggestions: [""],
  },
  {
    phrase: "as yet",
    category: "redundancy",
    selector: "[form=as i] > [form=yet i]",
    suggestions: ["yet"],
  },
  {
    phrase: "associated with",
    category: "variation",
    selector: "[form=associated i] > [form=with i]",
    suggestions: ["linked to"],
  },
  {
    phrase: "assuming/conceding/granted/supposing that",
    category: "variation",
    selector:
      ":matches([form=assuming i], [form=conceding i], [form=granted i], [form=supposing i]) > [form=that i]",
    suggestions: ["if"],
  },
  {
    phrase: "at a point in time",
    category: "variation",
    selector:
      "[form=at i] > [form=point i]:not(:has(> :matches([form=this i], [form=that i]))) > [form=in i] > [form=time i]",
    message:
      "Rewrite with 'then' or 'when': 'at which point in time did it fail?' => 'when did it fail?'",
  },
  {
    phrase: "at loose ends",
    category: "cliche",
    selector: "[form=at i] > [form=ends i] > [form=loose i]",
    suggestions: ["uneasy"],
  },
  {
    phrase: "at that point in time",
    category: "variation",
    selector:
      "[form=at i] > [form=point i] > [form=that i] ~ [form=in i] > [form=time i]",
    suggestions: ["then"],
  },
  {
    phrase: "at the end of the day",
    category: "empty",
    selector:
      "[form=at i] > [form=end i] > [form=the i] ~ [form=of i] > [form=day i] > [form=the i]",
    suggestions: [""],
  },
  {
    phrase: "at the hands of",
    category: "variation",
    selector: "[form=at i] > [lemma=hand] > [form=of i]",
    suggestions: ["by"],
  },
  {
    phrase: "at the intersection of",
    category: "formalism",
    selector: "[form=at i] > [form=intersection i] > [form=of i]",
  },
  {
    phrase: "at the present time",
    category: "variation",
    selector: "[form=at i] > [lemma=time] > [form=present i]",
    suggestions: ["now"],
  },
  {
    phrase: "at this point in time",
    category: "variation",
    selector:
      "[form=at i] > [form=point i] > [form=this i] ~ [form=in i] > [form=time i]",
    suggestions: ["now"],
  },
  {
    phrase: "audacious",
    category: "variation",
    selector: "[form=audacious i][xpos=ADJ]",
    suggestions: ["bold"],
  },
  {
    phrase: "be a testament to",
    category: "variation",
    selector: "[lemma=be] > [form=testament i] > [form=to i]",
    suggestions: [":inflect(show)"],
  },
  {
    phrase: "be aware/cognizant/conscious of",
    category: "variation",
    selector:
      "[lemma=be] > :matches([form=aware i], [form=cognizant i], [form=conscious i]) > [form=of i]",
    suggestions: [":inflect(know) about"],
  },
  {
    phrase: "be familiar/acquainted with",
    category: "variation",
    selector:
      "[lemma=be] > :matches([form=familiar i], [form=acquainted i]) > [form=with i]",
    suggestions: [":inflect(know)"],
  },
  {
    phrase: "be in need of",
    category: "variation",
    selector: "[lemma=be] > [form=in i] > [form=need i] > [form=of i]",
    suggestions: [":inflect(need)"],
  },
  {
    phrase: "be in possession of",
    category: "variation",
    selector: "[lemma=be] > [form=in i] > [form=possession i] > [form=of i]",
    suggestions: [":inflect(have)"],
  },
  {
    phrase: "be not sure",
    category: "explained-verb",
    selector: "[lemma=be] > [form=sure i] > [lemma=not]",
    suggestions: [":inflect(doubt)"],
  },
  {
    phrase: "be not willing",
    category: "explained-verb",
    selector: "[lemma=be] > [form=willing i] > [lemma=not]",
    suggestions: [":inflect(refuse)"],
  },
  {
    phrase: "be unsure",
    category: "explained-verb",
    selector: "[lemma=be] > [form=unsure i]",
    suggestions: [":inflect(doubt)"],
  },
  {
    phrase: "be unwilling",
    category: "explained-verb",
    selector: "[lemma=be] > [form=unwilling i]",
    suggestions: [":inflect(refuse)"],
  },
  {
    phrase: "a beacon of",
    category: "cliche",
    selector: "[form=beacon i] > [form=of i]",
    message:
      "Rewrite this phrase to go from 'a beacon of X' to describe it with an adjective that conveys X. Example: 'Her smile, once a beacon of warmth' => 'Her smile, once warm'.",
  },
  {
    phrase: "beat a retreat",
    category: "redundancy",
    selector: "[lemma=beat] > [lemma=retreat]",
    suggestions: [":inflect(retreat)"],
  },
  {
    phrase: "beauteous / ravishing / splendiferous / pulchritudinous",
    category: "variation",
    selector:
      ":matches([form=beauteous i][xpos=ADJ], [form=ravishing i][xpos=ADJ], [form=splendiferous i][xpos=ADJ], [form=pulchritudinous i][xpos=ADJ])",
    suggestions: ["beautiful"],
  },
  ...copula([
    ["become", "aware", "realize", "of"],
    ["become", "dry", "dry"],
    ["become", "known apparent", "emerge"],
    ["become", "liquid", "liquefy"],
    ["become", "pregnant", "conceive"],
    ["become", "solid", "solidify"],
    ["become get", "different", "change"],
    ["become get", "established", "establish"],
    ["become get", "hot", "heat"],
    ["become get", "large", "enlarge"],
    ["become get", "smaller shorter", "shrink"],
    ["become get", "smaller shorter", "shrink to less than", "than"],
    ["become get", "taller bigger", "grow"],
    ["become get", "taller bigger", "grow bigger than", "than"],
    ["become get grow", "old", "age"],
    ["become get make", "blacker", "blacken"],
    ["become get make", "cold*", "chill"],
    ["become get make", "damp*", "dampen"],
    ["become get make", "darker", "darken"],
    ["become get make", "deep*", "deepen"],
    ["become get make", "lighter", "lighten"],
    ["become get make", "longer", "lengthen"],
    ["become get make", "stronger", "strengthen"],
    ["become get make", "worse", "worsen"],
    ["become make", "better", "improve"],
    ["become make", "broad*", "broaden"],
    ["become make", "even", "even"],
    ["become make", "stiff*", "stiffen"],
    ["become make", "strong*", "strengthen"],
    ["become make", "sweet*", "sweeten"],
    ["become make", "thick*", "thicken"],
  ]),
  {
    phrase: "beg the question",
    category: "cliche",
    selector: "[lemma=beg] > [lemma=question]",
    message: "Skip the filler, just ask the question",
  },
  {
    phrase: "beyond a shadow of a doubt",
    category: "cliche",
    selector: "[form=beyond i] > [lemma=shadow] > [form=of i] > [lemma=doubt]",
    suggestions: ["absolutely"],
  },
  {
    phrase: "bite off more than one can chew",
    category: "cliche",
    selector:
      ":matches([lemma=bite], [form=bit i], [form=bits i], [form=biting i]) > [form=off i] > [form=more i] > [form=than i] > :matches([lemma=can], [form=could i]) > [lemma=chew]",
    suggestions: [":inflect(overextend)"],
  },
  {
    phrase: "blend together",
    category: "redundancy",
    selector: "[lemma=blend] > [form=together i]",
    suggestions: [":inflect(blend)"],
  },
  {
    phrase: "boil the ocean",
    category: "cliche",
    selector: "[lemma=boil] > [form=ocean i]",
    message: "Delete the phrase.",
  },
  {
    phrase: "bolster",
    category: "ai",
    selector: "[lemma=bolster]",
    suggestions: [":inflect(strengthen)", ":inflect(support)"],
  },
  {
    phrase: "breath coming in ragged gasps",
    category: "cliche",
    selector:
      "[form=breath i] > [form=coming i] > [form=in i] > [lemma=gasp] > [form=ragged i]",
    message:
      "Use a shorter description to convey fear of anxiety, such as 'trembling', 'panicked', 'terrified' or 'breathless'.",
  },
  {
    phrase: "brief moment",
    category: "redundancy",
    selector: "[lemma=moment] > [form=brief i]",
    suggestions: [":inflect(moment)"],
  },
  {
    phrase: "built on top of",
    category: "ai",
    selector: "[lemma=build] > [form=on i] > [form=top i] > [form=of i]",
    message:
      "When one technology relies on another, say that the other powers it: 'the app is built on top of Postgres' => 'Postgres powers the app'",
  },
  {
    phrase: "bury the hatchet",
    category: "cliche",
    selector: "[lemma=bury] > [form=hatchet i]",
    suggestions: [":inflect(make) peace"],
  },
  {
    phrase: "bustle",
    category: "variation",
    selector: "[lemma=bustle][xpos=VERB]",
    suggestions: [":inflect(scurry)", ":inflect(move) quickly"],
  },
  {
    phrase: "bustling",
    category: "variation",
    selector: "[form=bustling i][xpos=ADJ]",
    message: "Remove 'bustling', it's not necessary describing this",
  },
  {
    phrase: "busy as a bee",
    category: "cliche",
    selector: "[form=busy i] > [form=as i] > [lemma=bee]",
    suggestions: ["busy"],
  },
  {
    phrase: "by cause/reason/virtue of",
    category: "variation",
    selector:
      "[form=by i] > :matches([form=cause i], [form=reason i], [form=virtue i]) > [form=of i]",
    suggestions: ["because"],
  },
  {
    phrase: "by orders of magnitude",
    category: "variation",
    selector: "[form=by i] > [lemma=order] > [form=of i] > [form=magnitude i]",
    suggestions: ["massively", "considerably"],
  },
  {
    phrase: "byte-for-byte",
    category: "ai",
    selector: ":matches([form=byte-for-byte i], [form=bit-for-bit i])",
    message: "Write 'identical', or say what you compared and how",
  },
  {
    phrase: "byte-identical/bit-identical",
    category: "ai",
    selector: ":matches([form=byte-identical i], [form=bit-identical i])",
    suggestions: ["identical"],
  },
  {
    phrase: "call loudly",
    category: "explained-verb",
    selector: "[lemma=call] > [form=loudly i]",
    suggestions: [":inflect(cry)"],
  },
  {
    phrase: "cameo appearance",
    category: "redundancy",
    selector: "[lemma=appearance] > [form=cameo i]",
    suggestions: ["cameo"],
  },
  {
    phrase: "cannot help but",
    category: "empty",
    selector: "[Mood=Pot] > [lemma=help] > [lemma=not] ~ [form=but i]",
    suggestions: [""],
  },
  {
    phrase: "carefully constructed",
    category: "ai",
    selector: "[form=constructed i] > [form=carefully i]",
    suggestions: ["well-planned", "thoughtfully put together"],
  },
  {
    phrase: "carry a weight",
    category: "ai",
    selector: "[lemma=carry] > [lemma=weight]",
    suggestions: [":inflect(matter)", ":inflect(count)"],
  },
  {
    phrase: "catalyst",
    category: "variation",
    selector: "[lemma=catalyst]",
    suggestions: [":inflect(trigger)", ":inflect(cause)"],
  },
  {
    phrase: "catalyze",
    category: "variation",
    selector:
      ":matches([lemma=catalyze], [lemma=catalyse], [form=catalyzed i], [form=catalysed i], [form=catalyzing i], [form=catalysing i])",
    suggestions: [":inflect(trigger)", ":inflect(cause)"],
  },
  {
    phrase: "cause a drop in",
    category: "variation",
    selector: "[lemma=cause] > [lemma=drop] > [form=in i]",
    suggestions: [":inflect(reduce)"],
  },
  {
    phrase: "cerebrate / ideate / intellectualize / logicalize",
    category: "variation",
    selector:
      ":matches([lemma=cerebrate], [lemma=ideate], [lemma=intellectualize], [lemma=logicalize])",
    suggestions: [":inflect(think)"],
  },
  {
    phrase: "certainly",
    category: "ai",
    selector: "[form=certainly i]",
    message:
      "Cut it, along with whatever qualifies it: 'the release will almost certainly slip' => 'the release will slip'",
  },
  {
    phrase: "choose one's words carefully",
    category: "ai",
    selector: "[lemma=choose] > [lemma=word] ~ [form=carefully i]",
    message: "Rewrite using 'watching (his/her) words'",
  },
  {
    phrase: "a clarion call",
    category: "cliche",
    selector: "[form=call i] > [form=clarion i]",
    message:
      "Rewrite this whole sentence to describe how something is a 'clear signal' or a 'compelling appeal'.",
  },
  {
    phrase: "clear as crystal",
    category: "cliche",
    selector: "[lemma=clear] > [form=as i] > [form=crystal i]",
    suggestions: ["transparent"],
  },
  {
    phrase: "close proximity",
    category: "redundancy",
    selector: "[form=proximity i] > [form=close i]",
    suggestions: ["proximity"],
  },
  {
    phrase: "cloud one's judgement",
    category: "ai",
    selector: "[lemma=cloud] > [lemma=judgement]",
    message:
      "Rewrite with the equivalent of 'bias', either as a verb or as a noun",
  },
  {
    phrase: "cogitate",
    category: "variation",
    selector: "[lemma=cogitate]",
    suggestions: [":inflect(ponder)"],
  },
  {
    phrase: "cognize / cognise",
    category: "variation",
    selector: ":matches([lemma=cognize], [lemma=cognise])",
    suggestions: [":inflect(know)"],
  },
  {
    phrase: "commence / dive headfirst",
    category: "variation",
    selector: ":matches([lemma=commence], [lemma=dive] > [form=headfirst i])",
    suggestions: [":inflect(start)", ":inflect(begin)"],
  },
  {
    phrase: "commitment to",
    category: "ai",
    selector: "[lemma=commitment] > [form=to i]",
    message: "Use a verb: say what they promised to do",
  },
  {
    phrase: "a commitment to excellence",
    category: "ai",
    selector: "[lemma=commitment] > [form=to i] [lemma=excellence]",
    message:
      "Rewrite this as a verb expressing someone is 'decided to do things right'",
  },
  {
    phrase: "a complex interplay",
    category: "ai",
    selector: "[lemma=interplay] > [lemma=complex]",
    suggestions: ["link", "complicated relationship"],
  },
  {
    phrase: "comprehensive",
    category: "ai",
    selector: "[form=comprehensive i]",
    suggestions: ["broad", "wide", "complete"],
  },
  {
    phrase: "conceptualization",
    category: "variation",
    selector: "[lemma=conceptualization]",
    suggestions: [":inflect(interpretation)"],
  },
  {
    phrase: "conceptualize",
    category: "variation",
    selector: "[lemma=conceptualize]",
    suggestions: [":inflect(interpret)"],
  },
  {
    phrase: "connected with/to",
    category: "variation",
    selector: "[form=connected i] > :matches([form=with i], [form=to i])",
    suggestions: ["linked to"],
  },
  {
    phrase: "continue to inspire",
    category: "ai",
    selector: "[lemma=continue] > [form=to i] > [lemma=inspire]",
    suggestions: ["still :inflect(inspire)"],
  },
  {
    phrase: "contribute to",
    category: "ai",
    selector: "[lemma=contribute] > [form=to i]",
    suggestions: [":inflect(lead)", ":inflect(cause)"],
  },
  {
    phrase: "cornerstone",
    category: "ai",
    selector: "[lemma=cornerstone]",
    suggestions: [":inflect(foundation)", ":inflect(basis)"],
  },
  {
    phrase: "corporate greed",
    category: "cliche",
    selector: "[form=greed i] > [form=corporate i]",
    message:
      "Corporate greed is a cliché. Describe instead a specific way in which a specific company is doing something illegal, immoral or reckless for profit, or if there are no examples remove this altogether.",
  },
  {
    phrase: "a crucial/pivotal/vital/key role/moment",
    category: "ai",
    selector:
      ":matches([lemma=role], [lemma=moment]) > :matches([form=crucial i], [form=pivotal i], [form=vital i], [form=key i])",
    message: "Say what the person or thing actually did",
  },
  {
    phrase: "a crucible of",
    category: "cliche",
    selector: "[form=crucible i] > [form=of i]",
    message:
      "Rewrite this whole sentence to avoid using 'crucible' as a metaphor. If it's used to mean something that is enduring a difficult situation, use 'test', 'trial' or 'gauntlet' instead.",
  },
  {
    phrase: "cultivate",
    category: "ai",
    selector: "[lemma=cultivate]",
    suggestions: [":inflect(build)", ":inflect(grow)", ":inflect(develop)"],
  },
  {
    phrase: "current trend",
    category: "redundancy",
    selector: "[lemma=trend] > [form=current i]",
    suggestions: [":inflect(trend)"],
  },
  {
    phrase: "cut to the chase",
    category: "cliche",
    selector: "[lemma=cut] > [form=to i] > [form=chase i]",
    suggestions: [":inflect(summarize)"],
  },
  {
    phrase: "cutting-edge",
    category: "ai",
    selector: "[form=cutting-edge i]",
    suggestions: ["new", "latest", "modern"],
  },
  {
    phrase: "deconstruct",
    category: "variation",
    selector: "[lemma=deconstruct]",
    suggestions: [":inflect(examine)"],
  },
  {
    phrase: "decrease in strength",
    category: "variation",
    selector: "[lemma=decrease] > [form=in i] > [form=strength i]",
    suggestions: [":inflect(weaken)"],
  },
  {
    phrase: "deep dive",
    category: "ai",
    selector: "[lemma=dive] > [form=deep i]",
    message: "Rewrite when it's a metaphor for a long exploration of a subject",
  },
  {
    phrase: "deeply rooted",
    category: "ai",
    selector: "[form=rooted i] > [form=deeply i]",
    suggestions: ["ingrained", "entrenched"],
  },
  {
    phrase: "deeply-rooted",
    category: "ai",
    selector: "[form=deeply-rooted i]",
    suggestions: ["ingrained", "entrenched"],
  },
  {
    phrase: "delve",
    category: "variation",
    selector: "[lemma=delve]",
    message: "Rewrite using 'explore', 'investigate' or 'examine'",
  },
  {
    phrase: "delve into",
    category: "variation",
    selector: "[lemma=delve] [form=into i]",
    suggestions: [
      ":inflect(explore)",
      ":inflect(investigate)",
      ":inflect(examine)",
      ":inflect(look) into",
    ],
  },
  {
    phrase: "demonstrate",
    category: "ai",
    selector: "[lemma=demonstrate]",
    suggestions: [":inflect(show)", ":inflect(display)"],
  },
  {
    phrase: "depreciate in value",
    category: "variation",
    selector: "[lemma=depreciate] > [form=in i] > [form=value i]",
    suggestions: [":inflect(depreciate)"],
  },
  {
    phrase: "desiderate",
    category: "variation",
    selector: "[lemma=desiderate]",
    suggestions: [":inflect(desire)"],
  },
  {
    phrase: "despite the challenge/fact",
    category: "ai",
    selector: "[form=despite i] > :matches([lemma=challenge], [lemma=fact])",
    message:
      "Name the specific obstacle, or drop the concession and state what happened",
  },
  {
    phrase: "diaspora",
    category: "variation",
    selector: "[lemma=diaspora]",
    suggestions: [":inflect(dispersion)"],
  },
  {
    phrase: "dimly lit",
    category: "variation",
    selector: "[form=lit i] > [form=dimly i]",
    suggestions: ["dark", "somber", "shadowy"],
  },
  {
    phrase: "a diverse perspective",
    category: "ai",
    selector: "[lemma=perspective] > [form=diverse i]",
    suggestions: ["different :inflect(view)", "varied :inflect(opinion)"],
  },
  {
    phrase: "do not remember",
    category: "variation",
    selector:
      ":matches([lemma=do], [form=can i], [form=could i]) > [lemma=remember] > [form=not i]",
    suggestions: [":inflect(forget)"],
  },
  {
    phrase: "during the course of",
    category: "variation",
    selector: "[form=during i] > [form=course i] > [form=of i]",
    suggestions: ["during"],
  },
  {
    phrase: "dynamic",
    category: "ai",
    selector: "[form=dynamic i][xpos=ADJ]",
    suggestions: ["changing", "active"],
  },
  {
    phrase: "each and every",
    category: "variation",
    selector: "[form=each i] > [form=and i] > [form=every i]",
    suggestions: ["each"],
  },
  {
    phrase: "easier said than done",
    category: "variation",
    selector:
      ":matches([form=easier i], [form=sooner i], [form=better i]) ~ [lemma=say] > [form=than i] > [form=done i]",
    suggestions: ["hard"],
  },
  {
    phrase: "echo",
    category: "ai",
    selector: "[lemma=echo][xpos=VERB]",
    message:
      "When it means 'repeat', rewrite as 'repeat'. When it means 'resonate', rewrite as 'resonate'",
  },
  {
    phrase: "elevate",
    category: "variation",
    selector: "[lemma=elevate i]",
    message:
      "Rewrite as 'high' if referring to physical altitude, and 'exalted' or 'sublime' if referring to something or someone's high quality",
  },
  {
    phrase: "elucidate",
    category: "variation",
    selector: "[lemma=elucidate]",
    suggestions: [":inflect(explain)"],
  },
  {
    phrase: "embark",
    category: "variation",
    selector: "[lemma=embark]",
    message: "Rewrite using 'start' or 'begin'",
  },
  {
    phrase: "emphasize",
    category: "ai",
    selector: "[lemma=emphasize][xpos=VERB]",
    suggestions: [
      ":inflect(underline)",
      ":inflect(stress)",
      ":inflect(point) out",
    ],
  },
  {
    phrase: "emphasize/underscore/highlight the need/potential",
    category: "ai",
    selector:
      ":matches([lemma=emphasize], [lemma=underscore], [lemma=highlight]) > :matches([lemma=need], [lemma=potential])",
    message:
      "Say what is needed or what is possible, instead of reporting that a need or a potential is being pointed at",
  },
  {
    phrase: "empower",
    category: "variation",
    selector: "[lemma=empower][xpos=VERB]",
    suggestions: [":inflect(enable)"],
  },
  {
    phrase: "encompass",
    category: "variation",
    selector: "[lemma=encompass]",
    suggestions: [":inflect(include)", ":inflect(cover)"],
  },
  {
    phrase: "endeavor (noun)",
    category: "ai",
    selector: "[lemma=endeavor][xpos=NOUN]",
    suggestions: [":inflect(attempt)", ":inflect(effort)"],
  },
  {
    phrase: "endeavor (verb)",
    category: "ai",
    selector: "[lemma=endeavor][xpos=VERB]",
    suggestions: [":inflect(try)"],
  },
  {
    phrase: "enduring",
    category: "ai",
    selector: "[form=enduring i][xpos=ADJ]",
    suggestions: ["lasting"],
  },
  {
    phrase: "an enduring legacy",
    category: "ai",
    selector: "[lemma=legacy] > [form=enduring i]",
    message:
      "Drop 'enduring', or say what the person left behind that people still use",
  },
  {
    phrase: "enhance",
    category: "ai",
    selector: "[lemma=enhance]",
    suggestions: [":inflect(improve)", ":inflect(boost)"],
  },
  {
    phrase: "ensure compliance",
    category: "ai",
    selector: "[lemma=ensure] > [form=compliance i]",
    message:
      "Rewrite to mean 'make sure (someone) plays/follows along' or 'make (someone) go along with it'",
  },
  {
    phrase: "the evidence base",
    category: "ai",
    selector: "[lemma=base] > [form=evidence i]",
    suggestions: [":inflect(evidence)"],
  },
  {
    phrase: "evolving landscape",
    category: "ai",
    selector: "[lemma=landscape] > [form=evolving i]",
    message: "Name the thing that is changing, and say how",
  },
  {
    phrase: "exact same",
    category: "redundancy",
    selector: "[form=exact i] ~ [lemma=same]",
    suggestions: ["same"],
  },
  {
    phrase: "an exceptional performance",
    category: "ai",
    selector: "[lemma=performance] > [form=exceptional i]",
    message:
      "Rewrite with the equivalent of 'great', 'outstanding' or 'remarkable'",
  },
  {
    phrase: "exemplify",
    category: "ai",
    selector: "[lemma=exemplify]",
    suggestions: [":inflect(show)"],
  },
  {
    phrase: "exhibit a tendency to",
    category: "variation",
    selector: "[lemma=exhibit] > [form=tendency i] > [form=to i]",
    suggestions: [":inflect(tend) to"],
  },
  {
    phrase: "experts/critics argue",
    category: "ai",
    selector:
      ":matches([lemma=argue], [lemma=claim]) > :matches([lemma=expert], [lemma=critic])",
    message: "Avoid vague generalizations, point to specific claims",
  },
  {
    phrase: "face adversity",
    category: "ai",
    selector: "[lemma=face] > [lemma=adversity]",
    suggestions: [":inflect(struggle)", ":inflect(suffer)"],
  },
  {
    phrase: "facilitate",
    category: "variation",
    selector: "[lemma=facilitate]",
    suggestions: [":inflect(help)"],
  },
  {
    phrase: "the fact that",
    category: "empty",
    selector: "[form=fact i] > [form=the i] ~ [form=that i]",
    message: "Rewrite the sentence without this",
  },
  {
    phrase: "fast-paced",
    category: "ai",
    selector: "[form=fast-paced i]",
    suggestions: ["fast", "hectic", "quick"],
  },
  {
    phrase: "feel the necessity for",
    category: "variation",
    selector: "[lemma=feel] > [form=necessity i] > [form=for i]",
    suggestions: [":inflect(need)"],
  },
  {
    phrase: "few and far between",
    category: "cliche",
    selector: "[form=few i] > [form=and i] > [form=far i] > [form=between i]",
    suggestions: ["scarce"],
  },
  {
    phrase: "fleeting",
    category: "ai",
    selector: "[form=fleeting i][xpos=ADJ]",
    suggestions: ["brief", "quick"],
  },
  {
    phrase: "focal point",
    category: "ai",
    selector: "[lemma=point] > [form=focal i]",
    suggestions: [":inflect(center)", ":inflect(focus)"],
  },
  {
    phrase: "for all intents and purposes",
    category: "empty",
    selector:
      "[form=for i] > [form=intents i] > [form=all i] ~ [form=and i] > [form=purposes i]",
    suggestions: [""],
  },
  {
    phrase: "for the most part",
    category: "empty",
    selector: "[form=for i] > [form=part i] > [form=the i] ~ [form=most i]",
    suggestions: [""],
  },
  {
    phrase: "for the purpose of",
    category: "variation",
    selector: "[form=for i] > [form=purpose i] > [form=of i]",
    suggestions: ["to"],
  },
  {
    phrase: "for the reason that",
    category: "variation",
    selector: "[form=for i] > [form=reason i] > [form=the i] ~ [form=that i]",
    suggestions: ["because"],
  },
  {
    phrase: "foreseeable future",
    category: "redundancy",
    selector: "[form=future i] > [form=foreseeable i]",
    suggestions: ["future"],
  },
  {
    phrase: "foster",
    category: "ai",
    selector: "[lemma=foster][xpos=VERB]",
    suggestions: [":inflect(encourage)", ":inflect(support)"],
  },
  {
    phrase: "from my personal perspective/standpoint",
    category: "opinion",
    selector:
      "[form=from i] > :matches([form=perspective i], [form=standpoint i]) > :matches([form=personal i], [form=my i])",
    suggestions: [""],
  },
  {
    phrase: "from the point of view",
    category: "opinion",
    selector: "[form=from i] > [form=point i] > [form=of i] > [form=view i]",
    suggestions: [""],
  },
  {
    phrase: "from the point of view of",
    category: "variation",
    selector:
      "[form=from i] > [form=point i] > [form=of i] > [form=view i] > [form=of i]",
    message:
      "Say what that person or group thinks: 'from the point of view of the users, the change is welcome' => 'the users welcome the change'",
  },
  {
    phrase: "fully grasp",
    category: "ai",
    selector: "[lemma=grasp] > [form=fully i]",
    suggestions: ["entirely :inflect(understand)", "totally :inflect(get)"],
  },
  {
    phrase: "furthermore/moreover/additionally",
    category: "empty",
    selector:
      ":matches([form=furthermore i], [form=moreover i], [form=additionally i])",
    suggestions: ["also", ""],
  },
  {
    phrase: "gain an insight",
    category: "ai",
    selector: "[lemma=gain] > [lemma=insight]",
    suggestions: [":inflect(learn)", ":inflect(understand)"],
  },
  {
    phrase: "galvanize",
    category: "ai",
    selector: ":matches([lemma=galvanize], [lemma=galvanise])",
    suggestions: [":inflect(motivate)", ":inflect(inspire)", ":inflect(rally)"],
  },
  {
    phrase: "game-changer",
    category: "ai",
    selector:
      ":matches([form=game-changer i], [form=game-changers i], [form=game-changing i])",
    suggestions: ["revolutionary"],
  },
  {
    phrase: "garner",
    category: "variation",
    selector: "[lemma=garner]",
    suggestions: [":inflect(get)", ":inflect(gain)"],
  },
  {
    phrase: "genuinely",
    category: "empty",
    selector: "[form=genuinely i]",
    suggestions: [""],
  },
  {
    phrase: "give an account of",
    category: "variation",
    selector: "[lemma=give] > [form=account i] > [form=of i]",
    suggestions: [":inflect(tell)"],
  },
  {
    phrase: "give rise to",
    category: "variation",
    selector: "[lemma=give] > [form=rise i] > [form=to i]",
    suggestions: [":inflect(create)"],
  },
  {
    phrase: "green with envy",
    category: "cliche",
    selector: "[form=green i] > [form=with i] > [form=envy i]",
    suggestions: ["jealous"],
  },
  {
    phrase: "ground-truth",
    category: "ai",
    selector: ":matches([form=ground-truth i], [form=ground-truths i])",
    suggestions: ["reference"],
  },
  {
    phrase: "hale and hearty",
    category: "cliche",
    selector: "[form=hale i] > [form=and i] > [form=hearty i]",
    suggestions: ["healthy"],
  },
  {
    phrase: "hang in the air between",
    category: "cliche",
    selector: "[lemma=hang] > [form=in i] > [form=air i] > [form=between i]",
    message:
      "Delete the sentence. What hangs in the air between two people is never what the scene is about, and the sentence around it already says it",
  },
  {
    phrase: "harness",
    category: "ai",
    selector: "[lemma=harness][xpos=VERB]",
    suggestions: [":inflect(use)"],
  },
  {
    phrase: "have knowledge of",
    category: "variation",
    selector: "[lemma=have] > [form=knowledge i] > [form=of i]",
    suggestions: [":inflect(know)"],
  },
  {
    phrase: "have the effect of",
    category: "variation",
    selector: "[lemma=have] > [form=effect i] > [form=of i]",
    suggestions: [":inflect(cause)"],
  },
  {
    phrase: "he is the man who is",
    category: "variation",
    selector:
      "[lemma=be] > [form=he i] ~ [form=man i] > [lemma=be] > [PronType=Rel]",
    suggestions: ["he is"],
  },
  {
    phrase: "heart pounding against one's ribs",
    category: "variation",
    selector:
      "[lemma=pound][xpos=VERB] > [form=heart i] ~ [form=against i] > [lemma=rib]",
    suggestions: ["heart :inflect(pound)"],
  },
  {
    phrase: "heart pounding in one's chest",
    category: "variation",
    selector:
      "[lemma=pound][xpos=VERB] > [form=heart i] ~ [form=in i] > [lemma=chest]",
    suggestions: ["heart :inflect(pound)"],
  },
  {
    phrase: "highlight",
    category: "ai",
    selector: "[lemma=highlight][xpos=VERB]",
    suggestions: [
      ":inflect(underline)",
      ":inflect(stress)",
      ":inflect(point) out",
    ],
  },
  {
    phrase: "hold out an olive branch",
    category: "cliche",
    selector: "[lemma=hold] > [form=out i] > [form=branch i] > [form=olive i]",
    suggestions: [":inflect(offer) to make peace"],
  },
  {
    phrase: "hold tightly",
    category: "explained-verb",
    selector: "[lemma=hold] > [form=tightly i]",
    suggestions: [":inflect(clutch)"],
  },
  {
    phrase: "holistic",
    category: "variation",
    selector: "[form=holistic i]",
    suggestions: ["complete", "whole"],
  },
  {
    phrase: "hone one's skills",
    category: "ai",
    selector: "[lemma=hone] > [lemma=skill]",
    message: "Rewrite with the equivalent of 'improve (one's) skills'",
  },
  {
    phrase: "I believe that",
    category: "opinion",
    selector: "[form=believe i] > [form=I i] ~ [form=that i]",
    suggestions: [""],
  },
  {
    phrase: "identify an area of improvement",
    category: "ai",
    selector:
      "[lemma=identify] > [lemma=area] > [form=of i] > [form=improvement i]",
    message: "Rewrite saying what to improve",
  },
  {
    phrase: "imo / imho / personally",
    category: "opinion",
    selector: ":matches([form=imo i], [form=imho i], [form=personally i])",
    suggestions: [""],
  },
  {
    phrase: "implication",
    category: "ai",
    selector: "[lemma=implication]",
    message:
      "Rewrite the sentence to avoid using a noun here. Say what the implication is instead of saying there is an implication.",
  },
  {
    phrase: "importance",
    category: "ai",
    selector: "[lemma=importance]",
    message:
      "Rewrite into a verb that turns 'importance of X' into 'X is important/crucial/critical'.",
  },
  {
    phrase: "importantly/notably/interestingly",
    category: "empty",
    selector:
      ":matches([form=importantly i], [form=notably i], [form=interestingly i])",
    suggestions: [""],
  },
  {
    phrase: "in a world where",
    category: "formalism",
    selector: "[form=in i] > [form=world i] > [form=where i]",
  },
  {
    phrase: "in accordance with",
    category: "variation",
    selector: "[form=in i] > [form=accordance i] > [form=with i]",
    suggestions: ["following"],
  },
  {
    phrase: "in association with",
    category: "variation",
    selector: "[form=in i] > [lemma=association] > [form=with i]",
    suggestions: ["with"],
  },
  {
    phrase: "in connection with/to",
    category: "variation",
    selector:
      "[form=in i] > [lemma=connection] > :matches([form=with i], [form=to i])",
    suggestions: ["about", "over"],
  },
  {
    phrase: "in my opinion/view/estimation/judgement",
    category: "opinion",
    selector:
      "[form=in i] > :matches([form=opinion i], [form=view i], [form=estimation i], [form=judgement i]) > [form=my i]",
    suggestions: [""],
  },
  {
    phrase: "in order to",
    category: "variation",
    selector: "[form=in i] > [form=order i] > [form=to i]",
    suggestions: ["to"],
  },
  {
    phrase: "in spite of",
    category: "variation",
    selector: "[form=in i] > [form=spite i] > [form=of i]",
    suggestions: ["despite"],
  },
  {
    phrase: "in summary/conclusion",
    category: "empty",
    selector:
      "[form=in i] > :matches([lemma=summary], [lemma=conclusion]):not(:has([PronType=Art]))",
    suggestions: [""],
  },
  {
    phrase: "in the digital age",
    category: "ai",
    selector: "[lemma=age] > [form=digital i]",
    message:
      "Rewrite to avoid speaking about the 'modern day' or 'digital age', use 'anachronistic' or 'out of date' for things which are out of date.",
  },
  {
    phrase: "in the event/case of",
    category: "variation",
    selector:
      "[form=in i] > :matches([form=event i], [form=case i]) > [form=the i] ~ :matches([form=of i], [form=that i])",
    suggestions: ["if"],
  },
  {
    phrase: "in the heart of",
    category: "ai",
    selector: "[form=in i] > [lemma=heart] > [form=the i] ~ [form=of i]",
    suggestions: ["in"],
  },
  {
    phrase: "in the nature of",
    category: "variation",
    selector: "[form=in i] > [form=nature i] > [form=of i]",
    suggestions: ["like"],
  },
  {
    phrase: "in the neighborhood of",
    category: "variation",
    selector:
      "[form=in i] > [form=neighborhood i] > [form=the i] ~ [form=of i]",
    suggestions: ["around"],
  },
  {
    phrase: "in the process of",
    category: "empty",
    selector: "[form=in i] > [form=process i] > [form=the i] ~ [form=of i]",
    suggestions: [""],
  },
  {
    phrase: "in the realm of",
    category: "formalism",
    selector: "[form=in i] > [form=realm i] > [form=of i]",
  },
  {
    phrase: "in the scheme of things",
    category: "empty",
    selector: "[form=in i] > [form=scheme i] > [form=of i] > [form=things i]",
    suggestions: [""],
  },
  {
    phrase: "in this day and age",
    category: "cliche",
    selector:
      "[form=in i] > [form=day i] > [form=this i] ~ [form=and i] > [form=age i]",
    suggestions: ["now"],
  },
  {
    phrase: "in this section",
    category: "empty",
    selector: "[form=in i] > [lemma=section] > [form=this i]",
    message: "Delete it. The heading already says this",
  },
  {
    phrase: "inasmuch as",
    category: "variation",
    selector: "[form=inasmuch i] > [form=as i]",
    suggestions: ["since"],
  },
  {
    phrase: "incline toward",
    category: "variation",
    selector: "[lemma=incline] > :matches([form=toward i], [form=towards i])",
    suggestions: [":inflect(lean)"],
  },
  {
    phrase: "indistinguishable",
    category: "variation",
    selector: "[form=indistinguishable i]",
    suggestions: ["identical", "same"],
  },
  {
    phrase: "industry reports",
    category: "ai",
    selector: "[lemma=report] > [form=industry i]",
    message: "Avoid vague language. Name the reports and who wrote them",
  },
  {
    phrase: "an initiative aims to",
    category: "ai",
    selector: "[lemma=aim] > [lemma=initiative] ~ [form=to i]",
    message:
      "Say what the initiative does, not what it aims to do. If it has not done it yet, say when it will",
  },
  {
    phrase: "innovative / groundbreaking / avant-garde / newfound",
    category: "variation",
    selector:
      ":matches([form=innovative i], [form=innovational i], [form=innovatory i], [form=avant-garde i], [form=groundbreaking i], [form=newfound i])",
    suggestions: [":inflect(original)", ":inflect(new)", ":inflect(reserve)"],
  },
  {
    phrase: "internalize",
    category: "variation",
    selector: ":matches([lemma=internalize], [lemma=internalise])",
    suggestions: [":inflect(absorb)", ":inflect(learn)"],
  },
  {
    phrase: "interplay",
    category: "variation",
    selector: "[lemma=interplay]",
    suggestions: [":inflect(interaction)"],
  },
  {
    phrase: "intricacies",
    category: "ai",
    selector: "[lemma=intricacy]",
    suggestions: [":inflect(detail)"],
  },
  {
    phrase: "intricate",
    category: "ai",
    selector: "[form=intricate i]",
    suggestions: ["complex", "complicated"],
  },
  {
    phrase: "introduce for the first time",
    category: "redundancy",
    selector:
      "[lemma=introduce] > [form=for i] > [form=time i] > [form=first i]",
    suggestions: ["introduce"],
  },
  {
    phrase: "is a reminder",
    category: "ai",
    selector: "[lemma=be] [lemma=reminder] > [form=a i]",
    message: "Say what it reminds the reader of, or cut the sentence",
  },
  {
    phrase: "it could be suggested that",
    category: "hedge",
    selector: "[Mood=Pot] > [form=be i] > [lemma=suggest]",
    message: "Avoid vague language",
  },
  {
    phrase: "it goes without saying",
    category: "empty",
    selector: "[lemma=go] > [form=without i] > [lemma=say]",
    suggestions: [""],
  },
  {
    phrase: "it is agreed/probable/conceivable that",
    category: "hedge",
    selector:
      "[lemma=be] > [form=it i] ~ :matches([form=agreed i], [form=probable i], [form=conceivable i]) > [form=that i]",
  },
  {
    phrase: "it is clear to me",
    category: "opinion",
    selector:
      "[lemma=be] > [form=it i] ~ [form=clear i] > [form=to i] > [form=me i]",
    suggestions: [""],
  },
  {
    phrase: "it is important/critical/crucial to",
    category: "empty",
    selector:
      "[lemma=be] > [form=it i] ~ :matches([form=important i], [form=critical i], [form=crucial i]) > [form=to i]",
    suggestions: [""],
  },
  {
    phrase: "it is important/critical/crucial/desirable to",
    category: "formalism",
    selector:
      "[lemma=be] > [form=it i] ~ :matches([form=important i], [form=critical i], [form=crucial i], [form=desirable i]) > :matches([form=to i], [Tense=Pres][VerbForm=Part])",
  },
  {
    phrase: "it is worth noting",
    category: "empty",
    selector: "[lemma=be] > [form=it i] ~ [lemma=note] > [form=worth i]",
    suggestions: [""],
  },
  {
    phrase: "it might be said/argued",
    category: "hedge",
    selector:
      "[Mood=Pot] > [form=it i] ~ [form=be i] > :matches([lemma=say], [lemma=argue])",
  },
  {
    phrase: "it might be the case/possible that",
    category: "hedge",
    selector:
      "[Mood=Pot] > [form=it i] ~ [form=be i] > :matches([form=case i], [form=possible i]) > [form=that i]",
  },
  {
    phrase: "it seems important to note",
    category: "hedge",
    selector:
      ":matches([form=seems i], [lemma=be]) > [form=it i] ~ :matches([form=important i], [form=worth i]) > [form=to i] > :matches([form=note i], [form=mention i])",
  },
  {
    phrase: "it seems to me",
    category: "opinion",
    selector: "[lemma=seem] > [form=it i] ~ [form=to i] > [form=me i]",
    suggestions: [""],
  },
  {
    phrase: "it seems/appears that",
    category: "hedge",
    selector:
      ":matches([form=seems i], [form=appears i]) > [form=it i] ~ [form=that i]",
  },
  {
    phrase: "the journey begins",
    category: "ai",
    selector: "[lemma=begin] > [lemma=journey]",
    message: "Name what is actually starting instead of calling it a journey",
  },
  {
    phrase: "just only",
    category: "variation",
    selector: "[form=only i] > [form=just i]",
    suggestions: ["just"],
  },
  {
    phrase: "juxtapose",
    category: "variation",
    selector: "[lemma=juxtapose]",
    suggestions: [":inflect(compare)", ":inflect(contrast)"],
  },
  {
    phrase: "kind of / sort of",
    category: "hedge",
    selector:
      ":matches([form=kind i], [form=sort i]) > [lemma=of] > :matches([xpos=ADJ], [xpos=ADV])",
  },
  {
    phrase: "landscape",
    category: "ai",
    selector: "[lemma=landscape]",
    message:
      "If you mean a field, a market or a situation rather than scenery, say which",
  },
  {
    phrase: "last but not least",
    category: "variation",
    selector: "[form=last i] > [form=but i] > [form=least i] > [form=not i]",
    suggestions: ["finally"],
  },
  {
    phrase: "a lasting/indelible mark",
    category: "ai",
    selector: "[xpos=NOUN] > :matches([form=indelible i], [form=lasting i])",
    message:
      "Say what the thing actually changed, instead of saying it left something that lasts",
  },
  {
    phrase: "lay eyes on",
    category: "variation",
    selector: "[lemma=lay] > [lemma=eye] > [form=on i]",
    suggestions: [":inflect(see)"],
  },
  {
    phrase: "lay the groundwork",
    category: "ai",
    selector: "[form=lay] > [lemma=groundwork]",
    suggestions: [":inflect(prepare)", ":inflect(set) up"],
  },
  {
    phrase: "leave a mark",
    category: "ai",
    selector: "[lemma=leave] > [lemma=mark]",
    suggestions: [":inflect(make) an impact", ":inflect(impress)"],
  },
  {
    phrase: "leave suddenly",
    category: "explained-verb",
    selector: "[lemma=leave] > [form=suddenly i]",
    suggestions: [":inflect(disappear)"],
  },
  {
    phrase: "let bygones be bygones",
    category: "cliche",
    selector: "[lemma=let] > [form=be i] > [form=bygones i] ~ [form=bygones i]",
    suggestions: [":inflect(make) peace"],
  },
  {
    phrase: "let's dive into/explore",
    category: "empty",
    selector:
      "[form=let i] > [lemma=us] ~ :matches([lemma=dive], [lemma=explore])",
    message: "Delete it and start with the content",
  },
  {
    phrase: "leverage",
    category: "ai",
    selector: "[lemma=leverage][xpos=VERB]",
    suggestions: [":inflect(use)"],
  },
  {
    phrase: "load-bearing",
    category: "ai",
    selector: "[form=load-bearing i]",
    message: "Avoid this when used as a metaphor",
  },
  {
    phrase: "loom large",
    category: "ai",
    selector: "[lemma=loom] > [form=large i]",
    suggestions: ["inflect(dominate)"],
  },
  {
    phrase: "lucubrate",
    category: "variation",
    selector: "[lemma=lucubrate]",
    suggestions: [":inflect(study)"],
  },
  {
    phrase: "make a long story short",
    category: "cliche",
    selector:
      ":matches([lemma=make], [lemma=cut]) > [form=story i] ~ [form=short i]",
    suggestions: [":inflect(summarize)"],
  },
  {
    phrase: "make a lot of sense",
    category: "variation",
    selector: "[lemma=make] > [form=lot i] > [form=of i] > [form=sense i]",
    message:
      "Say that it is logical: 'the plan makes a lot of sense' => 'the plan is logical'",
  },
  {
    phrase: "make an attempt",
    category: "variation",
    selector: "[lemma=make] > [form=attempt i]",
    suggestions: [":inflect(try)"],
  },
  {
    phrase: "mark a turning point",
    category: "ai",
    selector: "[lemma=mark] > [lemma=point] > [form=turning i]",
    message:
      "Say what changed and when, e.g. 'it marked a turning point in the war' => 'from then on the war went the other way'",
  },
  {
    phrase: "may vary",
    category: "hedge",
    selector: "[form=may i] > [lemma=vary]",
    message: "Say what changes it, or give the range",
  },
  {
    phrase: "meticulous",
    category: "ai",
    selector: "[form=meticulous i]",
    message:
      "Rewrite using 'detailed', 'accurate' or 'thorough' if describing something, or 'perfectionist' or 'conscientious' if describing someone",
  },
  {
    phrase: "meticulous attention",
    category: "ai",
    selector: "[form=attention i] > [form=meticulous i]",
    suggestions: ["special care"],
  },
  {
    phrase: "meticulously",
    category: "ai",
    selector: "[form=meticulously i]",
    suggestions: ["accurately", "exactly", "precisely"],
  },
  {
    phrase: "might be a reason why/for",
    category: "hedge",
    selector:
      "[Mood=Pot] > [form=be i] > [lemma=reason] > :matches([form=why i], [form=for i])",
  },
  {
    phrase: "might have been a reason why/for",
    category: "hedge",
    selector:
      "[Mood=Pot] > [form=have i] > [form=been i] > [lemma=reason] > :matches([form=why i], [form=for i])",
  },
  {
    phrase: "more specifically",
    category: "redundancy",
    selector: "[form=more i] [lemma=specifically]",
    suggestions: ["specifically"],
  },
  {
    phrase: "most profound",
    category: "ai",
    selector: "[form=profound i] > [form=most i]",
    suggestions: ["deepest"],
  },
  {
    phrase: "mounting pressure",
    category: "ai",
    selector: "[lemma=mount] > [form=pressure i]",
    suggestions: ["heat :inflect(rise)", "tension :inflect(escalate)"],
  },
  {
    phrase: "multifaceted",
    category: "ai",
    selector: "[lemma=multifaceted]",
    suggestions: ["complex", "varied", "versatile"],
  },
  {
    phrase: "multiplicity",
    category: "variation",
    selector: "[lemma=multiplicity]",
    suggestions: [":inflect(variety)"],
  },
  {
    phrase: "mutation-tested/mutation-checked/mutation-verified",
    category: "ai",
    selector:
      ":matches([form=mutation-tested i], [form=mutation-checked i], [form=mutation-verified i])",
    suggestions: ["tested"],
  },
  {
    phrase: "a myriad/plethora of",
    category: "variation",
    selector:
      ":matches([lemma=myriad], [lemma=plethora]) > [form=a i] ~ [form=of i]",
    suggestions: ["many"],
  },
  {
    phrase: "natural beauty",
    category: "cliche",
    selector: "[lemma=beauty] > [form=natural i]",
    message: "Say what the thing looks like",
  },
  {
    phrase: "navigate",
    category: "ai",
    selector: "[lemma=navigate][xpos=VERB]",
    message:
      "Rewrite using the most appropriate from 'making/finding one's way', 'sail' or 'maneuver'",
  },
  {
    phrase: "navigate the complex",
    category: "ai",
    selector: "[lemma=navigate] > [xpos=NOUN] > [form=complex i]",
    message:
      "Rewrite with the equivalent of 'finding one's way through', and drop 'complex' if the difficulty is already clear",
  },
  {
    phrase: "nestled",
    category: "ai",
    selector: "[form=nestled i]",
    message: "Write 'sits in' or 'is in'",
  },
  {
    phrase: "a new avenue",
    category: "ai",
    selector: "[lemma=avenue] > [form=new i]",
    suggestions: ["new :inflect(possibility)", "new :inflect(option)"],
  },
  {
    phrase: "not anticipate",
    category: "variation",
    selector: "[lemma=anticipate] > [form=not i]",
    message: "Rewrite using the verb 'miss' or 'overlook'",
  },
  {
    phrase: "not fully understand",
    category: "ai",
    selector: "[lemma=understand] > [lemma=not] ~ [form=fully i]",
    suggestions: [
      "partially :inflect(understand)",
      "only somewhat :inflect(comprehend)",
    ],
  },
  {
    phrase: "notwithstanding",
    category: "variation",
    selector: "[form=notwithstanding i]",
    suggestions: ["despite"],
  },
  {
    phrase: "nuanced",
    category: "ai",
    selector: "[form=nuanced i]",
    suggestions: ["subtle", "complex"],
  },
  {
    phrase: "observers have cited",
    category: "ai",
    selector: "[lemma=have] > [lemma=observer] ~ [lemma=cite]",
    message: "Avoid vague claims and statements. Name who said it",
  },
  {
    phrase: "off the top of my head",
    category: "empty",
    selector: "[form=off i] > [form=top i] > [form=of i] > [lemma=head]",
    suggestions: [""],
  },
  {
    phrase: "offer/present/provide something unique/valuable",
    category: "ai",
    selector:
      ":matches([lemma=offer], [lemma=present], [lemma=provide]) > [xpos=NOUN] > :matches([form=unique i], [form=valuable i])",
    message:
      "Say what the thing actually gives the reader, instead of calling it unique or valuable",
  },
  {
    phrase: "oft",
    category: "variation",
    selector: "[form=oft i]",
    suggestions: ["often"],
  },
  {
    phrase: "on a regular basis",
    category: "variation",
    selector: "[form=on i] > [form=basis i] > [form=regular i]",
    suggestions: ["regularly"],
  },
  {
    phrase: "on the assumption that",
    category: "variation",
    selector:
      "[form=on i] > [form=assumption i] > [form=the i] ~ [form=that i]",
    suggestions: ["if"],
  },
  {
    phrase: "on the basis of",
    category: "variation",
    selector: "[form=on i] > [form=basis i] > [form=of i]",
    suggestions: ["based on"],
  },
  {
    phrase: "on the grounds that",
    category: "variation",
    selector: "[form=on i] > [form=grounds i] > [form=that i]",
    suggestions: ["because"],
  },
  {
    phrase: "one might say/argue",
    category: "hedge",
    selector:
      "[Mood=Pot] > [form=one i] ~ :matches([form=say i], [form=argue i])",
  },
  {
    phrase: "an ongoing dialogue",
    category: "ai",
    selector: "[lemma=dialogue] > [form=ongoing i]",
    message:
      "Rewrite with the equivalent of 'they keep talking' and/or say what the talks are about",
  },
  {
    phrase: "operationalize",
    category: "variation",
    selector: ":matches([lemma=operationalize], [lemma=operationalise])",
    message: "Write 'put into practice' or 'start using', and say who does it",
  },
  {
    phrase: "optimize",
    category: "ai",
    selector: ":matches([lemma=optimize], [lemma=optimise])",
    suggestions: [":inflect(improve)", ":inflect(tune)"],
  },
  {
    phrase: "over the course of",
    category: "variation",
    selector: "[form=over i] > [form=course i] > [form=of i]",
    suggestions: ["during"],
  },
  {
    phrase: "owing to",
    category: "variation",
    selector: "[form=owing i] > [form=to i]",
    suggestions: ["because of"],
  },
  {
    phrase: "paradigm",
    category: "variation",
    selector: "[lemma=paradigm]",
    suggestions: [":inflect(model)", ":inflect(approach)"],
  },
  {
    phrase: "pave the way",
    category: "ai",
    selector: "[lemma=pave] > [lemma=way]",
    suggestions: [":inflect(make) way", ":inflect(aid)"],
  },
  {
    phrase: "pave the way for the future",
    category: "ai",
    selector: "[lemma=pave] > [lemma=way] > [form=for i] > [lemma=future]",
    message:
      "'Paving the way' already points forward. Drop 'for the future', or name what it makes possible",
  },
  {
    phrase: "personae",
    category: "variation",
    selector: "[form=personae i]",
    suggestions: ["characters"],
  },
  {
    phrase: "pivotal",
    category: "ai",
    selector: "[form=pivotal i]",
    suggestions: ["important", "key", "central"],
  },
  {
    phrase: "a pivotal moment",
    category: "ai",
    selector: "[lemma=moment] > [form=pivotal i]",
    suggestions: ["decisive :inflect(moment)"],
  },
  {
    phrase: "plainly",
    category: "ai",
    selector: "[form=plainly i]",
    suggestions: ["clearly", "simply"],
  },
  {
    phrase: "play a pivotal/crucial role",
    category: "ai",
    selector:
      "[lemma=play] > [lemma=role] > :matches([form=pivotal i], [form=crucial i])",
    message:
      "Say what the person or thing actually did, e.g. 'he played a pivotal role in the deal' => 'he made the deal happen'",
  },
  {
    phrase: "a potential risk/concern",
    category: "ai",
    selector: ":matches([lemma=risk], [lemma=concern]) > [form=potential i]",
    message:
      "A risk is already potential. Drop the adjective, or say how likely the harm is",
  },
  {
    phrase: "potentially lead to",
    category: "ai",
    selector: "[lemma=lead] > [form=potentially i] ~ [form=to i]",
    suggestions: ["can :inflect(cause)"],
  },
  {
    phrase: "pre-fix",
    category: "ai",
    selector:
      ":matches([form=pre-fix i], [form=pre-fixes i], [form=pre-fixed i], [form=pre-fixing i])",
    message: "Say what you fixed, and when",
  },
  {
    phrase: "predate",
    category: "variation",
    selector: "[lemma=predate]",
    message: "Write 'happen before', ideally say when",
  },
  {
    phrase: "prepossessing",
    category: "variation",
    selector: "[form=prepossessing i][xpos=ADJ]",
    suggestions: ["attractive"],
  },
  {
    phrase: "prior to",
    category: "variation",
    selector: "[form=prior i] > [form=to i]",
    suggestions: ["before"],
  },
  {
    phrase: "profound",
    category: "ai",
    selector: "[form=profound i]",
    suggestions: ["deep"],
  },
  {
    phrase: "a prominent figure",
    category: "ai",
    selector: "[lemma=figure] > [form=prominent i]",
    suggestions: ["notable :inflect(person)", "key :inflect(individual)"],
  },
  {
    phrase: "provide insight",
    category: "ai",
    selector: "[lemma=provide] > [lemma=insight]",
    suggestions: [":inflect(clarify)", ":inflect(explain)", ":inflect(reveal)"],
  },
  {
    phrase: "push boundaries",
    category: "ai",
    selector: "[lemma=push] > [lemma=boundary]",
    suggestions: [":inflect(innovate)", ":inflect(pioneer)"],
  },
  {
    phrase: "put into words",
    category: "variation",
    selector: "[lemma=put] > [form=into i] > [form=words i]",
    suggestions: [":inflect(say)"],
  },
  {
    phrase: "the question hanging between them",
    category: "cliche",
    selector: "[form=question i] > [form=hanging i] > [form=between i]",
    message:
      "Rewrite this sentence to succinctly describe how characters stood physically.",
  },
  {
    phrase: "the question hangs between them",
    category: "cliche",
    selector: "[lemma=hang] > [form=question i] ~ [form=between i]",
    message:
      "Rewrite this sentence to succinctly describe how characters stood physically.",
  },
  {
    phrase: "quick as a flash",
    category: "cliche",
    selector: "[form=quick i] > [form=as i] > [form=flash i]",
    suggestions: ["quick"],
  },
  {
    phrase: "raise an important question",
    category: "ai",
    selector: "[lemma=raise] > [lemma=question] > [form=important i]",
    message: "Avoid filler. Directly state the question",
  },
  {
    phrase: "rather / somewhat / fairly / quite / pretty",
    category: "hedge",
    selector:
      ":matches([xpos=ADJ], [xpos=ADV]) > :matches([form=rather i][xpos=ADV], [form=somewhat i], [form=fairly i], [form=quite i], [form=pretty i])",
  },
  {
    phrase: "re-derive/re-verify/re-measure",
    category: "ai",
    selector:
      ":matches([form=re-derive i], [form=re-derives i], [form=re-derived i], [form=re-deriving i], [form=re-verify i], [form=re-verifies i], [form=re-verified i], [form=re-verifying i], [form=re-measure i], [form=re-measures i], [form=re-measured i], [form=re-measuring i])",
    message: "Drop the 're-': say you worked it out again, and what changed",
  },
  {
    phrase: "realm",
    category: "ai",
    selector: "[lemma=realm]",
    suggestions: [":inflect(area)", ":inflect(field)"],
    message: "Avoid 'realm' as a metaphor, outside of a fictional context",
  },
  {
    phrase: "reflect broader",
    category: "ai",
    selector: "[lemma=reflect] > [xpos=NOUN] > [form=broader i]",
    message: "Name the bigger thing you mean",
  },
  {
    phrase: "regard as being",
    category: "variation",
    selector: "[lemma=regard] > [form=as i] > [form=being i]",
    suggestions: [":inflect(consider)"],
  },
  {
    phrase: "a relentless pursuit",
    category: "ai",
    selector: "[lemma=pursuit] > [form=relentless i]",
    message: "Rewrite using 'drive to get'",
  },
  {
    phrase: "render inoperative",
    category: "variation",
    selector: "[lemma=render] > [form=inoperative i]",
    suggestions: [":inflect(disable)"],
  },
  {
    phrase: "a renewed sense",
    category: "ai",
    selector: "[lemma=sense] > [form=renewed i]",
    message:
      "Name the feeling directly: 'a renewed sense of purpose' => 'she knew what she was for again'",
  },
  {
    phrase: "renowned",
    category: "variation",
    selector: "[form=renowned i]",
    suggestions: ["famous", "well known"],
  },
  {
    phrase: "reply in a tone",
    category: "ai",
    selector: "[lemma=reply] > [form=in i] > [lemma=tone]",
    message:
      "Use a speech verb that carries the tone: 'replied in a soft tone' => 'whispered'",
  },
  {
    phrase: "represent/mark a shift",
    category: "ai",
    selector:
      ":matches([lemma=represent], [lemma=mark]) [lemma=shift] > [form=a i]",
    message: "Say what changed, from what to what",
  },
  {
    phrase: "resonate",
    category: "ai",
    selector: "[lemma=resonate]",
    message:
      "Avoid as a metaphor, say how it connects with or matches something else",
  },
  {
    phrase: "resonate with",
    category: "ai",
    selector: "[lemma=resonate] > [form=with i]",
    suggestions: [":inflect(align)", ":inflect(match)"],
  },
  {
    phrase: "revolutionize",
    category: "ai",
    selector: ":matches([lemma=revolutionize], [lemma=revolutionise])",
    suggestions: [":inflect(transform)", ":inflect(reimagine)"],
  },
  {
    phrase: "a role in shaping",
    category: "ai",
    selector: "[lemma=role] > [form=in i] > [lemma=shape]",
    message:
      "Rewrite without 'a role' to say what the thing did: 'played a role in shaping society' => 'shaped society'",
  },
  {
    phrase: "seamless",
    category: "ai",
    selector: "[form=seamless i]",
    suggestions: ["smooth"],
  },
  {
    phrase: "seamlessly",
    category: "ai",
    selector: "[form=seamlessly i]",
    suggestions: ["smoothly", "easily"],
  },
  {
    phrase: "send shockwaves",
    category: "ai",
    selector: "[lemma=send] > [lemma=shockwave]",
    suggestions: [
      ":inflect(reverberate)",
      ":inflect(make) waves",
      ":inflect(ripple)",
    ],
  },
  {
    phrase: "a sense of (noun)",
    category: "ai",
    selector: "[lemma=sense][xpos=NOUN] > [xpos=ADJ] ~ [lemma=of]",
    message:
      "Rewrite using a single noun instead of a phrase. E.g. 'his sense of isolation' => 'his isolation', 'a sense of self' => 'individuality'",
  },
  {
    phrase: "a sense of anticipation",
    category: "cliche",
    selector: "[form=sense i] > [form=of i] > [form=anticipation i]",
    message:
      "Rewrite this whole sentence to describe the person as 'anxious' or 'nervous'",
  },
  {
    phrase: "serve the purpose of",
    category: "variation",
    selector: "[lemma=serve] > [lemma=purpose] > [form=of i]",
    suggestions: [":inflect(help)"],
  },
  {
    phrase: "serve/stand/function/operate as",
    category: "ai",
    selector:
      ":matches([lemma=serve], [lemma=stand], [lemma=function], [lemma=operate]) > [form=as i] > [xpos=NOUN]",
    suggestions: ["inflect(be)"],
  },
  {
    phrase: "set the stage for",
    category: "ai",
    selector: "[lemma=set] > [lemma=stage]",
    message: "Say what happened next",
  },
  {
    phrase: "shape the public opinion",
    category: "ai",
    selector: "[lemma=shape] > [lemma=opinion] > [form=public i]",
    message:
      "Say who ends up believing what, instead of 'shaping public opinion'",
  },
  {
    phrase: "she is the woman who is",
    category: "variation",
    selector:
      "[lemma=be] > [form=she i] ~ [form=woman i] > [lemma=be] > [PronType=Rel]",
    suggestions: ["she is"],
  },
  {
    phrase: "shed light",
    category: "ai",
    selector: "[lemma=shed] > [lemma=light]",
    suggestions: [
      ":inflect(illuminate)",
      ":inflect(clarify)",
      ":inflect(explain)",
    ],
  },
  {
    phrase: "shed light on",
    category: "ai",
    selector: "[lemma=shed] > [lemma=light] ~ [form=on i]",
    suggestions: [":inflect(explain)", ":inflect(clarify)", ":inflect(reveal)"],
  },
  {
    phrase: "shimmer / glimmer / glint / glitter / glisten",
    category: "variation",
    selector:
      ":matches([lemma=shimmer], [lemma=glimmer], [lemma=glint], [lemma=glitter], [lemma=glisten])",
    suggestions: [
      ":inflect(shine)",
      ":inflect(sparkle)",
      ":inflect(glow)",
      ":inflect(beam)",
    ],
  },
  {
    phrase: "showcase",
    category: "ai",
    selector:
      ":matches([lemma=showcase][xpos=VERB], [form=showcases i][xpos=VERB], [form=showcased i], [form=showcasing i])",
    suggestions: [":inflect(show)"],
  },
  {
    phrase: "significant",
    category: "ai",
    selector: "[form=significant i]",
    message:
      "Prefer a more common, shorter version of the same notion: important, major or big",
  },
  {
    phrase: "smoke the peace pipe",
    category: "cliche",
    selector: "[lemma=smoke] > [lemma=pipe] > [form=peace i]",
    suggestions: [":inflect(make) peace"],
  },
  {
    phrase: "the societal expectation",
    category: "ai",
    selector: "[lemma=expectation] > [form=societal i]",
    suggestions: ["social :inflect(expectation)"],
  },
  {
    phrase: "spate",
    category: "variation",
    selector: "[lemma=spate]",
    suggestions: [":inflect(flood)"],
  },
  {
    phrase: "speak loudly",
    category: "explained-verb",
    selector: "[lemma=speak] > [form=loudly i]",
    suggestions: [":inflect(shout)"],
  },
  {
    phrase: "speak/say quietly",
    category: "explained-verb",
    selector: ":matches([lemma=speak], [lemma=say]) > [form=quietly i]",
    suggestions: [":inflect(whisper)"],
  },
  {
    phrase: "speaks volumes",
    category: "ai",
    selector: "[form=speaks i] > [form=volumes i]",
    suggestions: ["shows", "indicates", "says a lot"],
  },
  {
    phrase: "the stakes are high",
    category: "ai",
    selector: "[lemma=be] > [form=stakes i] ~ [form=high i]",
    message: "Rewrite with the equivalent of 'there is a lot at risk'",
  },
  {
    phrase: "stand in stark contrast",
    category: "ai",
    selector: "[lemma=stand] > [form=in i] > [lemma=contrast] > [form=stark i]",
    message:
      "Rewrite with the equivalent of 'X and Y are nothing alike' or 'X clashes with Y'",
  },
  {
    phrase: "a stark contrast",
    category: "ai",
    selector: "[lemma=contrast] > [form=stark i]",
    suggestions: ["clear :inflect(distinction)", "sharp :inflect(contrast)"],
  },
  {
    phrase: "a stark reminder",
    category: "ai",
    selector: "[lemma=reminder] > [lemma=stark]",
    suggestions: [
      "harsh :inflect(reminder)",
      "clear :inflect(reminder)",
      "strong :inflect(reminder)",
    ],
  },
  {
    phrase: "a step forward",
    category: "ai",
    selector: "[form=forward i][xpos=NOUN] > [lemma=step]",
    message:
      "Rewrite the sentence to use an action verb, e.g. 'it is a step forward for the industry' => 'it advances the industry'",
  },
  {
    phrase: "a step toward",
    category: "ai",
    selector: "[lemma=step] > [lemma=toward]",
    message:
      "Rewrite the sentence to use an action verb, e.g. rewrite 'X is a step toward Y' to 'X brings Y closer', or 'with each step toward X' => 'as he approached X'",
  },
  {
    phrase: "stop to consider",
    category: "variation",
    selector: "[lemma=stop] > [form=to i] > [form=consider i]",
    suggestions: [":inflect(consider)"],
  },
  {
    phrase: "strategize",
    category: "variation",
    selector: ":matches([lemma=strategize], [lemma=strategise])",
    suggestions: [":inflect(plan)"],
  },
  {
    phrase: "streamline",
    category: "ai",
    selector: "[lemma=streamline]",
    suggestions: [":inflect(simplify)"],
  },
  {
    phrase: "structural",
    category: "ai",
    selector: "[form=structural i]",
    message: "Avoid vague metaphors, use concrete language.",
  },
  {
    phrase: "structurally",
    category: "ai",
    selector: "[form=structurally i]",
    message: "Avoid vague metaphors, use concrete language.",
  },
  {
    phrase: "swear to protect",
    category: "ai",
    selector: "[lemma=swear] > [form=to i] > [lemma=protect]",
    message:
      "Rewrite with the equivalent of 'vow to defend', or 'pledge to protect'",
  },
  {
    phrase: "symbolize its ongoing/enduring/lasting",
    category: "ai",
    selector:
      ":matches([lemma=symbolize], [lemma=symbolise]) > [xpos=NOUN] > :matches([form=ongoing i], [form=enduring i], [form=lasting i])",
    message: "Say what the thing keeps doing",
  },
  {
    phrase: "a symphony of",
    category: "ai",
    selector: "[lemma=symphony] > [form=of i]",
    message:
      "Rewrite saying something is 'full of X' rather than saying it's a 'symphony of X'",
  },
  {
    phrase: "synergy/synergize",
    category: "ai",
    selector: ":matches([lemma=synergy], [lemma=synergize], [lemma=synergise])",
    message: "Delete it, and say what the two things do together",
  },
  {
    phrase: "take under consideration",
    category: "variation",
    selector: "[lemma=take] > [form=under i] > [form=consideration i]",
    suggestions: [":inflect(consider)"],
  },
  {
    phrase: "a tapestry of",
    category: "cliche",
    selector: "[lemma=tapestry]",
    message:
      "If used as a tailoring metaphor, rewrite this whole sentence to remove it. Describe the concrete actions or details.",
  },
  {
    phrase: "target an intervention",
    category: "ai",
    selector: "[lemma=target] > [lemma=intervention]",
    message: "Say who is helped and how, instead of 'targeted interventions'",
  },
  {
    phrase: "tbh",
    category: "variation",
    selector: "[form=tbh i]",
    suggestions: ["honestly"],
  },
  {
    phrase: "a testament to",
    category: "cliche",
    selector: "[form=testament i] > [form=to i]",
    message:
      "Rewrite this whole sentence to avoid using 'testament' as a metaphor. Describe something as 'proof' or 'evidence' instead.",
  },
  {
    phrase: "that is to say",
    category: "variation",
    selector: "[lemma=be] > [form=that i] ~ [form=to i] > [form=say i]",
    suggestions: ["that :inflect(be)"],
  },
  {
    phrase: "think in terms of",
    category: "variation",
    selector: "[lemma=think] > [form=in i] > [form=terms i] > [form=of i]",
    suggestions: [":inflect(think) of"],
  },
  {
    phrase: "thrilling",
    category: "ai",
    selector: "[form=thrilling i]",
    suggestions: ["exciting", "exhilarating"],
  },
  {
    phrase: "through the agency/medium of",
    category: "variation",
    selector:
      "[form=through i] > :matches([form=agency i], [form=medium i]) > [form=of i]",
    suggestions: ["by"],
  },
  {
    phrase: "thrum",
    category: "variation",
    selector: "[lemma=thrum][xpos=VERB]",
    suggestions: [":inflect(hum)"],
  },
  {
    phrase: "thusly",
    category: "variation",
    selector: "[form=thusly i]",
    suggestions: ["thus"],
  },
  {
    phrase: "to be honest",
    category: "variation",
    selector: "[form=to i] > [form=be i] > [form=honest i]",
    suggestions: ["honestly"],
  },
  {
    phrase: "to summarize",
    category: "empty",
    selector: "[form=to i] > :matches([lemma=summarize], [lemma=summarise])",
    suggestions: [""],
  },
  {
    phrase: "a transformative power",
    category: "ai",
    selector: "[lemma=power] > [lemma=transformative]",
    suggestions: ["driving force"],
  },
  {
    phrase: "treasure trove",
    category: "variation",
    selector: "[form=trove i] > [form=treasure i]",
    suggestions: [
      ":inflect(collection)",
      ":inflect(hoard)",
      ":inflect(reserve)",
    ],
  },
  {
    phrase: "trials and tribulations",
    category: "cliche",
    selector: "[lemma=trial] > [form=and i] > [lemma=tribulation]",
    suggestions: ["trouble"],
  },
  {
    phrase: "try to shake",
    category: "ai",
    selector: "[lemma=try] > [form=to i] > [form=shake i]",
    suggestions: [":inflect(try) to get rid of"],
  },
  {
    phrase: "turn a profit",
    category: "variation",
    selector: "[lemma=turn] > [form=profit i]",
    suggestions: [":inflect(profit)"],
  },
  {
    phrase: "a turning point",
    category: "ai",
    selector: "[lemma=point] > [form=turning i]",
    suggestions: ["crossroads", "decisive moment", "watershed"],
  },
  {
    phrase: "unboundedness",
    category: "variation",
    selector: "[lemma=unboundedness]",
    message:
      "Say the thing is unbounded rather than naming the property: 'the unboundedness of the domain' => 'the domain is unbounded'",
  },
  {
    phrase: "undeniable",
    category: "ai",
    selector: "[form=undeniable i]",
    suggestions: ["certain", "sure"],
  },
  {
    phrase: "underscore",
    category: "ai",
    selector: "[lemma=underscore][xpos=VERB]",
    suggestions: [":inflect(highlight)", ":inflect(stress)", ":inflect(show)"],
  },
  {
    phrase: "understanding",
    category: "ai",
    selector: "[form=understanding i][xpos=NOUN]",
    message: "Rewrite the phrase using 'know' or 'understand' acting as verbs.",
  },
  {
    phrase: "a unique blend",
    category: "ai",
    selector: "[lemma=blend] > [lemma=unique]",
    suggestions: ["particular combination", "special mix"],
  },
  {
    phrase: "unleash",
    category: "ai",
    selector: "[lemma=unleash][xpos=VERB]",
    suggestions: [":inflect(release)", ":inflect(let) loose", ":inflect(free)"],
  },
  {
    phrase: "unleashed",
    category: "ai",
    selector: "[form=unleashed i][xpos=ADJ]",
    suggestions: ["unfettered", "liberated", "free", "unbound"],
  },
  {
    phrase: "unwavering",
    category: "ai",
    selector: "[form=unwavering i]",
    suggestions: ["unshakable", "resolute", "staunch"],
  },
  {
    phrase: "an unwavering commitment",
    category: "ai",
    selector: "[lemma=commitment] > [form=unwavering i]",
    message:
      "Rewrite with a verb phrase: 'they showed an unwavering commitment to quality' => 'they refused to ship anything shoddy'",
  },
  {
    phrase: "up to the time/moment/point when",
    category: "variation",
    selector:
      "[form=up i] > [form=to i] > :matches([form=time i], [form=moment i], [form=point i]) > [form=the i] ~ :matches([form=when i], [form=where i])",
    suggestions: ["until"],
  },
  {
    phrase: "utilize / utilise / put to use",
    category: "variation",
    selector:
      ":matches([lemma=utilize], [lemma=utilise], [lemma=put] > [form=to i] > [form=use i])",
    suggestions: ["use"],
  },
  {
    phrase: "vacuous",
    category: "variation",
    selector: "[form=vacuous i]",
    suggestions: ["empty", "meaningless"],
  },
  {
    phrase: "vacuously",
    category: "ai",
    selector: "[form=vacuously i]",
    message: "Say the test proves nothing, and why",
  },
  {
    phrase: "verbalize",
    category: "variation",
    selector: ":matches([lemma=verbalize], [lemma=verbalise])",
    suggestions: [":inflect(say)"],
  },
  {
    phrase: "the very",
    category: "variation",
    selector: "[form=the i] ~ [form=very i]",
    suggestions: ["the"],
  },
  {
    phrase: "vibrant",
    category: "ai",
    selector: "[form=vibrant i]",
    suggestions: ["alive", "vivid", "lively"],
  },
  {
    phrase: "vis-a-vis",
    category: "variation",
    selector: ":matches([form=vis-a-vis], [form=vis-à-vis])",
    suggestions: ["compared to", "face to face"],
  },
  {
    phrase: "a voice fills",
    category: "ai",
    selector: "[lemma=fill] > [lemma=voice]",
    message: "Generally avoid this cliche, just write what the character said",
  },
  {
    phrase: "walk slowly",
    category: "explained-verb",
    selector: "[lemma=walk] > [form=slowly i]",
    suggestions: [":inflect(stroll)"],
  },
  {
    phrase: "want/need strongly/desperately",
    category: "explained-verb",
    selector:
      ":matches([lemma=want], [lemma=need]) > :matches([form=strongly i], [form=desperately i])",
    suggestions: [":inflect(crave)"],
  },
  {
    phrase: "the way I see it",
    category: "opinion",
    selector:
      "[form=way i] > [form=the i] ~ [lemma=see] > [form=I i] ~ [form=it i]",
    suggestions: [""],
  },
  {
    phrase: "the way I think/feel about it",
    category: "opinion",
    selector:
      "[form=way i] > [form=the i] ~ :matches([lemma=think], [lemma=feel]) > [form=I i] ~ [form=about i] > [form=it i]",
    suggestions: [""],
  },
  {
    phrase: "wedge",
    category: "ai",
    selector: "[lemma=wedge][xpos=VERB]",
    message: "Say what got stuck, or what you drove in between",
  },
  {
    phrase: "wedged",
    category: "ai",
    selector: "[form=wedged i]",
    suggestions: ["stuck", "jammed"],
  },
  {
    phrase: "well-nigh",
    category: "variation",
    selector: "[form=well-nigh]",
    suggestions: ["almost"],
  },
  {
    phrase: "what is the reason",
    category: "variation",
    selector: "[lemma=be] > [form=what i] ~ [lemma=reason]",
    message:
      "Ask it with 'why': 'What is the reason we keep losing customers?' => 'Why do we keep losing customers?'",
  },
  {
    phrase: "when it comes to",
    category: "variation",
    selector: "[form=when i] > [form=comes i] > [form=it i] ~ [form=to i]",
    suggestions: ["when", "regarding"],
  },
  {
    phrase: "whilst",
    category: "variation",
    selector: "[form=whilst i]",
    suggestions: ["while"],
  },
  {
    phrase: "white as a sheet",
    category: "cliche",
    selector: "[form=white i] > [form=as i] > [lemma=sheet]",
    suggestions: ["pale"],
  },
  {
    phrase: "with a grain/pinch of salt",
    category: "cliche",
    selector:
      "[form=with i] > :matches([form=grain i], [form=pinch i]) > [form=of i] > [form=salt i]",
    suggestions: ["with caution"],
  },
  {
    phrase: "with a view to",
    category: "variation",
    selector: "[lemma=with] > [form=view i] > [form=to i]",
    suggestions: ["to"],
  },
  {
    phrase: "with or in regard/reference to",
    category: "variation",
    selector:
      ":matches([lemma=with], [form=in i]) > :matches([form=regard i], [form=reference i]) > [form=to i]",
    suggestions: ["about"],
  },
  {
    phrase: "with practiced ease",
    category: "cliche",
    selector:
      "[form=with i] > [lemma=ease] > :matches([form=practiced i], [form=practised i])",
    suggestions: ["effortlessly"],
  },
  {
    phrase: "with the advent of",
    category: "formalism",
    selector: "[form=with i] > [form=advent i] > [form=of i]",
  },
  {
    phrase: "with the condition that",
    category: "variation",
    selector: "[form=with i] > [form=condition i] > [form=that i]",
    suggestions: ["if"],
  },
  {
    phrase: "without further ado",
    category: "empty",
    selector: "[form=without i] > [lemma=ado] > [form=further i]",
    suggestions: [""],
  },
  {
    phrase: "work tirelessly",
    category: "ai",
    selector: "[lemma=work] > [form=tirelessly i]",
    suggestions: [":inflect(toil)", ":inflect(strive)", ":inflect(labor)"],
  },
  {
    phrase: "woven into",
    category: "ai",
    selector: "[form=woven i] > [form=into i]",
    suggestions: ["embedded in", "included in"],
  },
];

export const asQuery = ({
  selector,
  suggestions,
  message,
  category,
}: BadWordEntry): Query => ({
  selector,
  ...(suggestions ? { suggestions } : {}),
  message: message ?? categoryMessages[category],
  id: ErrorId.NO_BAD_WORDS,
});

const queries: Query[] = entries.map(asQuery);

export default (sentences: ParsedToken[][]) =>
  queriesToErrors(queries, sentences);

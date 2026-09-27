import parseToSubtree from "../parse-to-subtree.js";
import { ErrorId, type LintError, type ParsedToken } from "../types/index.js";

const intensifierDictionary = {
  accurate: ["exact"],
  afraid: ["terrified"],
  angry: ["furious"],
  appealing: ["fascinating", "charming", "irresistible"],
  bad: ["awful", "horrible", "abysmal"],
  beautiful: ["gorgeous"],
  big: ["huge"],
  boring: ["tedious"],
  bright: ["brilliant"],
  busy: ["swamped"],
  calm: ["serene"],
  careful: ["meticulous"],
  cheap: ["stingy"],
  clean: ["immaculate"],
  clear: ["transparent"],
  clever: ["brilliant"],
  cold: ["freezing"],
  confused: ["perplexed"],
  creative: ["ingenious", "visionary"],
  crowded: ["packed"],
  cute: ["adorable"],
  damaged: ["ruined"],
  dear: ["cherished"],
  dirty: ["filthy"],
  disconcerted: ["amazed", "astounded", "astonished", "shocked"],
  disconcerting: ["amazing", "astounding", "astonishing", "shocking"],
  dry: ["arid"],
  dull: ["tedious"],
  eager: ["restless"],
  fast: ["instant"],
  fierce: ["ferocious"],
  "fine-looking": ["gorgeous", "stunning"],
  funny: ["hilarious"],
  glad: ["delighted"],
  good: ["excellent"],
  "good-looking": ["gorgeous", "stunning"],
  happy: ["ecstatic", "blissful"],
  heavy: ["massive", "impenetrable", "powerful"],
  hungry: ["starving"],
  hurt: ["devastated", "ruined"],
  important: ["crucial"],
  large: ["huge", "giant"],
  lazy: ["slacking"],
  light: ["weightless"],
  little: ["tiny"],
  long: ["interminable"],
  loud: ["deafening"],
  mean: ["cruel"],
  messy: ["chaotic"],
  nasty: ["disgusting"],
  nice: ["great", "kind"],
  noisy: ["deafening"],
  often: ["frequently"],
  old: ["ancient"],
  open: ["transparent"],
  pale: ["ashen"],
  poor: ["destitute", "weak"],
  powerful: ["mighty"],
  pretty: ["beautiful"],
  quick: ["instant"],
  quiet: ["silent"],
  rainy: ["pouring"],
  rich: ["wealthy"],
  sad: ["depressed", "dismal"],
  scared: ["terrified"],
  scary: ["terrifying"],
  serious: ["grave"],
  sharp: ["keen"],
  shiny: ["dazzling", "brilliant"],
  short: ["tiny"],
  shy: ["timid"],
  simple: ["plain"],
  small: ["tiny"],
  smart: ["brilliant"],
  special: ["exceptional"],
  sure: ["confident"],
  surprised: ["amazed", "astounded", "astonished", "shocked"],
  talented: ["gifted"],
  tasty: ["delicious"],
  tired: ["exhausted"],
  ugly: ["disgusting"],
  upset: ["disturbed"],
  warm: ["hot"],
  wet: ["soaked"],
  willing: ["eager"],
  worried: ["distressed"],
} as Record<string, string[]>;

const applyRule = (entities: ParsedToken[]) =>
  entities
    .filter(
      ({ lemma, xpos, head }, index) =>
        lemma &&
        ["very", "really"].includes(lemma) &&
        xpos === "ADV" &&
        head !== -1 &&
        head > index &&
        ["ADJ", "ADV"].includes(entities[head].xpos),
    )
    .reduce((errors: LintError[], { head }) => {
      const {
        lemma: headLemma,
        misc: { at },
        form: headWord,
      } = entities[head];
      const suggestions = headLemma ? intensifierDictionary[headLemma] : null;
      if (suggestions == null) {
        return errors;
      }

      const subtree = parseToSubtree(entities, head);
      const {
        misc: { at: start },
      } = entities[Math.min(...subtree)];
      const end = at + headWord.length;
      return [
        ...errors,
        {
          start,
          end,
          suggestions: suggestions.map((text: string) => ({
            range: [start, end] as [number, number],
            text,
          })),
          message: `Replace intensified modifiers with a more powerful and concise word that retains the meaning`,
          id: ErrorId.NO_EXPLAINED_INTENSIFIERS,
        },
      ];
    }, []);

export default (sentences: ParsedToken[][]) =>
  sentences.reduce(
    (errors: LintError[], entities) => [...errors, ...applyRule(entities)],
    [],
  );

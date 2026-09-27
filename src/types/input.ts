export type PosTag =
  | "NOUN"
  | "VERB"
  | "ADJ"
  | "ADV"
  | "MARK"
  | "PUNCT"
  | "INTJ"
  | "X";

export type AdpositionType = "Prep" | "Post";

export type MorphCase = "Nom" | "Acc";

export type VerbMood = "Pot" | "Nec" | "Cnd";

export type NominalNumber = "Sing" | "Plur";

export type VerbPerson = 1 | 2 | 3;

export type PronounType = "Art" | "Dem" | "Prs" | "Tot" | "Neg" | "Rel" | "Ind";

export type PunctuationType =
  | "Peri"
  | "Qest"
  | "Excl"
  | "Quot"
  | "Brck"
  | "Comm"
  | "Colo"
  | "Semi"
  | "Dash";

export type Tense = "Pres" | "Past";

export type VerbForm = "Fin" | "Part";

export type LexicalFeatures = {
  AdpType?: AdpositionType;
  Case?: MorphCase;
  Mood?: VerbMood;
  Number?: NominalNumber;
  Person?: VerbPerson;
  PronType?: PronounType;
  PunctType?: PunctuationType;
  Tense?: Tense;
  VerbForm?: VerbForm;
};

export type TokenPosition = {
  at: number;
  children: number[];
};

export type ParsedToken = {
  id: number;
  form: string;
  lemma?: string;
  head: number;
  xpos: PosTag;
  feats: LexicalFeatures;
  misc: TokenPosition;
};

export type ParsedText = ParsedToken[][];

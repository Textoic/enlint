import { readFile } from "node:fs/promises";
import artisan, {
  type Dictionary,
  type FeatureWeights,
  type LexicalProps,
} from "@textoic/artisan";

const dictionary: Dictionary = new Map(
  JSON.parse(
    await readFile(
      new URL(import.meta.resolve("@textoic/artisan/dictionary.json")),
      "utf8",
    ),
  ) as [string, LexicalProps][],
);
const { weights } = JSON.parse(
  await readFile(
    new URL(import.meta.resolve("@textoic/artisan/weights.json")),
    "utf8",
  ),
) as { weights: FeatureWeights };

export default (text: string) => artisan(text, { dictionary, weights });

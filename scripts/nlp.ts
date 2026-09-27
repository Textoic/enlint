import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import artisan, {
  type Dictionary,
  type FeatureWeights,
  type LexicalProps,
  type ParsedToken,
} from "@textoic/artisan";

const load = async <T>(specifier: string): Promise<T> =>
  JSON.parse(
    await readFile(fileURLToPath(import.meta.resolve(specifier)), "utf8"),
  ) as T;

const dictionary: Dictionary = new Map(
  await load<[string, LexicalProps][]>("@textoic/artisan/dictionary.json"),
);
const weights = await load<FeatureWeights>("@textoic/artisan/weights.json");

export default (text: string): ParsedToken[][] =>
  artisan(text, { dictionary, weights });

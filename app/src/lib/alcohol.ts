import { DEFAULT_ABV } from "./drinks";
import { Entry } from "./types";

export const ETHANOL_GRAMS_PER_LITER = 789;
export const STANDARD_DRINK_GRAMS = 12;

export type AlcoholTotals = {
  entries: number;
  volume_l: number;
  ethanol_g: number;
  standard_drinks: number;
};

export const getEntryAbvPercent = (entry: Entry) =>
  entry.abv_percent ??
  (entry.category === "other" ? 10 : DEFAULT_ABV[entry.category]) ??
  0;

export const getEntryEthanolGrams = (entry: Entry) =>
  entry.size_l * (getEntryAbvPercent(entry) / 100) * ETHANOL_GRAMS_PER_LITER;

export const toStandardDrinks = (ethanolGrams: number) =>
  ethanolGrams <= 0 ? 0 : ethanolGrams / STANDARD_DRINK_GRAMS;

export const sumEntriesAlcohol = (entries: Entry[]): AlcoholTotals => {
  let volume_l = 0;
  let ethanol_g = 0;
  for (const entry of entries) {
    volume_l += entry.size_l;
    ethanol_g += getEntryEthanolGrams(entry);
  }

  return {
    entries: entries.length,
    volume_l,
    ethanol_g,
    standard_drinks: toStandardDrinks(ethanol_g),
  };
};

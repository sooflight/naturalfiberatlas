import { type FiberProfile, type PlateType, worldNames } from "../data/atlas-data";
import { dataSource } from "../data/data-provider";

const MOBILE_PLATE_ORDER: PlateType[] = [
  "about",
  "insight1",
  "insight2",
  "insight3",
  "silkCharmeuse",
  "silkHabotai",
  "silkDupioni",
  "silkTaffeta",
  "silkChiffon",
  "silkOrganza",
  "quote",
  "trade",
  "regions",
  "worldNames",
  "process",
  "anatomy",
  "care",
  "seeAlso",
];

export function getAvailablePlates(fiber: FiberProfile): PlateType[] {
  const processData = dataSource.getProcessData();
  const anatomyData = dataSource.getAnatomyData();
  const careData = dataSource.getCareData();
  const quoteData = dataSource.getQuoteData();

  return MOBILE_PLATE_ORDER.filter((pt) => {
    switch (pt) {
      case "worldNames": {
        const names = worldNames[fiber.id];
        return names && names.length > 1;
      }
      case "process":
        return (processData[fiber.id] ?? []).length > 0;
      case "anatomy":
        return !!anatomyData[fiber.id];
      case "care":
        return !!careData[fiber.id];
      case "quote":
        return (quoteData[fiber.id] ?? []).length > 0;
      case "insight1":
      case "insight2":
      case "insight3": {
        const sentences = fiber.about?.match(/[^.!?]+[.!?]+/g) ?? [];
        if (pt === "insight3") return sentences.length >= 3;
        return sentences.length >= 2;
      }
      case "silkCharmeuse":
      case "silkHabotai":
      case "silkDupioni":
      case "silkTaffeta":
      case "silkChiffon":
      case "silkOrganza":
        return fiber.id === "silk";
      case "seeAlso":
        return fiber.seeAlso.length > 0;
      case "about":
      default:
        return true;
    }
  });
}

import { type FiberProfile, type PlateType, worldNames } from "../data/atlas-data";
import { dataSource } from "../data/data-provider";

const MOBILE_PLATE_ORDER: PlateType[] = [
  "about",
  "insight1",
  "insight2",
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
      case "insight2": {
        const sentences = fiber.about?.match(/[^.!?]+[.!?]+/g) ?? [];
        return sentences.length >= 2;
      }
      case "seeAlso":
        return fiber.seeAlso.length > 0;
      case "about":
      default:
        return true;
    }
  });
}

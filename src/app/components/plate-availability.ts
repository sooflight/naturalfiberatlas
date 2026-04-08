import { type FiberProfile, type PlateType, worldNames } from "../data/atlas-data";
import { dataSource } from "../data/data-provider";
import { getValidYoutubeEmbedEntries, hasAnyValidYoutubeEmbed } from "../utils/youtube-embed-urls";

const MOBILE_PLATE_ORDER: PlateType[] = [
  "about",
  "properties",
  "anatomy",
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
  "youtubeEmbed",
  "trade",
  "regions",
  "worldNames",
  "process",
  "care",
  "seeAlso",
];

function isPlateAvailable(
  fiber: FiberProfile,
  pt: PlateType,
  processData: ReturnType<typeof dataSource.getProcessData>,
  anatomyData: ReturnType<typeof dataSource.getAnatomyData>,
  careData: ReturnType<typeof dataSource.getCareData>,
  quoteData: ReturnType<typeof dataSource.getQuoteData>,
): boolean {
  switch (pt) {
    case "worldNames": {
      const names = worldNames[fiber.id];
      return !!(names && names.length > 1);
    }
    case "process":
      return (processData[fiber.id] ?? []).length > 0;
    case "anatomy":
      return !!anatomyData[fiber.id];
    case "care":
      return !!careData[fiber.id];
    case "quote":
      return (quoteData[fiber.id] ?? []).length > 0;
    case "youtubeEmbed":
      return hasAnyValidYoutubeEmbed(fiber);
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
}

export function getAvailablePlates(fiber: FiberProfile): PlateType[] {
  const processData = dataSource.getProcessData();
  const anatomyData = dataSource.getAnatomyData();
  const careData = dataSource.getCareData();
  const quoteData = dataSource.getQuoteData();

  return MOBILE_PLATE_ORDER.flatMap((pt) => {
    if (!isPlateAvailable(fiber, pt, processData, anatomyData, careData, quoteData)) {
      return [];
    }
    if (pt === "youtubeEmbed") {
      const n = getValidYoutubeEmbedEntries(fiber).length;
      return Array.from({ length: n }, () => "youtubeEmbed" as PlateType);
    }
    return [pt];
  });
}

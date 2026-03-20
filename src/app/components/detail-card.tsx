import type { FiberProfile, PlateType, GalleryImageEntry } from "../data/atlas-data";
import {
  AboutPlate,
  InsightPlate,
  SilkVariantPlate,
  RegionsPlate,
  TradePlate,
  WorldNamesPlate,
  SeeAlsoPlate,
  QuotePlate,
  ContactSheetPlate,
  ProcessPlate,
  AnatomyPlate,
  CarePlate,
} from "./detail-plates";
import { GlassCard } from "./glass-card";
import { densityByPlate } from "./plate-primitives";

/** Plates that should NOT trigger the ScreenPlate on click. */
const NON_SCREEN_PLATES: PlateType[] = [
  "contactSheet",
  "seeAlso",
];

interface DetailCardProps {
  fiber: FiberProfile;
  plateType: PlateType;
  onSelectFiber: (id: string) => void;
  onOpenLightbox?: (imageIndex?: number, sourceRect?: DOMRect) => void;
  /** Callback to open the fullscreen ScreenPlate view */
  onOpenScreenPlate?: (plateType: PlateType) => void;
  /** For gallery plates: the specific images to display (no repeats) */
  galleryImages?: GalleryImageEntry[];
  /** For gallery plates: sequential index for filter variation */
  galleryIndex?: number;
  /** Stagger delay from the inhale cascade — used to offset the content fade
   *  so it begins after the card shell snaps visible. */
  contentDelay?: number;
}

export function DetailCard({
  fiber,
  plateType,
  onSelectFiber,
  onOpenLightbox,
  onOpenScreenPlate,
  galleryImages,
  galleryIndex = 0,
  contentDelay = 0,
}: DetailCardProps) {
  const isGallery = plateType === "contactSheet";
  const canScreen = !NON_SCREEN_PLATES.includes(plateType);

  const contentDensity = densityByPlate[plateType] ?? 0;

  const handleCardClick = () => {
    if (canScreen && onOpenScreenPlate) {
      onOpenScreenPlate(plateType);
    }
  };

  const renderPlate = () => {
    if (isGallery && galleryImages && galleryImages.length > 0) {
      return (
        <ContactSheetPlate
          images={galleryImages}
          fiberName={fiber.name}
          onOpenAt={(imgIndex, sourceRect) => onOpenLightbox?.(imgIndex, sourceRect)}
        />
      );
    }
    switch (plateType) {
      case "about":
        return <AboutPlate fiber={fiber} />;
      case "insight1":
        return <InsightPlate fiber={fiber} half={1} />;
      case "insight2":
        return <InsightPlate fiber={fiber} half={2} />;
      case "insight3":
        return <InsightPlate fiber={fiber} half={3} />;
      case "silkCharmeuse":
      case "silkHabotai":
      case "silkDupioni":
      case "silkTaffeta":
      case "silkChiffon":
      case "silkOrganza":
        return <SilkVariantPlate plateType={plateType} />;
      case "regions":
        return <RegionsPlate fiber={fiber} />;
      case "trade":
        return <TradePlate fiber={fiber} />;
      case "worldNames":
        return <WorldNamesPlate fiber={fiber} />;
      case "process":
        return <ProcessPlate fiber={fiber} />;
      case "anatomy":
        return <AnatomyPlate fiber={fiber} />;
      case "care":
        return <CarePlate fiber={fiber} />;
      case "seeAlso":
        return <SeeAlsoPlate fiber={fiber} onSelect={onSelectFiber} />;
      case "quote":
        return <QuotePlate fiber={fiber} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full" style={{ containerType: "inline-size" }}>
      <GlassCard
        isHoverable
        ambientImage={fiber.image}
        contentDensity={contentDensity}
        onClick={canScreen ? handleCardClick : undefined}
      >
        <div
          className="detail-content-fade"
          style={{
            animationDelay: `${contentDelay}s`,
          }}
        >
          {renderPlate()}
        </div>
      </GlassCard>
    </div>
  );
}

export default DetailCard;
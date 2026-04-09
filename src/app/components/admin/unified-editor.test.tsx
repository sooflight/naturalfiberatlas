import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { UnifiedEditor } from "./unified-editor";

const mockFiber = {
  id: "cotton",
  name: "Cotton",
  about: "Cotton is a natural cellulosic fiber. It is breathable and comfortable.",
  image: "https://example.com/hero.jpg",
  category: "natural",
  subtitle: "Natural fiber",
  profilePills: [],
  regions: [],
  tags: [],
  seeAlso: [],
  sustainability: { biodegradable: true, recyclable: false, certifications: [] },
  galleryImages: [{ url: "https://example.com/1.jpg", title: "One" }],
};

const mockUpdateFiber = vi.fn();
const mockGetFiberById = vi.fn(() => mockFiber);

vi.mock("../../context/atlas-data-context", () => ({
  useAtlasData: () => ({
    version: 1,
    getFiberById: mockGetFiberById,
    updateFiber: mockUpdateFiber,
  }),
}));

vi.mock("../../data/data-provider", () => ({
  dataSource: {
    getQuoteData: () => ({}),
    getProcessData: () => ({}),
    getAnatomyData: () => ({}),
    getCareData: () => ({}),
    getWorldNames: () => ({}),
    updateFiber: vi.fn(),
  },
}));

vi.mock("./validation", () => ({
  ValidationProvider: ({ children }: { children: React.ReactNode }) => children,
  useValidation: () => ({ result: { isValid: true, errors: [], warnings: [] } }),
}));

vi.mock("./validation/ValidationBadge", () => ({
  ValidationBadge: () => null,
}));

vi.mock("./validation/SaveChecklistModal", () => ({
  SaveChecklistModal: () => null,
}));

vi.mock("./editor/EditorModeProvider", () => ({
  EditorModeProvider: ({ children }: { children: React.ReactNode }) => children,
  useEditorMode: () => ({ recordExpansion: vi.fn() }),
}));

vi.mock("./card-editor", () => ({
  EditableCardShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="editable-shell">{children}</div>
  ),
  CardLabel: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  ProfileHeroCard: () => <div>hero</div>,
  AboutCard: () => <div>about</div>,
  InsightCard: () => <div>insight</div>,
  isActiveFiberInsightOverride: () => false,
  TradeCard: () => <div>trade</div>,
  ProfilePillsCard: () => <div>pills</div>,
  SeeAlsoCard: () => <div>see also</div>,
  YouTubeUrlCard: () => <div>youtube</div>,
}));

vi.mock("./supplementary-editors", () => ({
  ProcessEditor: () => <div>process</div>,
  AnatomyEditor: () => <div>anatomy</div>,
  CareEditor: () => <div>care</div>,
  QuoteEditor: () => <div>quote</div>,
  WorldNamesEditor: () => <div>world</div>,
}));

vi.mock("./gallery-editor", () => ({
  GalleryEditor: () => <div data-testid="gallery-editor">gallery-editor</div>,
}));

vi.mock("./gallery-studio", () => ({
  GalleryStudio: () => <div data-testid="gallery-studio">gallery-studio</div>,
}));

vi.mock("./image-quick-actions", () => ({
  ImageQuickActions: () => null,
}));

describe("UnifiedEditor", () => {
  afterEach(() => {
    localStorage.removeItem("atlas-images");
  });

  it("renders ImageBase profile box at top and removes Gallery Studio section", () => {
    const { container } = render(
      <MemoryRouter>
        <UnifiedEditor fiberId="cotton" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Open ImageBase")).toBeTruthy();
    expect(screen.queryByText("Gallery Studio")).toBeNull();
    const sectionOrder = Array.from(container.querySelectorAll("[data-editor-section]")).map((node) =>
      node.getAttribute("data-editor-section"),
    );
    expect(sectionOrder[0]).toBe("ImageBase");
  });

  it("uses atlas-images local row so Knowledge ImageBase box matches ImageBase visibility", () => {
    localStorage.setItem(
      "atlas-images",
      JSON.stringify({
        cotton: [],
      }),
    );

    render(
      <MemoryRouter>
        <UnifiedEditor fiberId="cotton" />
      </MemoryRouter>,
    );

    expect(screen.getByText("No profile images")).toBeTruthy();
  });
});

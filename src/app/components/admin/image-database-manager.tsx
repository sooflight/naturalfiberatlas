import { type MouseEvent, useMemo, useState } from "react";
import { useAtlasData } from "../../context/atlas-data-context";
import { ProfileStatusCircle } from "./ProfileStatusCircle";
import { toDomainImages, buildProfileImageLinksExport } from "./image-domain/adapters";
import {
  partitionByNavigationParent,
  sortProfileIdsByCanonicalOrder,
} from "../../data/profile-sequencing";
import type { FiberProfile } from "../../data/fibers";

interface ImageDatabaseManagerProps {
  onOpenScoutForProfile: (fiberId: string) => void;
  onSelectProfile: (fiberId: string) => void;
}

function sortProfilesBySidebarSequence(
  profiles: FiberProfile[],
  canonicalOrder: string[],
): FiberProfile[] {
  const ids = profiles.map((p) => p.id);
  const { regular, navigationParents } = partitionByNavigationParent(ids);
  const orderedRegular = sortProfileIdsByCanonicalOrder(regular, canonicalOrder);
  const orderedNavParents = sortProfileIdsByCanonicalOrder(navigationParents, canonicalOrder);
  const orderedIds = [...orderedRegular, ...orderedNavParents];
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return orderedIds.map((id) => byId.get(id)).filter((f): f is FiberProfile => !!f);
}

export function ImageDatabaseManager({
  onOpenScoutForProfile,
  onSelectProfile,
}: ImageDatabaseManagerProps) {
  const { fibers, fiberIndex = [], updateFiber } = useAtlasData();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{
    fiberName: string;
    imageUrl: string;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    imageUrl: string;
  } | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const openContextMenuForImage = (event: MouseEvent<HTMLElement>, imageUrl: string) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      imageUrl,
    });
  };

  const triggerImageDownload = (imageUrl: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.target = "_blank";
    link.rel = "noopener,noreferrer";

    try {
      const filename = new URL(imageUrl, window.location.origin).pathname.split("/").pop();
      link.download = filename && filename.length > 0 ? filename : "atlas-image";
    } catch {
      link.download = "atlas-image";
    }

    link.click();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fibers;
    return fibers.filter(
      (fiber) =>
        fiber.name.toLowerCase().includes(q) ||
        fiber.id.toLowerCase().includes(q) ||
        fiber.galleryImages.some((img) => img.url.toLowerCase().includes(q)),
    );
  }, [fibers, search]);

  const canonicalOrder = useMemo(
    () => (fiberIndex ?? []).map((f) => f.id),
    [fiberIndex],
  );

  const activeProfiles = useMemo(() => {
    const list = filtered.filter((fiber) => fiber.status === "published");
    return sortProfilesBySidebarSequence(list, canonicalOrder);
  }, [filtered, canonicalOrder]);

  const archivedProfiles = useMemo(() => {
    const list = filtered.filter((fiber) => fiber.status !== "published");
    return sortProfilesBySidebarSequence(list, canonicalOrder);
  }, [filtered, canonicalOrder]);

  const toggleProfileStatus = (fiberId: string, currentStatus: "draft" | "published" | "archived") => {
    const nextStatus: "published" | "archived" =
      currentStatus === "published" ? "archived" : "published";
    updateFiber(fiberId, { status: nextStatus });
  };

  return (
    <div
      className="h-full flex flex-col"
      onClick={() => {
        if (contextMenu) setContextMenu(null);
      }}
    >
      <div className="p-3 border-b border-white/[0.06] flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search profiles or image URLs..."
          className="flex-1 px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded text-white/70"
          style={{ fontSize: "12px" }}
        />
        <button
          onClick={() => {
            const imageMap = Object.fromEntries(
              fibers.map((fiber) => [fiber.id, toDomainImages(fiber.galleryImages)]),
            );
            const payload = buildProfileImageLinksExport(imageMap);
            const blob = new Blob([JSON.stringify(payload, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `atlas-profile-image-links-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-3 py-1.5 rounded bg-white/[0.04] border border-white/[0.1] text-white/65 hover:text-white/85"
          style={{ fontSize: "11px", fontWeight: 600 }}
        >
          Export Links
        </button>
      </div>

      {selected.size > 0 && (
        <div className="px-3 py-2 border-b border-blue-400/15 bg-blue-500/[0.04] flex items-center gap-2">
          <span className="text-blue-300/80" style={{ fontSize: "10px" }}>
            {selected.size} selected
          </span>
          <button
            onClick={() => {
              selected.forEach((fiberId) => {
                const fiber = fibers.find((item) => item.id === fiberId);
                if (!fiber) return;
                updateFiber(fiber.id, { tags: Array.from(new Set([...fiber.tags, "image-curated"])) });
              });
            }}
            className="px-2 py-1 rounded bg-white/[0.06] border border-white/[0.1] text-white/60 hover:text-white/80"
            style={{ fontSize: "10px" }}
          >
            Bulk tag
          </button>
          <button
            onClick={() => {
              selected.forEach((fiberId) => {
                updateFiber(fiberId, { galleryImages: [], image: "" });
              });
              setSelected(new Set());
            }}
            className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-300/80 hover:text-red-300"
            style={{ fontSize: "10px" }}
          >
            Bulk delete images
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeProfiles.map((fiber) => (
          <div
            key={fiber.id}
            className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5"
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.has(fiber.id)}
                onChange={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(fiber.id)) next.delete(fiber.id);
                    else next.add(fiber.id);
                    return next;
                  })
                }
              />
              <button
                onClick={() => onSelectProfile(fiber.id)}
                className="text-white/75 hover:text-white/90"
                style={{ fontSize: "12px", fontWeight: 600 }}
              >
                {fiber.name}
              </button>
              <ProfileStatusCircle
                status={fiber.status}
                onToggle={() => toggleProfileStatus(fiber.id, fiber.status ?? "archived")}
                dataTestId={`workspace-status-circle-${fiber.id}`}
              />
              <span className="text-white/30 ml-auto" style={{ fontSize: "10px" }}>
                {fiber.galleryImages.length} image{fiber.galleryImages.length === 1 ? "" : "s"}
              </span>
              <button
                onClick={() => onOpenScoutForProfile(fiber.id)}
                className="px-2 py-1 rounded bg-blue-500/15 border border-blue-500/25 text-blue-300/85 hover:text-blue-300"
                style={{ fontSize: "10px", fontWeight: 600 }}
              >
                Scout
              </button>
            </div>

            {fiber.galleryImages.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {fiber.galleryImages.slice(0, 4).map((entry, index) => (
                  <button
                    key={`${fiber.id}-${entry.url}-${index}`}
                    type="button"
                    onClick={() =>
                      setLightbox({
                        fiberName: fiber.name,
                        imageUrl: entry.url,
                      })}
                    className="block w-full rounded border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.14] transition-colors"
                    onContextMenu={(event) => openContextMenuForImage(event, entry.url)}
                  >
                    <img
                      src={entry.url}
                      alt={`${fiber.name} image ${index + 1}`}
                      className="w-full aspect-[4/3] rounded object-cover bg-white/[0.04]"
                      loading="lazy"
                      onContextMenu={(event) => openContextMenuForImage(event, entry.url)}
                    />
                  </button>
                ))}
                {fiber.galleryImages.length > 4 && (
                  <div
                    className="w-full aspect-[4/3] rounded border border-white/[0.06] bg-black/25 text-white/60 flex items-center justify-center"
                    style={{ fontSize: "10px", fontWeight: 600 }}
                  >
                    +{fiber.galleryImages.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {archivedProfiles.length > 0 && (
          <div className="rounded-lg border border-amber-300/20 bg-amber-500/[0.04]">
            <button
              type="button"
              onClick={() => setShowArchived((prev) => !prev)}
              className="w-full px-3 py-2 flex items-center justify-between text-left text-amber-200/90 hover:text-amber-100"
              aria-expanded={showArchived}
              aria-label={`Archived (${archivedProfiles.length})`}
            >
              <span style={{ fontSize: "11px", fontWeight: 700 }}>
                Archived ({archivedProfiles.length})
              </span>
              <span aria-hidden>{showArchived ? "▾" : "▸"}</span>
            </button>
            {showArchived && (
              <div className="px-2 pb-2 space-y-2">
                {archivedProfiles.map((fiber) => (
                  <div
                    key={fiber.id}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.has(fiber.id)}
                        onChange={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(fiber.id)) next.delete(fiber.id);
                            else next.add(fiber.id);
                            return next;
                          })
                        }
                      />
                      <button
                        onClick={() => onSelectProfile(fiber.id)}
                        className="text-white/75 hover:text-white/90"
                        style={{ fontSize: "12px", fontWeight: 600 }}
                      >
                        {fiber.name}
                      </button>
                      <ProfileStatusCircle
                        status={fiber.status}
                        onToggle={() => toggleProfileStatus(fiber.id, fiber.status ?? "archived")}
                        dataTestId={`workspace-status-circle-${fiber.id}`}
                      />
                      <span className="text-white/30 ml-auto" style={{ fontSize: "10px" }}>
                        {fiber.galleryImages.length} image{fiber.galleryImages.length === 1 ? "" : "s"}
                      </span>
                      <button
                        onClick={() => onOpenScoutForProfile(fiber.id)}
                        className="px-2 py-1 rounded bg-blue-500/15 border border-blue-500/25 text-blue-300/85 hover:text-blue-300"
                        style={{ fontSize: "10px", fontWeight: 600 }}
                      >
                        Scout
                      </button>
                    </div>

                    {fiber.galleryImages.length > 0 && (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {fiber.galleryImages.slice(0, 4).map((entry, index) => (
                          <button
                            key={`${fiber.id}-${entry.url}-${index}`}
                            type="button"
                            onClick={() =>
                              setLightbox({
                                fiberName: fiber.name,
                                imageUrl: entry.url,
                              })}
                            className="block w-full rounded border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.14] transition-colors"
                            onContextMenu={(event) => openContextMenuForImage(event, entry.url)}
                          >
                            <img
                              src={entry.url}
                              alt={`${fiber.name} image ${index + 1}`}
                              className="w-full aspect-[4/3] rounded object-cover bg-white/[0.04]"
                              loading="lazy"
                              onContextMenu={(event) => openContextMenuForImage(event, entry.url)}
                            />
                          </button>
                        ))}
                        {fiber.galleryImages.length > 4 && (
                          <div
                            className="w-full aspect-[4/3] rounded border border-white/[0.06] bg-black/25 text-white/60 flex items-center justify-center"
                            style={{ fontSize: "10px", fontWeight: 600 }}
                          >
                            +{fiber.galleryImages.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative isolate max-w-5xl w-full"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-3 -z-10 rounded-2xl border border-white/[0.12] bg-black/35 shadow-[0_18px_80px_rgba(0,0,0,0.55)]"
            />
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute top-2 right-2 z-10 px-2 py-1 rounded bg-black/55 border border-white/[0.16] text-white/80 hover:text-white"
              style={{ fontSize: "11px", fontWeight: 600 }}
            >
              Close
            </button>
            <img
              src={lightbox.imageUrl}
              alt={`${lightbox.fiberName} preview`}
              className="block mx-auto max-w-[92vw] max-h-[88vh] w-auto h-auto rounded object-contain border border-white/[0.12]"
              onContextMenu={(event) => openContextMenuForImage(event, lightbox.imageUrl)}
            />
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          role="menu"
          className="fixed z-[14010] min-w-[180px] rounded-md border border-white/[0.14] bg-[#0f1115] shadow-lg shadow-black/40 p-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              triggerImageDownload(contextMenu.imageUrl);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded text-white/85 hover:bg-white/[0.08]"
            style={{ fontSize: "11px", fontWeight: 600 }}
          >
            Download Image
          </button>
        </div>
      )}
    </div>
  );
}


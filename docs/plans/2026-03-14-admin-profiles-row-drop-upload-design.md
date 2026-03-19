# Admin Profiles Row Drop Upload Design

**Date:** 2026-03-14  
**Status:** Approved  
**Scope:** Admin workspace profiles list (`/admin`, `Profiles` pane)

---

## Goal

Enable drag-and-drop image upload by dropping files directly onto a specific profile row. The dropped images upload to Cloudinary, then append to that profile's `galleryImages`.

## Decision

- **Interaction:** Drop files onto a single row target.
- **Upload path:** Use existing Cloudinary runtime helpers in `runtime/cloudinary-upload.ts`.
- **Mutation behavior:** Append uploaded URLs to `galleryImages` (do not replace).
- **Hero sync:** Keep existing behavior where `image` follows `galleryImages[0]` via `dataSource.updateFiber` patch sanitization.

## UX Behavior

- Row shows drag-over affordance when eligible files are dragged.
- On drop:
  - If no Cloudinary config, show error toast.
  - If upload succeeds, append uploaded images and show success toast with count.
  - If upload fails, show error toast.
- Row-level uploading state prevents duplicate uploads on the same row while in-flight.

## Data Flow

1. Row `onDrop` receives `DataTransfer.files`.
2. Filter accepted files (`image/*`, plus empty MIME fallback for Finder-like drags).
3. Read Cloudinary config with `getCloudinaryConfig()`.
4. Upload with `uploadImageFilesToCloudinary(files, config)`.
5. Read current fiber with `getFiberById(id)`.
6. Build appended entries: `[{ url: secureUrl }, ...]`.
7. Call `updateFiber(id, { galleryImages: [...current, ...newEntries] })`.

## Files

- **Modify:** `src/app/components/admin/admin-workspace.tsx`
- **Modify:** `src/app/components/admin/admin-workspace.test.tsx`

## Risks and Mitigations

- **Virtualized list row recycling:** keep row state keyed by `fiber.id`, not index.
- **Duplicate drops:** guard by per-row uploading map.
- **Type drift in mocked tests:** extend test mocks for `useAtlasData` and upload runtime.

## Test Strategy

- Add failing test first:
  - drop files on a profile row triggers Cloudinary upload and `updateFiber` with appended `galleryImages`.
- Keep existing workspace tests passing.


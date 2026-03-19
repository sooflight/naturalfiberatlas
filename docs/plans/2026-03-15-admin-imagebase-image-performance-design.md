# Admin ImageBase Image Performance Design

**Date:** 2026-03-15  
**Owner:** Admin surface (`ImageBase`)  
**Status:** Approved for planning

---

## Problem

`Admin ImageBase` previews currently feel slow and visually inconsistent:
- Grid/card previews often pull large original assets instead of right-sized derivatives.
- Large image sets cause expensive decode/paint work during scroll.
- Current image loading is mostly `loading="lazy"` with no format/size negotiation.

The immediate priority is **faster first paint and smoother scrolling**.

---

## Goals

- Reduce time to first meaningful image paint in ImageBase browse views.
- Improve scroll smoothness under medium/large profile counts.
- Keep full-quality originals for lightbox and detailed inspection.
- Make changes incrementally, minimizing risk to existing workflows.

## Non-Goals

- Rebuilding ingestion architecture.
- Replacing storage backend.
- Changing editorial workflows for source image uploads.

---

## Selected Strategy (Phased)

### Phase 1 (highest ROI, lowest risk)
1. **Thumbnail derivatives for preview surfaces**
   - Use transformed/derived URLs for card/grid/list previews.
   - Keep original URL for lightbox/full-resolution actions.
2. **Viewport-aware eager policy**
   - Eager load first above-the-fold previews (small bounded number).
   - Keep lazy loading for offscreen items.
3. **Decode/render stabilization**
   - Add `decoding="async"` and preserve fixed aspect boxes for previews.

### Phase 2
4. **Responsive source selection**
   - Add `srcSet` and `sizes` for preview components based on layout mode and zoom.

### Phase 3 (conditional)
5. **Virtualization**
   - Add list/grid virtualization only if profile count still produces scroll jank after phases 1-2.

---

## Rationale

- The dominant bottleneck is likely oversized network transfers and decode cost for preview tiles.
- Thumbnail derivatives directly reduce bytes and decode time.
- Controlled eager loading improves first paint while avoiding full eager waterfalls.
- Responsive source selection prevents over-fetch across breakpoints and zoom settings.
- Virtualization is powerful but higher complexity; deferring reduces implementation risk.

---

## Architectural Notes

- Add a small image URL utility layer in admin components for preview URL generation and sizing hints.
- Extend the existing `LazyImage` wrapper to support:
  - `decoding`, `fetchPriority`, `srcSet`, `sizes`
  - optional `width`/`height` hinting where practical
- Update preview call sites in `ImageDatabaseManager` and related tiles/cards to use the new API.
- Keep fallback behavior safe: if transform cannot be generated, use original `src`.

---

## Risks and Mitigations

- **Risk:** Broken transforms for non-transformable hosts.  
  **Mitigation:** Host detection + transparent fallback to original URL.

- **Risk:** Preview sharpness regression from over-compression.  
  **Mitigation:** Configure quality presets per surface (thumb vs grid vs lightbox untouched).

- **Risk:** Regressions in tests expecting old image props.  
  **Mitigation:** Add focused unit tests for utility output and component prop behavior.

---

## Success Criteria

- Noticeably faster above-the-fold image paint in admin browse mode.
- Reduced stutter during scrolling of large profile lists.
- No regression in image editing/lightbox workflows.
- Existing admin image tests pass with added coverage for preview URL strategy.

# Admin Lightbox Editorial Cinema Design

**Date:** 2026-03-15  
**Scope:** `admin-package/src/components/admin/image-database/ImageLightbox.tsx`

## Goal

Redesign the Admin Lightbox into an editorial, cinematic viewing experience with stronger visual hierarchy while preserving existing admin workflows (crop, keyboard navigation, thumbnails, close behavior).

## Chosen Direction

**Editorial Cinema** (approved):
- Image-first immersive presentation
- Minimal floating chrome with high discoverability on interaction
- Filmstrip dock with stronger active state
- Dedicated crop edit mode with clearer control affordances

## UX Decisions

### 1) Layout and Visual Hierarchy
- Keep full-screen dark backdrop but add subtle depth layering.
- Replace wide static header with a compact floating utility cluster.
- Convert nav arrows into edge hit-zones with visible controls on hover/focus.
- Restyle the bottom thumbnail strip as a frosted dock.
- Enter a distinct crop mode visual state with stronger control contrast.

### 2) Interaction and Motion
- Maintain existing open/close behavior and keyboard semantics.
- Add staged reveal for top/bottom chrome.
- Improve navigation orientation with directional transition hints.
- Upgrade crop handles, ratio controls, and live selection feedback.
- Respect `prefers-reduced-motion` by minimizing decorative motion.

### 3) Accessibility and Keyboard
- Preserve/strengthen focus handling and close semantics.
- Improve labels for controls, ratio options, and current image position.
- Add visible shortcut hints for key actions.
- Ensure contrast and target sizes remain usable under low-opacity styling.

## Non-Goals

- No API contract changes to `ImageLightbox` props.
- No behavior changes to data persistence or crop URL generation logic.
- No redesign of parent admin pages in this pass.

## Acceptance Criteria

- Lightbox visuals are substantially upgraded to the approved Editorial Cinema direction.
- Existing navigation and crop actions still function (mouse + keyboard).
- Component remains compatible with current `ImageDatabaseManager` integration.
- Reduced-motion users get a calmer experience.
- Tests cover critical interaction and accessibility states.

# Admin Workspace Top 3 Improvements: Detailed Design

**Date:** 2026-03-14  
**Status:** Design Ready for Implementation  
**Scope:** Admin workspace (`/admin`) enhancements

---

## Overview

This document details the design for the three highest-priority improvements to the admin workspace, selected based on:
1. Alignment with existing roadmap (Command-Centric Inspector already planned)
2. Technical feasibility (low to medium effort)
3. User impact (immediate workflow improvements)

---

## Improvement 1: Contextual Inspector Drawer

### Concept
Transform the always-visible right panel preview into a command-opened contextual inspector drawer that provides focused, information-dense inspection of the current selection. This aligns with the existing `2026-03-07-command-centric-inspector-unification-design.md` implementation plan.

### Current State
- Right panel is always visible, showing either live preview or empty state
- Panel consumes ~30% of horizontal screen real estate even when not needed
- Preview is passive rather than actionable

### Proposed Design

#### Visual Design
```
┌─────────────────────────────────────────────────────────────┐
│  Admin Workspace                                              │
│  ┌─────────────────────┬────────────────┬──────────────┐     │
│  │                     │                │ ▓▓▓▓▓▓▓▓▓▓▓ │     │
│  │   Fiber List        │  Unified       │ ▓ Inspector ▓ │     │
│  │   (left panel)      │  Editor        │ ▓  Drawer   ▓ │     │
│  │                     │  (center)      │ ▓▓▓▓▓▓▓▓▓▓▓ │     │
│  │                     │                │    ↑         │     │
│  │                     │                │  Handle      │     │
│  └─────────────────────┴────────────────┴──────────────┘     │
└─────────────────────────────────────────────────────────────┘

When Open:
┌─────────────────────────────────────────────────────────────┐
│  Admin Workspace                                              │
│  ┌────────────────┬───────────────┬──────────────────────┐    │
│  │                │               │ ┌──────────────────┐ │    │
│  │   Fiber        │  Unified      │ │ Cotton Profile   │ │    │
│  │   List         │  Editor         │ │ ● Published      │ │    │
│  │                │               │ ├──────────────────┤ │    │
│  │                │               │ │ Health: 85%      │ │    │
│  │                │               │ │ ████████░░       │ │    │
│  │                │               │ ├──────────────────┤ │    │
│  │                │               │ │ Quick Actions:   │ │    │
│  │                │               │ │ [Edit][Scout]    │ │    │
│  │                │               │ │ [Duplicate]      │ │    │
│  │                │               │ ├──────────────────┤ │    │
│  │                │               │ │ Details          │ │    │
│  │                │               │ │ • 12 images      │ │    │
│  │                │               │ │ • 3 process      │ │    │
│  │                │               │ │   steps          │ │    │
│  │                │               │ │ • Last edit:     │ │    │
│  │                │               │ │   2 hours ago    │ │    │
│  │                │               │ └──────────────────┘ │    │
│  └────────────────┴───────────────┴──────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

#### Interaction Model

**Opening the Inspector:**
- Command palette: `cmd.inspect.open` or type "inspect"
- Keyboard shortcut: `I` key (when not in input field)
- Click on collapsed handle on right edge
- Contextual trigger: selecting a fiber auto-opens inspector (configurable)

**Closing the Inspector:**
- `Escape` key
- Click outside drawer
- Command palette: `cmd.inspect.close`
- Click X button in drawer header

**Drawer Behavior:**
- Slide-in animation from right (300ms ease-out)
- Width: 380px fixed (responsive: 90vw on mobile)
- Backdrop: subtle darkening of main content when open
- Content scrolls independently

#### Drawer Sections

1. **Header**
   - Entity title (clickable to edit)
   - Entity type badge (fiber, batch selection, etc.)
   - Status indicator (published, draft, modified)
   - Close button

2. **Health Summary**
   - Circular completeness meter (same as health view)
   - Key stats: images count, text completeness, issues count
   - "View full health" link to health tab

3. **Quick Actions**
   - 3-4 primary context-aware actions
   - Examples for fiber:
     - Edit (opens unified editor)
     - Scout Images (opens image scout)
     - Duplicate (creates copy)
     - Export JSON
   - Rendered as icon + text buttons

4. **Details Region**
   - Mode-specific content via adapter pattern
   - Scrollable section

5. **Audit Trail**
   - Last modified timestamp
   - Source indicator (bundled, local override, gist)
   - Change count since last snapshot

#### Mode Adapters

Each workspace mode provides an adapter implementing:

```typescript
interface InspectorAdapter<TSelection> {
  getContext(selection: TSelection): InspectorContext | null;
  getQuickActions(selection: TSelection): QuickAction[];
  getHealthSummary(selection: TSelection): HealthSummary;
  isContextValid(context: InspectorContext): boolean;
}

interface InspectorContext {
  mode: AdminView;
  entityType: "fiber" | "batch-selection" | "changeset" | null;
  entityId: string | string[];
  version: number; // for stale detection
  summary: string;
  actions: QuickAction[];
  details: unknown; // adapter-specific shape
}
```

**Adapters to implement:**
- `fiberInspectorAdapter` - for single fiber selection
- `batchInspectorAdapter` - for multi-select in list view
- `healthInspectorAdapter` - for health diagnostic item
- `changesetInspectorAdapter` - for changeset selection

#### Integration Points

**Files to modify:**
- `src/app/components/admin/admin-workspace.tsx` - add drawer shell, integrate with PanelGroup
- `src/app/components/admin/AtlasWorkbenchShell.tsx` - keyboard shortcut handling
- `src/app/components/admin/admin-command-palette.tsx` - add inspect commands

**New files to create:**
- `src/app/components/admin/WorkbenchInspectorDrawer.tsx` - drawer shell component
- `src/app/components/admin/inspector/adapters/types.ts` - adapter contracts
- `src/app/components/admin/inspector/adapters/fiberAdapter.ts` - fiber-specific adapter
- `src/app/components/admin/inspector/adapters/batchAdapter.ts` - batch selection adapter

#### Button Reduction (Parity Map)

| Current Button | Replacement Path |
|----------------|------------------|
| Right panel preview | Inspector drawer content |
| Fiber list "edit" button | Inspector quick action |
| Image thumbnail click | Inspector → Scout action |
| Export buttons in header | Command palette + Inspector action |

### Testing Strategy

```typescript
// WorkbenchInspectorDrawer.test.tsx
describe("WorkbenchInspectorDrawer", () => {
  it("opens with I key and closes with Escape", () => {});
  it("shows fiber context when fiber selected", () => {});
  it("shows batch context when multiple fibers selected", () => {});
  it("displays health summary from adapter", () => {});
  it("executes quick actions via command registry", () => {});
  it("detects stale context and shows refresh prompt", () => {});
});
```

### Success Metrics
- Inspector opens in <100ms
- All primary actions accessible within 2 clicks/taps
- No capability regressions (parity map passes)
- 30-50% reduction in visible non-primary buttons

---

## Improvement 2: Field-Level Validation Gates

### Concept
Add inline validation to the unified editor with configurable rules per field. Show warnings/errors in context, not just in the separate health dashboard.

### Current State
- Health dashboard runs diagnostics across all fibers
- Issues are surfaced in a separate tab
- No inline indication during editing
- User can save incomplete/problematic data without warning

### Proposed Design

#### Validation Rules System

```typescript
interface ValidationRule {
  id: string;
  field: string;
  severity: "error" | "warning" | "info";
  message: string;
  validate: (value: unknown, fiber: FiberProfile) => boolean;
}

const DEFAULT_VALIDATION_RULES: ValidationRule[] = [
  {
    id: "about-min-length",
    field: "about",
    severity: "warning",
    message: "About text should be at least 100 characters for completeness",
    validate: (v) => typeof v === "string" && v.trim().length >= 100,
  },
  {
    id: "gallery-min-images",
    field: "galleryImages",
    severity: "error",
    message: "Gallery must have at least 1 image",
    validate: (v) => Array.isArray(v) && v.length >= 1,
  },
  {
    id: "subtitle-required",
    field: "subtitle",
    severity: "error",
    message: "Subtitle is required",
    validate: (v) => typeof v === "string" && v.trim().length > 0,
  },
  {
    id: "tags-recommended",
    field: "tags",
    severity: "warning",
    message: "At least one tag is recommended",
    validate: (v) => Array.isArray(v) && v.length > 0,
  },
  {
    id: "regions-recommended",
    field: "regions",
    severity: "info",
    message: "Region information helps users find this fiber",
    validate: (v) => Array.isArray(v) && v.length > 0,
  },
];
```

#### Inline Validation UI

**Card-Level Indicators:**
```
┌─────────────────────────────────────┐
│  About Card                    ⚠️   │  ← warning badge on card header
│                                     │
│  [About text content...]            │
│  Text is too short (45/100 chars)   │  ← inline message
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Gallery Studio                ❌   │  ← error badge on card header
│                                     │
│  No images added yet                │
│  Gallery must have at least 1 image │  ← error message
│  [Add Images]                       │
└─────────────────────────────────────┘
```

**Field-Level Indicators:**
- Yellow border + icon for warnings
- Red border + icon for errors
- Blue/info icon for suggestions
- Tooltip on hover showing validation message

**Save Bar Integration:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Save Changes]  2 warnings, 1 error    [Force Save Anyway]   │
│              ↑ summary badge            ↑ override option   │
└─────────────────────────────────────────────────────────────┘
```

#### Pre-Save Checklist Modal

When user attempts to save with errors:

```
┌─────────────────────────────────────────┐
│  Review Issues Before Saving       [×]  │
├─────────────────────────────────────────┤
│                                         │
│  ⚠️ Warnings (2)                        │
│  ├─ About text is short                 │
│  └─ No tags assigned                    │
│                                         │
│  ❌ Errors (1) - Blocking                 │
│  └─ Gallery has no images               │
│                                         │
│  [Fix Issues]      [Save Anyway]        │
│                     (admin override)    │
└─────────────────────────────────────────┘
```

#### Configuration

Rules are configurable per-deployment via:

```typescript
// config/validation.ts
export const VALIDATION_CONFIG = {
  rules: DEFAULT_VALIDATION_RULES,
  // Allow customization
  allowForceSave: true, // show "save anyway" option
  blockOnErrors: false,  // if true, errors prevent save completely
  showInline: true,      // show indicators inline
  showSummary: true,     // show summary in save bar
};
```

### Integration Points

**Files to modify:**
- `src/app/components/admin/unified-editor.tsx` - add validation state, integrate with cards
- `src/app/components/admin/card-editor.tsx` - add validation indicators to card shells
- `src/app/data/data-provider.ts` - add validateFiber method

**New files to create:**
- `src/app/components/admin/validation/ValidationProvider.tsx` - context for validation state
- `src/app/components/admin/validation/rules.ts` - validation rule definitions
- `src/app/components/admin/validation/ValidationBadge.tsx` - badge component
- `src/app/components/admin/validation/SaveChecklistModal.tsx` - pre-save modal

### Testing Strategy

```typescript
// validation.rules.test.ts
describe("validation rules", () => {
  it("flags short about text as warning", () => {});
  it("flags empty gallery as error", () => {});
  it("flags missing subtitle as error", () => {});
});

// ValidationBadge.test.tsx
describe("ValidationBadge", () => {
  it("shows warning color for warning severity", () => {});
  it("shows error color for error severity", () => {});
  it("shows tooltip with message on hover", () => {});
});
```

### Success Metrics
- All health dashboard diagnostics now visible inline
- Users fix 50% more issues before save
- No "save regret" (saving then immediately reopening to fix)

---

## Improvement 3: Graduated Disclosure UI

### Concept
Add a Simple/Advanced toggle to the unified editor that shows only essential fields by default, reducing cognitive load for occasional editors while keeping all power accessible.

### Current State
- Unified editor shows all sections simultaneously
- ~12 expandable sections can overwhelm
- No differentiation between frequent and rare edits
- Occasional editors see full complexity on every edit

### Proposed Design

#### Mode Toggle

```
┌─────────────────────────────────────────────────────────────┐
│  Editing: Cotton                              [Simple ▼]    │
│                                                  ↑ toggle   │
└─────────────────────────────────────────────────────────────┘
```

**Toggle Options:**
- **Simple** - Show only high-frequency sections
- **Advanced** - Show all sections (current behavior)

**Keyboard:**
- `M` key toggles mode (when not in input)
- Persisted in sessionStorage (not localStorage - per-session)

#### Simple Mode Sections

```typescript
const SIMPLE_MODE_SECTIONS = [
  "Hero",           // Always visible - core identity
  "About",          // Primary content
  "Gallery",        // Media (high engagement)
  "Profile Pills",  // Quick metadata
];

const ADVANCED_MODE_SECTIONS = [
  ...SIMPLE_MODE_SECTIONS,
  "Insights",       // Auto-generated from about
  "Trade",          // Pricing/availability
  "Sustainability", // Ratings/certifications
  "Quotes",         // Testimonials
  "Process",        // Manufacturing steps
  "Anatomy",        // Technical specs
  "Care",           // Usage instructions
  "World Names",    // Regional variants
  "See Also",       // Cross-references
];
```

#### Simple Mode Layout

```
┌─────────────────────────────────────┐
│  Hero Card                          │
│  [Image] [Name] [Subtitle]            │
├─────────────────────────────────────┤
│  About Card                     [✓] │
│  [Long-form text editor...]         │
│  Status: Complete                     │
├─────────────────────────────────────┤
│  Gallery Studio                 [3] │
│  [Image grid with quick actions]    │
├─────────────────────────────────────┤
│  Profile Pills                  [5] │
│  [Tag pills: Natural, Soft, ...]    │
├─────────────────────────────────────┤
│                                     │
│  [+ 8 more sections]                │  ← expandable hint
│  Switch to Advanced mode to access  │
│                                     │
├─────────────────────────────────────┤
│  [Save Changes]                     │
└─────────────────────────────────────┘
```

#### Visual Differentiation

**Simple Mode:**
- Larger cards, more whitespace
- Section status badges (✓ complete, ⚠️ needs attention)
- Fewer borders/dividers
- Prominent "Switch to Advanced" affordance at bottom

**Advanced Mode:**
- Current compact layout preserved
- All sections expanded by default
- Toggle shows "Advanced ▼"

#### Smart Defaults

**Auto-promotion suggestion:**
If user expands a "hidden" section 3+ times in a session:
```
┌────────────────────────────────────────┐
│  💡 Frequently editing Process Steps?   │
│  Switch to Advanced mode to always     │
│  see all sections.                     │
│         [Stay Simple] [Go Advanced]    │
└────────────────────────────────────────┘
```

#### Section Status Badges

Each visible section shows status:
- ✓ Complete (all required fields filled)
- ⚠️ Needs attention (validation warnings)
- Empty circle (optional section, not filled)

### Integration Points

**Files to modify:**
- `src/app/components/admin/unified-editor.tsx` - add mode toggle, conditional section rendering
- `src/app/components/admin/admin-workspace.tsx` - persist mode preference

**New files to create:**
- `src/app/components/admin/editor/EditorModeToggle.tsx` - toggle component
- `src/app/components/admin/editor/section-config.ts` - section visibility config

### Testing Strategy

```typescript
// unified-editor.mode.test.tsx
describe("UnifiedEditor modes", () => {
  it("shows only simple sections in simple mode", () => {});
  it("shows all sections in advanced mode", () => {});
  it("persists mode preference in sessionStorage", () => {});
  it("shows promotion hint after 3 section expansions", () => {});
  it("preserves edited values when switching modes", () => {});
});
```

### Success Metrics
- Occasional editors complete edits 30% faster
- 80% of users stay in Simple mode for quick edits
- No increase in "where is X field?" confusion

---

## Implementation Order

Recommended sequence for minimal disruption:

1. **Field-Level Validation** (#2) - 
   - Self-contained, no dependencies
   - Adds value immediately
   - Can be built alongside existing health view

2. **Graduated Disclosure** (#3) - 
   - Builds on unified editor
   - Validation badges integrate well with simplified view
   - Low risk, high user benefit

3. **Contextual Inspector** (#1) - 
   - Largest change
   - Builds on command system (already planned)
   - Benefits from validation work (health summary)

---

## Success Metrics (Combined)

| Metric | Target |
|--------|--------|
| Data completeness score | +15% improvement |
| Average edit session time | -20% reduction |
| "Save anyway" usage | <10% of saves |
| User-reported confusion | -50% reduction |
| Button/action accessibility | 100% via commands |

---

## Open Questions

1. Should validation rules be configurable per-fiber-category?
2. Should Simple mode be the default for new users?
3. Should inspector drawer auto-open on fiber selection?
4. How do we handle validation for supplementary tables (process, anatomy, etc.)?

---

## Appendix: Related Documents

- `2026-03-07-command-centric-inspector-unification-design.md` - Inspector design foundation
- `2026-03-07-command-centric-inspector-unification-implementation-plan.md` - Implementation tasks
- `admin-unification-audit-matrix.md` - Component audit
- `KeyFeatures.md` - Feature inventory

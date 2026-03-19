# Admin Grid Reorder + 5:7 Cards Design

**Goal:** Add drag-to-reorder in Admin `Grid` view that updates global master sequence order, switch grid cards to a 5:7 media ratio, and simplify the grid zoom controller UI.

## Scope

- Admin browse `Grid` view in `Library`
- Admin `GridView` card rendering and interactions
- Master sequence synchronization through shared order source
- Targeted test updates for reorder behavior and order-writing integration

## Decisions

### 1) Reorder semantics

- Reorder uses **global order** semantics.
- Drag/drop in filtered views still writes to canonical global sequence by profile id.
- Drop on self or invalid targets is a no-op.

### 2) Integration point

- `GridView` emits an `onReorder(draggedId, targetId)` callback.
- `Library` owns order persistence and calls `dataSource.setFiberOrder(nextOrder)` after computing the new global order.
- Existing sequence consumers continue reading shared order and reflect updates without extra wiring.

### 3) UI

- Grid media tile changes from square to `5:7`.
- Drag affordances:
  - dragged card reduced opacity
  - drop target subtle ring/highlight
- Zoom controls in `Library` grid toolbar become minimal:
  - keep `-`, slider, `+`
  - remove extra label and percentage readout
  - keep existing bounds/step behavior

## Edge Handling

- Ignore reorder when dragged id equals target id.
- Ignore reorder when either id is missing from source order.
- Clear temporary drag state on drag end / successful drop.

## Validation Plan

- `GridView` unit tests:
  - drag start + drop emits reorder callback with ids
  - self-drop does not emit callback
- `Library` tests:
  - grid reorder callback writes reordered ids via `dataSource.setFiberOrder`
- Run focused test commands for edited files and fix any new lints.

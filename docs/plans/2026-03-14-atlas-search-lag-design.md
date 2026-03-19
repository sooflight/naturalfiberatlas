# Atlas Frontend Search Lag Design

## Context
- User-reported symptom: typing in Atlas frontend search causes lag/jank.
- Search state propagates through `TopNav` -> `HomePage` -> `GridView`.
- Current search path contains runtime debug `fetch(...)` calls in hot paths and immediate filtering on each keystroke.

## Goals
- Keep current search behavior/functionality.
- Improve typing responsiveness and reduce main-thread pressure.
- Minimize risk and code churn.

## Non-goals
- Rebuild the full filtering/data pipeline.
- Add new search features or ranking.

## Approaches Considered
1. Remove runtime debug network logging in hot search path.
2. Defer/debounce search filtering updates.
3. Build precomputed searchable index.

## Selected Approach
Implement (1) + (2):
- Remove debug `fetch(...)` instrumentation currently executed during search input/effects/filter compute.
- Use deferred search input in filtering so keystrokes stay responsive while grid updates catch up.

## Data Flow (post-fix)
1. User types in `TopNav` input.
2. Search value updates quickly in local/global state.
3. `GridView` filters using deferred query (`useDeferredValue`) rather than immediate keystroke value.
4. UI remains responsive while results update with slight, intentional deferral.

## Risks and Mitigations
- Risk: slight delay in visible filtering response.
  - Mitigation: use React deferred value (small adaptive deferral) rather than large fixed debounce.
- Risk: removing diagnostics may reduce visibility.
  - Mitigation: keep code clean; reintroduce behind explicit dev flag if needed.

## Verification Plan
- Manual: type quickly in search bar and confirm reduced lag.
- Functional: verify result correctness still matches query.
- Regression: clear search, confirm full list returns and no reset loops.

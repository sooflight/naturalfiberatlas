# Event Idempotency and Replay

## Purpose

Prevent duplicate mutation side effects during retry and migration cutovers.

## Rules

- Each event carries a globally unique `eventId`.
- Consumers must no-op already applied `eventId`s.
- Replays use original `eventId` and payload.
- Parity checks compare primary + shadow writes before rollout promotion.

## Replay Envelope

```json
{
  "eventId": "evt_2026_03_13_abc123",
  "emittedAt": "2026-03-13T23:21:00.000Z",
  "payload": {
    "entityId": "hemp",
    "mutationType": "gallery.update"
  }
}
```

## Operational Gate

Rollout can advance only when:

- transaction test suite passes
- parity report has zero mismatches
- replay simulation returns no duplicate side effects


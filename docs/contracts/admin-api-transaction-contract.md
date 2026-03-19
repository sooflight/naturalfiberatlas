# Admin API Transaction Contract

## Purpose

Define transaction guarantees for bundled profile + image mutations used by hybrid admin workflows.

## Contract

- Every mutation bundle emits a stable `transactionId`.
- Steps execute in order and are rolled back in reverse order on failure.
- Partial commits are not allowed.
- Save status transitions: `idle -> saving -> saved` or `idle -> saving -> error`.

## Request Envelope

```json
{
  "transactionId": "txn_2026_03_13_0001",
  "entityId": "hemp",
  "steps": [
    { "id": "profile_patch", "kind": "profile" },
    { "id": "gallery_patch", "kind": "images" }
  ]
}
```

## Response Envelope

```json
{
  "transactionId": "txn_2026_03_13_0001",
  "status": "saved",
  "appliedSteps": ["profile_patch", "gallery_patch"]
}
```

## Failure Envelope

```json
{
  "transactionId": "txn_2026_03_13_0001",
  "status": "error",
  "failedStep": "gallery_patch",
  "rolledBackSteps": ["profile_patch"]
}
```


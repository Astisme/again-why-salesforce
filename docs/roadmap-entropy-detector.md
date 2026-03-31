# Roadmap Entropy Detector

`roadmap-entropy-detector` is a Deno CLI that compares a baseline roadmap snapshot with a current snapshot and reports scope creep and schedule drift.

## Run

```bash
deno task roadmap-entropy -- --baseline ./baseline.json --current ./current.json
```

## Input Schema

Both `--baseline` and `--current` must point to JSON files with this shape:

```json
{
  "items": [
    {
      "id": "ROADMAP-123",
      "status": "in_progress",
      "targetDate": "2026-05-15",
      "scopePoints": 8
    },
    {
      "id": "ROADMAP-456",
      "status": "done",
      "targetDate": "2026-04-02",
      "tasks": ["task-1", "task-2"]
    }
  ]
}
```

Rules:
- `id` must be unique per snapshot.
- `targetDate` must use `YYYY-MM-DD`.
- Scope is resolved from `scopePoints` when present, otherwise from `tasks.length`.
- Each item must provide either `scopePoints` or `tasks`.

## Detection Rules

Scope creep:
- Existing item scope increases above `--scope-increase-threshold-pct`.
- New current-only items are treated as scope creep (`reason: "new_item"`) when they exceed the same threshold.

Schedule drift:
- `current.targetDate` slips later than `baseline.targetDate`.
- Item is incomplete and the detector `today` date is after `current.targetDate`.

## Exit Codes

- `0`: healthy or within configured thresholds.
- `1`: invalid arguments/input schema/JSON parse error.
- `2`: threshold breach.

Threshold checks are strict `>` comparisons:
- `--max-creep-findings` (default `0`)
- `--max-drift-findings` (default `0`)
- `--max-entropy-score` (default `0`)

## Options

- `--baseline <path>` (required)
- `--current <path>` (required)
- `--today <YYYY-MM-DD>` (default `2026-01-01`)
- `--scope-increase-threshold-pct <number>` (default `0`)
- `--max-creep-findings <number>` (default `0`)
- `--max-drift-findings <number>` (default `0`)
- `--max-entropy-score <number>` (default `0`)
- `--help`

## Example Output

```json
{
  "status": "alert",
  "metadata": {
    "today": "2026-03-31"
  },
  "thresholds": {
    "scopeIncreaseThresholdPct": 0,
    "maxCreepFindings": 0,
    "maxDriftFindings": 0,
    "maxEntropyScore": 0
  },
  "exceeded": {
    "creep": true,
    "drift": true,
    "entropy": true
  },
  "metrics": {
    "baselineItemCount": 1,
    "currentItemCount": 2,
    "addedItemCount": 1,
    "removedItemCount": 0,
    "creepCount": 2,
    "driftCount": 2,
    "totalScopeIncrease": 4,
    "totalSlipDays": 9,
    "overdueCount": 2,
    "entropyScore": 33
  },
  "findings": {
    "creep": [],
    "drift": []
  }
}
```

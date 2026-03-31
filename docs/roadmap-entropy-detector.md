# Roadmap Entropy Detector

`Roadmap Entropy Detector` compares two roadmap snapshots and flags:

- scope creep (new work or excessive scope growth)
- schedule drift (target-date slips and overdue incomplete items)

It emits machine-readable JSON and uses exit codes for CI gates.

## Run

```bash
deno task roadmap-entropy --baseline baseline.json --current current.json
```

## Input Schema

Both files are JSON objects with an `items` array.

```json
{
  "items": [
    {
      "id": "epic-auth",
      "status": "in_progress",
      "targetDate": "2026-04-15",
      "scopePoints": 13
    },
    {
      "id": "epic-billing",
      "status": "planned",
      "targetDate": "2026-04-20",
      "tasks": ["task-1", "task-2", "task-3"]
    }
  ]
}
```

Required fields per item:

- `id`: non-empty string, unique inside each snapshot
- `status`: non-empty string
- `targetDate`: `YYYY-MM-DD`
- scope value from either:
  - `scopePoints` (non-negative number), or
  - `tasks` array length

## Options

- `--scope-threshold <number>`: growth-ratio threshold for creep (`default: 0.1`)
- `--drift-days-threshold <n>`: allowed target-date slip days (`default: 0`)
- `--max-creep <n>`: max allowed creep findings (`default: 0`)
- `--max-drift <n>`: max allowed drift findings (`default: 0`)
- `--max-entropy <number>`: max allowed entropy score (`default: 0`)
- `--today <YYYY-MM-DD>`: overrides reference date for overdue checks

## Exit Codes

- `0`: healthy roadmap (`status: "ok"`)
- `1`: thresholds exceeded (`status: "alert"`)
- `2`: invalid arguments or invalid input JSON/schema

## Output Example

```json
{
  "status": "alert",
  "meta": {
    "today": "2026-03-31"
  },
  "thresholds": {
    "scopeThreshold": 0.1,
    "driftDaysThreshold": 0,
    "maxCreep": 0,
    "maxDrift": 0,
    "maxEntropy": 0
  },
  "summary": {
    "baselineItemCount": 2,
    "currentItemCount": 3,
    "creepCount": 2,
    "driftCount": 1,
    "entropyScore": 1.5476
  },
  "findings": {
    "scopeCreep": [
      {
        "type": "scope_increase",
        "id": "epic-auth",
        "baselineScope": 8,
        "currentScope": 13,
        "scopeDelta": 5,
        "scopeGrowthRatio": 0.625
      },
      {
        "type": "new_item",
        "id": "epic-reporting",
        "baselineScope": 0,
        "currentScope": 5,
        "scopeDelta": 5,
        "scopeGrowthRatio": null
      }
    ],
    "scheduleDrift": [
      {
        "type": "target_slip",
        "id": "epic-auth",
        "status": "in_progress",
        "baselineTargetDate": "2026-04-10",
        "currentTargetDate": "2026-04-15",
        "slipDays": 5,
        "overdueDays": 0
      }
    ]
  },
  "gates": {
    "creepExceeded": true,
    "driftExceeded": true,
    "entropyExceeded": true
  }
}
```

Note: when a value is `Infinity` in memory (for example growth ratio of a new item), JSON serialization outputs `null`.

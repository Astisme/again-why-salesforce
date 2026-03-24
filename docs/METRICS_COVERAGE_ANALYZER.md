# Metrics Coverage Analyzer

## Scope Assumptions

This analyzer intentionally uses a minimal static scope:

- Metrics instrumentation means telemetry paths in:
  - `src/salesforce/analytics.js` (Simple Analytics beacon and opt-out/consent handling)
  - `src/salesforce/update-settings.js` (usage-days tracking)
  - `src/salesforce/once-a-day.js` (daily trigger for telemetry paths)
- The analyzer does not execute extension code and does not validate runtime behavior.
- Coverage is inferred by mapping explicit source patterns to explicit `Deno.test(...)` names.

## Command Usage

Run from repository root:

```bash
deno task metrics-coverage
```

Alternative CLI options:

```bash
deno run --allow-read bin/metrics-coverage.ts --root .
deno run --allow-read bin/metrics-coverage.ts --compact
```

## Output Schema

The command emits JSON with this top-level structure:

- `totals`: aggregate counts by coverage status (`covered`, `partial`, `uncovered`)
- `scope`: static assumptions and file set used by the analyzer
- `matrix`: one entry per instrumentation target with:
  - `id`, `title`, `description`
  - `status`
  - `sourceLocations`: matched source pattern locations (`path`, `line`, matcher metadata)
  - `validatingTests`: mapped test cases (`path`, `line`, `title`)
  - `missingSourceMatchers`: expected source matchers not found
  - `missingTestTitles`: expected validating test titles not found

## Known Limitations

- Static matching can miss valid coverage when source/test patterns are renamed or refactored.
- Test-title matching is substring-based and cannot guarantee assertion quality.
- The analyzer only includes the explicit rule set in `bin/metrics-coverage.ts`; it is not generic telemetry discovery.

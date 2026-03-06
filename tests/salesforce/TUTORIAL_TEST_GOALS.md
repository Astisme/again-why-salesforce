# Salesforce Tutorial Test Goals (Linux)

## Main Goal

- Make `deno task test-sf` reliably run Salesforce E2E tests on Linux, including full tutorial completion in `tests/salesforce/tutorial.test.ts`.

## Goals and Subgoals

1. Chrome and profile launch
- Launch Chrome through Puppeteer with extension loaded from `src`.
- Normalize profile env inputs so both profile names and full profile paths work.
- Support Linux launch flags needed for stable Puppeteer + Chrome execution.

2. Authentication and session reuse
- Reuse pre-authenticated profile session when available.
- If session is not valid, attempt credential login using `SALESFORCE_USERNAME` and `SALESFORCE_PASSWORD`.
- If login still requires interaction, pause and wait for manual login in the opened Chrome window.

3. Salesforce setup and extension readiness
- Navigate to Salesforce Setup Home.
- Verify extension root/button selectors are present before tutorial actions.
- Reset tutorial progress before each tutorial test run.

4. Tutorial execution coverage
- Start tutorial from extension runtime messaging.
- Complete all tutorial steps in order:
- Intro confirmations.
- Highlighted setup-tab navigation.
- Favourite remove/add actions.
- Pin action completion.
- Manage Tabs open/reorder/save flow.
- Final confirmation steps.

5. Assertions and pass criteria
- Confirm tutorial UI is removed at the end.
- Confirm persisted tutorial progress marks completion (`>= 15`).
- Ensure both Salesforce tests in `deno task test-sf` pass.

## One-Time Prerequisite

- If no authenticated session exists yet, run `deno task test-sf`, complete Salesforce login in the opened Chrome window when prompted, then rerun `deno task test-sf`.

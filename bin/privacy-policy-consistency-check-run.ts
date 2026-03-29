#!/usr/bin/env -S deno run --allow-read

import { runPrivacyPolicyConsistencyChecker } from "./privacy-policy-consistency-check.ts";

Deno.exit(await runPrivacyPolicyConsistencyChecker());

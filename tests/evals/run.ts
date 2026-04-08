/**
 * Prompt eval runner.
 *
 * Runs each fixture through generate() and checks:
 *   - response returned exactly 3 variants
 *   - each variant has non-empty label + text
 *   - word count per variant is 100-250 (loose bracket around 150-200 target)
 *   - no banned clichés ("must-see", "won't last", "one-of-a-kind")
 *   - no exclamation points
 *   - soft signal: at least one variant mentions each string in shouldMention
 *
 * Exits 0 if all hard checks pass, 1 if any fail. Soft signals are warnings only.
 * Loads .env.local before calling generate() so ANTHROPIC_API_KEY is available.
 */

import { config } from "dotenv";
// override: true so .env.local wins over an empty shell-level ANTHROPIC_API_KEY
// (Claude Desktop exports an empty one into the shell, which otherwise blocks the real key)
config({ path: ".env.local", override: true });

import { generate, GenerateError } from "../../src/lib/generate";
import { fixtures, type Fixture } from "./fixtures";
import type { Variant } from "../../src/lib/types";

const BANNED_PHRASES = [
  "must-see",
  "must see",
  "won't last",
  "one-of-a-kind",
  "one of a kind",
  // v5 formula phrases — see listing-generator-v5.md "No formula phrases"
  "combines",
  "boasts",
  "nestled",
  "tucked away",
  "perfect for",
  "ideal for",
  "functional living",
  "modern living",
  "today's lifestyle",
  "this stunning",
  "this beautiful",
  "this exquisite",
];
// v4 makes length adaptive: sparse inputs are allowed to produce shorter
// variants rather than padding with invented filler. Floor lowered from 100.
const WORD_COUNT_MIN = 60;
const WORD_COUNT_MAX = 250;

interface CheckResult {
  passed: boolean;
  message: string;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

function checkVariant(variant: Variant, idx: number): CheckResult[] {
  const results: CheckResult[] = [];

  if (!variant.label || variant.label.trim().length === 0) {
    results.push({ passed: false, message: `Variant ${idx + 1}: empty label` });
  }
  if (!variant.text || variant.text.trim().length === 0) {
    results.push({ passed: false, message: `Variant ${idx + 1}: empty text` });
    return results;
  }

  const words = countWords(variant.text);
  if (words < WORD_COUNT_MIN || words > WORD_COUNT_MAX) {
    results.push({
      passed: false,
      message: `Variant ${idx + 1}: word count ${words} outside [${WORD_COUNT_MIN}, ${WORD_COUNT_MAX}]`,
    });
  }

  if (variant.text.includes("!")) {
    results.push({
      passed: false,
      message: `Variant ${idx + 1}: contains exclamation point`,
    });
  }

  const lowered = variant.text.toLowerCase();
  for (const banned of BANNED_PHRASES) {
    if (lowered.includes(banned)) {
      results.push({
        passed: false,
        message: `Variant ${idx + 1}: contains banned phrase "${banned}"`,
      });
    }
  }

  return results;
}

async function runFixture(
  fixture: Fixture,
  idx: number
): Promise<{ hardFailures: string[]; softWarnings: string[] }> {
  const hardFailures: string[] = [];
  const softWarnings: string[] = [];

  console.log(`\n[${idx + 1}/${fixtures.length}] ${fixture.label}`);
  console.log(`  address: ${fixture.input.address}`);

  let result;
  try {
    const start = Date.now();
    result = await generate(fixture.input);
    const elapsed = Date.now() - start;
    console.log(`  generate() returned in ${elapsed}ms`);
  } catch (err) {
    const msg =
      err instanceof GenerateError
        ? `${err.message} (status ${err.status})`
        : err instanceof Error
          ? err.message
          : String(err);
    hardFailures.push(`generate() threw: ${msg}`);
    return { hardFailures, softWarnings };
  }

  if (!Array.isArray(result.variants) || result.variants.length !== 3) {
    hardFailures.push(
      `expected 3 variants, got ${result.variants?.length ?? "non-array"}`
    );
    return { hardFailures, softWarnings };
  }

  for (let i = 0; i < result.variants.length; i++) {
    const checks = checkVariant(result.variants[i], i);
    for (const check of checks) {
      if (!check.passed) hardFailures.push(check.message);
    }
  }

  // Soft signal checks
  const allText = result.variants
    .map((v) => v.text.toLowerCase())
    .join("\n");
  for (const mention of fixture.shouldMention) {
    if (!allText.includes(mention.toLowerCase())) {
      softWarnings.push(
        `none of the variants mention "${mention}" (soft signal, not failing)`
      );
    }
  }

  if (hardFailures.length === 0) {
    console.log(`  ✓ PASS`);
  } else {
    console.log(`  ✗ FAIL`);
    for (const f of hardFailures) console.log(`    - ${f}`);
  }
  for (const w of softWarnings) console.log(`    ~ ${w}`);

  return { hardFailures, softWarnings };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ERROR: ANTHROPIC_API_KEY is not set. Add it to .env.local and re-run."
    );
    process.exit(1);
  }

  console.log(`Running ${fixtures.length} fixture(s)...`);

  let totalHardFailures = 0;
  let totalSoftWarnings = 0;
  const failedLabels: string[] = [];

  for (let i = 0; i < fixtures.length; i++) {
    const { hardFailures, softWarnings } = await runFixture(fixtures[i], i);
    totalHardFailures += hardFailures.length;
    totalSoftWarnings += softWarnings.length;
    if (hardFailures.length > 0) failedLabels.push(fixtures[i].label);
  }

  console.log("\n" + "=".repeat(60));
  console.log(
    `Summary: ${fixtures.length - failedLabels.length}/${fixtures.length} fixtures passed, ` +
      `${totalHardFailures} hard failure(s), ${totalSoftWarnings} soft warning(s)`
  );
  if (failedLabels.length > 0) {
    console.log("Failed fixtures:");
    for (const label of failedLabels) console.log(`  - ${label}`);
    process.exit(1);
  }
  console.log("All fixtures passed hard checks.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

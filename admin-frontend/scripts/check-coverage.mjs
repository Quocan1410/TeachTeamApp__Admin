import fs from "node:fs";
import path from "node:path";

const summaryPath = path.join(process.cwd(), "coverage", "coverage-summary.json");
const minLines = Number(process.env.COVERAGE_MIN_LINES || 80);
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const total = summary.total;
const lines = total.lines.pct;
const statements = total.statements.pct;
const functions = total.functions.pct;

console.log(
  `Coverage lines=${lines}% statements=${statements}% functions=${functions}% (min ${minLines}%)`
);

if (lines < minLines || statements < minLines || functions < minLines) {
  console.error("Coverage below the required threshold.");
  process.exit(1);
}

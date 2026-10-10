import fs from "node:fs";
import path from "node:path";

const summaryPath = path.join(process.cwd(), "coverage", "coverage-summary.json");
const minLines = Number(process.env.COVERAGE_MIN_LINES || 80);
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

const failures = [];

for (const [filePath, metrics] of Object.entries(summary)) {
  if (filePath === "total") continue;
  const lines = metrics.lines?.pct ?? 0;
  const statements = metrics.statements?.pct ?? 0;
  const functions = metrics.functions?.pct ?? 0;
  const shortName = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  console.log(
    `${shortName}: lines=${lines}% statements=${statements}% functions=${functions}%`
  );
  if (lines < minLines || statements < minLines || functions < minLines) {
    failures.push(shortName);
  }
}

if (failures.length > 0) {
  console.error(
    `Coverage below ${minLines}% for each of: ${failures.join(", ")}`
  );
  process.exit(1);
}

console.log(`Every covered file is at or above ${minLines}%.`);

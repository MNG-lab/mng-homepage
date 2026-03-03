import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT_DIR, "content", "p5-preflight-report.md");

const TASKS = [
  { label: "Generate SEO assets", command: "npm run generate:seo" },
  { label: "Build production bundle", command: "npm run build" },
  { label: "Validate content schema", command: "npm run validate:content" },
  { label: "External link sanity check", command: "npm run validate:content:urls" },
  { label: "Run smoke test", command: "npm run qa:smoke" },
  { label: "Validate redirect mapping", command: "npm run validate:redirects" },
  { label: "Verify published routes", command: "npm run verify:routes:published" },
  { label: "Check pages deployment status", command: "npm run check:pages:status" },
];

function runShellCommand(command, cwd) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("close", (code) => {
      const durationMs = Date.now() - start;
      resolve({
        command,
        code: code ?? 1,
        ok: code === 0,
        durationMs,
        stdout,
        stderr,
      });
    });
  });
}

function formatDuration(ms) {
  const sec = (ms / 1000).toFixed(1);
  return `${sec}s`;
}

function summarizeOutput(result) {
  const merged = `${result.stdout}\n${result.stderr}`.trim();
  if (!merged) return "-";
  const lines = merged.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.slice(-3).join(" / ").replace(/\|/g, "\\|");
}

function renderReport(results) {
  const now = new Date().toISOString();
  const passCount = results.filter((item) => item.ok).length;
  const failCount = results.length - passCount;

  const lines = [
    "# P5 Preflight Report",
    "",
    `Generated at: ${now}`,
    "",
    "## Summary",
    "",
    `- PASS: ${passCount}`,
    `- FAIL: ${failCount}`,
    "",
    "## Task Results",
    "",
    "| Task | Command | Duration | Result | Output (tail) |",
    "| --- | --- | --- | --- | --- |",
  ];

  results.forEach((result) => {
    lines.push(
      `| ${result.label} | \`${result.command}\` | ${formatDuration(result.durationMs)} | ${result.ok ? "PASS" : "FAIL"} | ${summarizeOutput(result)} |`
    );
  });

  return lines.join("\n") + "\n";
}

async function main() {
  const results = [];

  for (const task of TASKS) {
    const result = await runShellCommand(task.command, ROOT_DIR);
    results.push({ ...task, ...result });
    console.log(`${result.ok ? "PASS" : "FAIL"} - ${task.label} (${formatDuration(result.durationMs)})`);
  }

  const report = renderReport(results);
  await fs.writeFile(REPORT_PATH, report, "utf8");
  console.log(`Report written: ${REPORT_PATH}`);

  if (results.some((item) => !item.ok)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

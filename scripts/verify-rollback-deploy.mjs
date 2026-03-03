import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

function readArgValue(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const OWNER = readArgValue("--owner", "MNG-lab");
const REPO = readArgValue("--repo", "mng-homepage");
const BRANCH = readArgValue("--branch", "main");
const WORKFLOW_FILE = readArgValue("--workflow", "deploy-pages.yml");
const EXPECTED_SHA = readArgValue("--sha");
const DEFAULT_BASE_URL = `https://${OWNER.toLowerCase()}.github.io/${REPO}`;
const BASE_URL = readArgValue("--base-url", DEFAULT_BASE_URL).replace(/\/$/, "");
const REPORT_PATH = readArgValue("--report-path", path.join(ROOT_DIR, "content", "p5-rollback-verification-report.md"));

if (!EXPECTED_SHA) {
  console.error("Missing required argument: --sha <commit-sha>");
  process.exit(1);
}

const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}`;
const checks = [];

function addCheck(name, ok, detail) {
  checks.push({ name, ok, detail });
}

function matchesSha(actualSha, expectedSha) {
  const actual = String(actualSha || "").toLowerCase();
  const expected = String(expectedSha || "").toLowerCase();
  return actual.startsWith(expected) || expected.startsWith(actual);
}

async function ghFetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "dglab-rollback-verifier/1.0",
      "x-github-api-version": "2022-11-28",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${url}`);
  }
  return response.json();
}

async function checkSite(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "user-agent": "dglab-rollback-verifier/1.0",
      },
    });
    const body = await response.text();
    const hasRoot = body.includes('id="root"');
    return { ok: response.ok && hasRoot, status: response.status, hasRoot };
  } catch (error) {
    return { ok: false, status: "ERR", hasRoot: false, error: error.message };
  }
}

function renderReport({ latestRun, targetRun, recentRuns, siteStatus }) {
  const now = new Date().toISOString();
  const pass = checks.filter((item) => item.ok).length;
  const fail = checks.length - pass;

  const lines = [
    "# P5 Rollback Deployment Verification Report",
    "",
    `Generated at: ${now}`,
    `Repository: ${OWNER}/${REPO}`,
    `Branch: ${BRANCH}`,
    `Workflow file: ${WORKFLOW_FILE}`,
    `Expected SHA: ${EXPECTED_SHA}`,
    "",
    "## Summary",
    "",
    `- PASS checks: ${pass}`,
    `- FAIL checks: ${fail}`,
    "",
    "## Checks",
    "",
    "| Check | Result | Detail |",
    "| --- | --- | --- |",
  ];

  checks.forEach((item) => {
    lines.push(`| ${item.name} | ${item.ok ? "PASS" : "FAIL"} | ${item.detail} |`);
  });

  lines.push("", "## Latest Deploy Run", "");
  if (latestRun) {
    lines.push(`- Run number: ${latestRun.run_number}`);
    lines.push(`- Conclusion: ${latestRun.conclusion}`);
    lines.push(`- Head SHA: ${latestRun.head_sha}`);
    lines.push(`- Run URL: ${latestRun.html_url}`);
  } else {
    lines.push("- Not found");
  }

  lines.push("", "## Matched Run", "");
  if (targetRun) {
    lines.push(`- Run number: ${targetRun.run_number}`);
    lines.push(`- Conclusion: ${targetRun.conclusion}`);
    lines.push(`- Head SHA: ${targetRun.head_sha}`);
    lines.push(`- Run URL: ${targetRun.html_url}`);
  } else {
    lines.push("- No run matched expected SHA");
  }

  lines.push("", "## Published URL Check", "");
  lines.push(`- URL: ${BASE_URL}/`);
  lines.push(`- Status: ${siteStatus.status}`);
  lines.push(`- Root element: ${siteStatus.hasRoot ? "yes" : "no"}`);

  lines.push("", "## Recent Deploy Runs", "", "| Run | Conclusion | Head SHA | Updated | URL |", "| --- | --- | --- | --- | --- |");
  recentRuns.forEach((run) => {
    lines.push(`| #${run.run_number} | ${run.conclusion} | ${run.head_sha} | ${run.updated_at} | ${run.html_url} |`);
  });

  return lines.join("\n") + "\n";
}

async function main() {
  const runsJson = await ghFetchJson(`${API_BASE}/actions/workflows/${WORKFLOW_FILE}/runs?branch=${BRANCH}&per_page=20`);
  const runs = Array.isArray(runsJson.workflow_runs) ? runsJson.workflow_runs : [];
  const latestRun = runs[0] ?? null;
  const targetRun = runs.find((run) => matchesSha(run.head_sha, EXPECTED_SHA)) ?? null;
  const siteStatus = await checkSite(`${BASE_URL}/`);

  addCheck("Target SHA deployment run exists", Boolean(targetRun), targetRun ? `run #${targetRun.run_number}` : "No matching run found");
  if (targetRun) {
    addCheck(
      "Target SHA deployment run is successful",
      targetRun.conclusion === "success",
      `run #${targetRun.run_number}, conclusion=${targetRun.conclusion}`
    );
    addCheck(
      "Target SHA is latest deploy run",
      Boolean(latestRun) && latestRun.id === targetRun.id,
      latestRun ? `latest run is #${latestRun.run_number}` : "Latest run not found"
    );
  }

  addCheck("Published URL is reachable", siteStatus.ok, `status=${siteStatus.status}, root=${siteStatus.hasRoot ? "yes" : "no"}`);

  const report = renderReport({
    latestRun,
    targetRun,
    recentRuns: runs.slice(0, 5),
    siteStatus,
  });
  await fs.writeFile(REPORT_PATH, report, "utf8");

  const fail = checks.filter((item) => !item.ok);
  console.log("Rollback deployment verification summary");
  console.log(`- expected sha: ${EXPECTED_SHA}`);
  console.log(`- pass: ${checks.length - fail.length}`);
  console.log(`- fail: ${fail.length}`);
  console.log(`Report written: ${REPORT_PATH}`);
  if (fail.length > 0) {
    fail.forEach((item) => console.log(`- FAIL ${item.name}: ${item.detail}`));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

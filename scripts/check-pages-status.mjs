import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

function readArgValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const OWNER = readArgValue("--owner", "MNG-lab");
const REPO = readArgValue("--repo", "mng-homepage");
const BRANCH = readArgValue("--branch", "main");
const WORKFLOW_FILE = readArgValue("--workflow", "deploy-pages.yml");
const DEFAULT_BASE_URL = `https://${OWNER.toLowerCase()}.github.io/${REPO}`;
const BASE_URL = readArgValue("--base-url", DEFAULT_BASE_URL).replace(/\/$/, "");
const REPORT_PATH = readArgValue("--report-path", path.join(ROOT_DIR, "content", "p5-deployment-status-report.md"));
const WRITE_REPORT = !hasFlag("--no-write-report");
const STRICT = hasFlag("--strict");

const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}`;

const state = {
  checks: [],
  latestRun: null,
  latestSuccessRun: null,
  rollbackTargetRun: null,
  mainHead: null,
  siteCheck: null,
};

function addCheck(name, ok, detail) {
  state.checks.push({ name, ok, detail });
}

async function ghFetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "dglab-pages-status-checker/1.0",
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
        "user-agent": "dglab-pages-status-checker/1.0",
      },
    });
    const body = await response.text();
    const hasRoot = body.includes('id="root"');
    return {
      ok: response.ok && hasRoot,
      status: response.status,
      hasRoot,
      finalUrl: response.url,
    };
  } catch (error) {
    return {
      ok: false,
      status: "ERR",
      hasRoot: false,
      finalUrl: url,
      error: error.message,
    };
  }
}

function renderConsoleSummary() {
  const pass = state.checks.filter((check) => check.ok).length;
  const fail = state.checks.length - pass;

  console.log("Pages deployment status summary");
  console.log(`- repository: ${OWNER}/${REPO}`);
  console.log(`- branch: ${BRANCH}`);
  console.log(`- pass: ${pass}`);
  console.log(`- fail: ${fail}`);

  if (fail > 0) {
    console.log("\nFailed checks");
    state.checks.filter((check) => !check.ok).forEach((check) => {
      console.log(`- ${check.name}: ${check.detail}`);
    });
  }
}

function renderMarkdownReport() {
  const now = new Date().toISOString();
  const pass = state.checks.filter((check) => check.ok).length;
  const fail = state.checks.length - pass;

  const lines = [
    "# P5 Deployment Status Report",
    "",
    `Generated at: ${now}`,
    `Repository: ${OWNER}/${REPO}`,
    `Branch: ${BRANCH}`,
    `Workflow file: ${WORKFLOW_FILE}`,
    `Published URL: ${BASE_URL}/`,
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

  state.checks.forEach((check) => {
    lines.push(`| ${check.name} | ${check.ok ? "PASS" : "FAIL"} | ${check.detail} |`);
  });

  lines.push("", "## Latest Deploy Run", "");
  if (state.latestRun) {
    lines.push(`- Run number: ${state.latestRun.run_number}`);
    lines.push(`- Status: ${state.latestRun.status}`);
    lines.push(`- Conclusion: ${state.latestRun.conclusion}`);
    lines.push(`- Head SHA: ${state.latestRun.head_sha}`);
    lines.push(`- Updated at: ${state.latestRun.updated_at}`);
    lines.push(`- Run URL: ${state.latestRun.html_url}`);
  } else {
    lines.push("- Not found");
  }

  lines.push("", "## Rollback Target", "");
  if (state.rollbackTargetRun) {
    lines.push(`- Recommended rollback SHA: ${state.rollbackTargetRun.head_sha}`);
    lines.push(`- Source run: #${state.rollbackTargetRun.run_number} (${state.rollbackTargetRun.conclusion})`);
    lines.push(`- Run URL: ${state.rollbackTargetRun.html_url}`);
    lines.push("");
    lines.push("### Rollback Commands");
    lines.push("");
    lines.push("```bash");
    lines.push(`git checkout main`);
    lines.push(`git pull origin main`);
    lines.push(`git revert --no-edit ${state.rollbackTargetRun.head_sha}..HEAD`);
    lines.push("git push origin main");
    lines.push("```");
    lines.push("");
    lines.push("- Note: After push, verify the new `Deploy to GitHub Pages` run from Actions history.");
  } else {
    lines.push("- Not available (no previous successful deploy run found).");
  }

  return lines.join("\n") + "\n";
}

async function main() {
  const [runsJson, mainCommit] = await Promise.all([
    ghFetchJson(`${API_BASE}/actions/workflows/${WORKFLOW_FILE}/runs?branch=${BRANCH}&per_page=20`),
    ghFetchJson(`${API_BASE}/commits/${BRANCH}`),
  ]);

  const runs = Array.isArray(runsJson.workflow_runs) ? runsJson.workflow_runs : [];
  state.mainHead = { sha: mainCommit.sha, url: mainCommit.html_url };

  state.latestRun = runs[0] ?? null;
  state.latestSuccessRun = runs.find((run) => run.conclusion === "success") ?? null;
  if (state.latestSuccessRun) {
    state.rollbackTargetRun =
      runs.find((run) => run.conclusion === "success" && run.head_sha !== state.latestSuccessRun.head_sha) ?? null;
  }

  if (!state.latestRun) {
    addCheck("Latest deploy workflow run exists", false, "No workflow runs found.");
  } else {
    addCheck(
      "Latest deploy workflow run is green",
      state.latestRun.conclusion === "success",
      `run #${state.latestRun.run_number}, conclusion=${state.latestRun.conclusion}`
    );
    addCheck(
      "Latest deploy run matches main HEAD",
      state.latestRun.head_sha === state.mainHead.sha,
      `run sha=${state.latestRun.head_sha}, main sha=${state.mainHead.sha}`
    );
  }

  state.siteCheck = await checkSite(`${BASE_URL}/`);
  addCheck(
    "Published URL is reachable",
    state.siteCheck.ok,
    `status=${state.siteCheck.status}, root=${state.siteCheck.hasRoot ? "yes" : "no"}`
  );

  addCheck(
    "Rollback target SHA is documented",
    Boolean(state.rollbackTargetRun?.head_sha),
    state.rollbackTargetRun ? state.rollbackTargetRun.head_sha : "No previous successful run found."
  );

  renderConsoleSummary();

  if (WRITE_REPORT) {
    const report = renderMarkdownReport();
    await fs.writeFile(REPORT_PATH, report, "utf8");
    console.log(`\nReport written: ${REPORT_PATH}`);
  }

  if (STRICT && state.checks.some((check) => !check.ok)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

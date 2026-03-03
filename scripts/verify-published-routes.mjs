import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const DEFAULT_BASE_URL = "https://mng-lab.github.io/mng-homepage";
const DEFAULT_REPORT_PATH = path.join(ROOT_DIR, "content", "p5-route-verification-report.md");

const CANONICAL_ROUTES = ["/", "/research", "/professor", "/members", "/publications", "/gallery", "/contact", "/join-us"];
const LEGACY_ENTRY_ROUTES = [
  "/publications/publications",
  "/aitem-1",
  "/research-1",
  "/research-2",
  "/research-3",
  "/2023-1",
  "/2024",
  "/%EC%99%80%EA%B8%80%EC%99%80%EA%B8%80",
  "/와글와글",
  "/news",
];

function readArgValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const BASE_URL = readArgValue("--base-url", DEFAULT_BASE_URL).replace(/\/$/, "");
const REPORT_PATH = readArgValue("--report-path", DEFAULT_REPORT_PATH);
const ALLOW_FALLBACK_404 = !hasFlag("--disallow-fallback-404");
const STRICT = hasFlag("--strict");
const WRITE_REPORT = hasFlag("--write-report");

function classifyCanonical(responseStatus, hasRoot) {
  if (responseStatus === 200 && hasRoot) {
    return { ok: true, mode: "DIRECT_200", reason: "Direct route response is 200 with root element." };
  }

  if (ALLOW_FALLBACK_404 && responseStatus === 404 && hasRoot) {
    return {
      ok: true,
      mode: "FALLBACK_404",
      reason: "GitHub Pages fallback returned SPA HTML with 404 status.",
    };
  }

  return {
    ok: false,
    mode: "FAIL",
    reason: hasRoot ? `Unexpected HTTP status ${responseStatus}.` : "SPA root element not found in response body.",
  };
}

function classifyLegacyEntry(responseStatus, hasRoot) {
  if (!hasRoot) {
    return { ok: false, mode: "FAIL", reason: "SPA root element not found in response body." };
  }

  if (responseStatus === 200) {
    return { ok: true, mode: "LEGACY_ENTRY_200", reason: "Legacy path is reachable and serves SPA HTML." };
  }

  if (ALLOW_FALLBACK_404 && responseStatus === 404) {
    return {
      ok: true,
      mode: "LEGACY_ENTRY_FALLBACK_404",
      reason: "Legacy path reaches SPA entry via GitHub Pages 404 fallback.",
    };
  }

  return {
    ok: false,
    mode: "FAIL",
    reason: `Unexpected HTTP status ${responseStatus} for legacy entry route.`,
  };
}

async function checkRoute(route, group) {
  const url = `${BASE_URL}${route}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": "dglab-pages-route-checker/1.0",
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });
    const html = await response.text();
    const hasRoot = html.includes('id="root"');
    const decision = group === "canonical" ? classifyCanonical(response.status, hasRoot) : classifyLegacyEntry(response.status, hasRoot);

    return {
      route,
      group,
      url,
      status: response.status,
      hasRoot,
      ok: decision.ok,
      mode: decision.mode,
      reason: decision.reason,
    };
  } catch (error) {
    return {
      route,
      group,
      url,
      status: "ERR",
      hasRoot: false,
      ok: false,
      mode: "FAIL",
      reason: error.message,
    };
  }
}

function renderConsoleSummary(results) {
  const passCount = results.filter((item) => item.ok).length;
  const failCount = results.length - passCount;
  const fallbackCount = results.filter((item) => item.mode === "FALLBACK_404").length;
  const legacyPass = results.filter((item) => item.group === "legacy-entry" && item.ok).length;
  const legacyTotal = results.filter((item) => item.group === "legacy-entry").length;

  console.log("Published route verification summary");
  console.log(`- base URL: ${BASE_URL}`);
  console.log(`- pass: ${passCount}`);
  console.log(`- fail: ${failCount}`);
  console.log(`- fallback(404): ${fallbackCount}`);
  console.log(`- legacy entry routes: ${legacyPass}/${legacyTotal} passed`);

  if (failCount) {
    console.log("\nFailures");
    results
      .filter((item) => !item.ok)
      .forEach((item) => console.log(`- ${item.route}: ${item.reason}`));
  }
}

function renderMarkdown(results) {
  const now = new Date().toISOString();
  const passCount = results.filter((item) => item.ok).length;
  const failCount = results.length - passCount;
  const fallbackCount = results.filter((item) => item.mode === "FALLBACK_404").length;
  const canonicalCount = results.filter((item) => item.group === "canonical").length;
  const legacyCount = results.filter((item) => item.group === "legacy-entry").length;
  const legacyPass = results.filter((item) => item.group === "legacy-entry" && item.ok).length;

  const lines = [
    "# P5 Published Route Verification Report",
    "",
    `Generated at: ${now}`,
    `Base URL: ${BASE_URL}`,
    `Allow fallback 404: ${ALLOW_FALLBACK_404 ? "yes" : "no"}`,
    "",
    "## Summary",
    "",
    `- PASS: ${passCount}`,
    `- FAIL: ${failCount}`,
    `- Fallback 404 routes: ${fallbackCount}`,
    `- Canonical routes checked: ${canonicalCount}`,
    `- Legacy entry routes checked: ${legacyPass}/${legacyCount}`,
    "",
    "## Route Status",
    "",
    "| Group | Route | HTTP | Root | Mode | Result | Reason |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];

  results.forEach((item) => {
    lines.push(
      `| ${item.group} | ${item.route} | ${item.status} | ${item.hasRoot ? "yes" : "no"} | ${item.mode} | ${item.ok ? "PASS" : "FAIL"} | ${item.reason} |`
    );
  });

  return lines.join("\n") + "\n";
}

async function main() {
  const results = [];
  for (const route of CANONICAL_ROUTES) {
    results.push(await checkRoute(route, "canonical"));
  }
  for (const route of LEGACY_ENTRY_ROUTES) {
    results.push(await checkRoute(route, "legacy-entry"));
  }

  renderConsoleSummary(results);

  if (WRITE_REPORT) {
    const report = renderMarkdown(results);
    await fs.writeFile(REPORT_PATH, report, "utf8");
    console.log(`\nReport written: ${REPORT_PATH}`);
  }

  if (STRICT && results.some((item) => !item.ok)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

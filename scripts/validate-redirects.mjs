import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const ROUTES_MAP_PATH = path.join(ROOT_DIR, "routes-map.md");
const DEFAULT_REPORT_PATH = path.join(ROOT_DIR, "content", "redirect-validation-report.md");

function readArgValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const BASE_URL = readArgValue("--base-url", "https://dglab.yonsei.ac.kr");
const REPORT_PATH = readArgValue("--report-path", DEFAULT_REPORT_PATH);
const MAX_HOPS = Number(readArgValue("--max-hops", "8"));
const WRITE_REPORT = hasFlag("--write-report");
const STRICT = hasFlag("--strict");

const result = {
  baseUrl: BASE_URL,
  passed: [],
  warned: [],
  failed: [],
  skipped: [],
};

function isRedirectStatus(status) {
  return [301, 302, 303, 307, 308].includes(status);
}

function normalizePathname(pathname) {
  const lower = pathname.toLowerCase();
  if (lower.length > 1 && lower.endsWith("/")) {
    return lower.slice(0, -1);
  }
  return lower;
}

function extractPathToken(value) {
  if (!value) return null;
  const codeMatch = value.match(/`([^`]+)`/);
  if (codeMatch?.[1]) {
    return codeMatch[1].trim();
  }
  const pathMatch = value.match(/(\/[^\s|)]*)/);
  return pathMatch?.[1]?.trim() ?? null;
}

function parseMappingRows(markdown) {
  const sectionMatch = markdown.match(/## 2\) Legacy -> New Mapping([\s\S]*?)## 3\)/);
  if (!sectionMatch) {
    throw new Error("Could not find 'Legacy -> New Mapping' section in routes-map.md");
  }

  const lines = sectionMatch[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  const mappings = [];
  lines.forEach((line) => {
    if (line.includes("---")) return;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 4) return;

    const [legacyRaw, nextRaw, policy, priority] = cells;
    if (/^legacy url$/i.test(legacyRaw) || /^new url$/i.test(nextRaw)) {
      return;
    }
    const legacyPath = extractPathToken(legacyRaw);
    const nextPath = extractPathToken(nextRaw);
    const ambiguous = /\(if exists\)/i.test(legacyRaw) || /\bor\b/i.test(nextRaw);

    mappings.push({
      legacyRaw,
      nextRaw,
      policy,
      priority,
      legacyPath,
      nextPath,
      ambiguous,
    });
  });

  return mappings;
}

async function fetchHop(url) {
  return fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: {
      "user-agent": "dglab-redirect-validator/1.0",
      accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
  });
}

async function resolveRedirectChain(initialUrl, maxHops) {
  const chain = [];
  let currentUrl = initialUrl;

  for (let hop = 0; hop < maxHops; hop += 1) {
    const response = await fetchHop(currentUrl);
    const location = response.headers.get("location");
    chain.push({
      hop: hop + 1,
      url: currentUrl,
      status: response.status,
      location,
    });

    if (!isRedirectStatus(response.status) || !location) {
      return { chain, truncated: false, finalUrl: currentUrl };
    }

    currentUrl = new URL(location, currentUrl).href;
  }

  return { chain, truncated: true, finalUrl: currentUrl };
}

function classifyMapping(mapping, resolved) {
  const first = resolved.chain[0];
  const last = resolved.chain[resolved.chain.length - 1];
  const hadRedirect = resolved.chain.some((hop) => isRedirectStatus(hop.status) && hop.location);
  const finalPath = normalizePathname(new URL(resolved.finalUrl).pathname);
  const finalStatus = Number(last?.status ?? 0);
  const expectedPath = normalizePathname(mapping.nextPath);
  const policyLower = mapping.policy.toLowerCase();

  if (mapping.ambiguous || !mapping.legacyPath || !mapping.nextPath) {
    return { level: "SKIP", reason: "Ambiguous mapping row; requires manual decision." };
  }

  if (resolved.truncated) {
    return { level: "FAIL", reason: `Redirect chain exceeded max hops (${MAX_HOPS}).` };
  }

  if (policyLower.includes("301 redirect")) {
    if (!hadRedirect) {
      return { level: "FAIL", reason: "Expected redirect but response did not redirect." };
    }
    if (finalPath !== expectedPath) {
      return { level: "FAIL", reason: `Redirect landed on ${finalPath}, expected ${expectedPath}.` };
    }
    if (finalStatus >= 400) {
      return { level: "FAIL", reason: `Redirect landed on ${expectedPath} but final status is ${finalStatus}.` };
    }
    if (![301, 308].includes(first.status)) {
      return { level: "WARN", reason: `Redirect works but first hop status is ${first.status}, not permanent.` };
    }
    return { level: "PASS", reason: "Redirect target and status are valid." };
  }

  if (policyLower.includes("keep")) {
    if (finalStatus >= 400) {
      return { level: "FAIL", reason: `Canonical route returns ${finalStatus}.` };
    }
    if (finalPath !== expectedPath) {
      return { level: "FAIL", reason: `Final path ${finalPath} does not match canonical ${expectedPath}.` };
    }
    if (hadRedirect) {
      return { level: "WARN", reason: "Route reachable but returns redirect before final page." };
    }
    return { level: "PASS", reason: "Canonical route is directly reachable." };
  }

  if (finalPath === expectedPath) {
    return { level: "PASS", reason: "Final path matches mapped path." };
  }
  return { level: "WARN", reason: "Unrecognized policy; final path mismatch requires review." };
}

function pushResult(level, item) {
  if (level === "PASS") result.passed.push(item);
  else if (level === "WARN") result.warned.push(item);
  else if (level === "FAIL") result.failed.push(item);
  else result.skipped.push(item);
}

function summarizeChain(chain) {
  return chain.map((hop) => `${hop.status} ${new URL(hop.url).pathname}`).join(" -> ");
}

function renderConsoleSummary() {
  console.log("Redirect validation summary");
  console.log(`- base URL: ${result.baseUrl}`);
  console.log(`- pass: ${result.passed.length}`);
  console.log(`- warn: ${result.warned.length}`);
  console.log(`- fail: ${result.failed.length}`);
  console.log(`- skip: ${result.skipped.length}`);

  if (result.failed.length) {
    console.log("\nFailures");
    result.failed.forEach((item) => {
      console.log(`- ${item.legacyPath} -> ${item.nextPath}: ${item.reason}`);
    });
  }
}

function renderMarkdownReport() {
  const now = new Date().toISOString();
  const lines = [
    "# Redirect Validation Report",
    "",
    `Generated at: ${now}`,
    `Base URL: ${result.baseUrl}`,
    `Routes map: ${ROUTES_MAP_PATH}`,
    "",
    "## Summary",
    "",
    `- PASS: ${result.passed.length}`,
    `- WARN: ${result.warned.length}`,
    `- FAIL: ${result.failed.length}`,
    `- SKIP: ${result.skipped.length}`,
    "",
    "## Results",
    "",
    "| Legacy | Expected | Policy | Result | Reason | Chain |",
    "| --- | --- | --- | --- | --- | --- |",
  ];

  const ordered = [
    ...result.failed.map((item) => ({ ...item, level: "FAIL" })),
    ...result.warned.map((item) => ({ ...item, level: "WARN" })),
    ...result.passed.map((item) => ({ ...item, level: "PASS" })),
    ...result.skipped.map((item) => ({ ...item, level: "SKIP" })),
  ];

  ordered.forEach((item) => {
    lines.push(
      `| ${item.legacyPath ?? item.legacyRaw} | ${item.nextPath ?? item.nextRaw} | ${item.policy} | ${item.level} | ${item.reason} | ${item.chainSummary ?? "-"} |`
    );
  });

  return lines.join("\n") + "\n";
}

async function main() {
  const markdown = await fs.readFile(ROUTES_MAP_PATH, "utf8");
  const mappings = parseMappingRows(markdown);

  for (const mapping of mappings) {
    if (mapping.ambiguous || !mapping.legacyPath || !mapping.nextPath) {
      pushResult("SKIP", {
        ...mapping,
        reason: "Ambiguous mapping row; requires manual decision.",
      });
      continue;
    }

    const sourceUrl = new URL(mapping.legacyPath, BASE_URL).href;
    try {
      const resolved = await resolveRedirectChain(sourceUrl, MAX_HOPS);
      const decision = classifyMapping(mapping, resolved);
      pushResult(decision.level, {
        ...mapping,
        reason: decision.reason,
        chainSummary: summarizeChain(resolved.chain),
      });
    } catch (error) {
      pushResult("FAIL", {
        ...mapping,
        reason: `Request error: ${error.message}`,
      });
    }
  }

  renderConsoleSummary();

  if (WRITE_REPORT) {
    const report = renderMarkdownReport();
    await fs.writeFile(REPORT_PATH, report, "utf8");
    console.log(`\nReport written: ${REPORT_PATH}`);
  }

  if (STRICT && result.failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

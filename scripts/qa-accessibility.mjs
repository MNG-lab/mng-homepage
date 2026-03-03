import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import axe from "axe-core";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT_DIR, "content", "qa-accessibility-report.md");
const HOST = "127.0.0.1";
const PORT = 4178;
const BASE_URL = `http://${HOST}:${PORT}`;
const ROUTES = ["/", "/research", "/professor", "/members", "/publications", "/gallery", "/contact", "/join-us"];

const AXE_RULES = ["heading-order", "image-alt", "color-contrast"];

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "pipe", ...options });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} ${args.join(" ")} failed (${code})\n${stderr || stdout}`));
    });
  });
}

async function waitForServerReady(child, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("vite preview server did not become ready within timeout"));
    }, timeoutMs);

    function onData(chunk) {
      const text = String(chunk);
      if (text.includes("Local:") || text.includes("http://")) {
        clearTimeout(timeout);
        cleanup();
        resolve();
      }
    }

    function onExit(code) {
      clearTimeout(timeout);
      cleanup();
      reject(new Error(`vite preview exited before ready (code ${code})`));
    }

    function cleanup() {
      child.stdout.off("data", onData);
      child.stderr.off("data", onData);
      child.off("exit", onExit);
    }

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", onExit);
  });
}

async function runAxeForRoute(page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate((ruleIds) => {
    return window.axe.run(document, {
      runOnly: {
        type: "rule",
        values: ruleIds,
      },
    });
  }, AXE_RULES);
}

async function runManualChecks(page) {
  return page.evaluate(() => {
    const issues = [];

    // Heading level jump check (e.g., h2 -> h4)
    const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"));
    let previous = 0;
    for (const heading of headings) {
      const level = Number(heading.tagName[1]);
      if (previous !== 0 && level - previous > 1) {
        const text = (heading.textContent || "").trim().slice(0, 80);
        issues.push(`Heading jump ${`h${previous}`} -> ${`h${level}`} (${text || "no text"})`);
      }
      previous = level;
    }

    // Non-decorative images should include meaningful alt.
    const images = Array.from(document.querySelectorAll("img"));
    for (const img of images) {
      const isDecorative = img.getAttribute("role") === "presentation" || img.getAttribute("aria-hidden") === "true";
      const alt = img.getAttribute("alt");
      if (!isDecorative && (alt === null || alt.trim() === "")) {
        const src = img.getAttribute("src") || "unknown-src";
        issues.push(`Missing alt text: ${src}`);
      }
    }

    return issues;
  });
}

function pickViolationCount(violations, ruleId) {
  return violations.find((item) => item.id === ruleId)?.nodes?.length ?? 0;
}

function classifyResult(headingCount, imageAltCount, contrastCount, manualCount) {
  if (headingCount > 0 || imageAltCount > 0 || manualCount > 0) return "FAIL";
  if (contrastCount > 0) return "WARN";
  return "PASS";
}

function renderReport(results) {
  const now = new Date().toISOString().slice(0, 10);
  const pass = results.filter((item) => item.result === "PASS").length;
  const warn = results.filter((item) => item.result === "WARN").length;
  const fail = results.filter((item) => item.result === "FAIL").length;

  const lines = [
    "# P4 Accessibility QA Report",
    "",
    `Date: ${now}`,
    `Base URL: ${BASE_URL}`,
    "",
    "## Scope",
    "",
    "- Rules: `heading-order`, `image-alt`, `color-contrast`",
    "- Browser: Chromium (desktop)",
    "- Note: `color-contrast` is tracked as warning in this baseline; heading/alt/manual structural issues are fail.",
    "",
    "## Summary",
    "",
    `- PASS: ${pass}`,
    `- WARN: ${warn}`,
    `- FAIL: ${fail}`,
    "",
    "## Route Matrix",
    "",
    "| Route | heading-order | image-alt | color-contrast | manual-check | Result |",
    "| --- | --- | --- | --- | --- | --- |",
  ];

  results.forEach((item) => {
    lines.push(
      `| ${item.route} | ${item.headingCount} | ${item.imageAltCount} | ${item.contrastCount} | ${item.manualCount} | ${item.result} |`
    );
  });

  const issueRoutes = results.filter((item) => item.result !== "PASS");
  if (issueRoutes.length > 0) {
    lines.push("", "## Details", "");
    issueRoutes.forEach((item) => {
      lines.push(`### ${item.route} (${item.result})`, "");
      item.violations.forEach((violation) => {
        const nodeCount = violation.nodes?.length ?? 0;
        lines.push(`- [${violation.id}] ${violation.help} (impact=${violation.impact ?? "n/a"}, nodes=${nodeCount})`);
        const sampleNodes = (violation.nodes ?? []).slice(0, 3);
        sampleNodes.forEach((node) => {
          const target = Array.isArray(node.target) ? node.target.join(" > ") : String(node.target ?? "");
          lines.push(`  - target: \`${target}\``);
        });
      });
      item.manualIssues.forEach((issue) => {
        lines.push(`- [manual] ${issue}`);
      });
      lines.push("");
    });
  }

  return lines.join("\n") + "\n";
}

async function runAccessibilityAudit(baseUrl) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const results = [];

  try {
    for (const route of ROUTES) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForSelector("#root", { timeout: 15000 });
      await page.waitForTimeout(200);

      const axeResult = await runAxeForRoute(page);
      const manualIssues = await runManualChecks(page);

      const headingCount = pickViolationCount(axeResult.violations, "heading-order");
      const imageAltCount = pickViolationCount(axeResult.violations, "image-alt");
      const contrastCount = pickViolationCount(axeResult.violations, "color-contrast");
      const manualCount = manualIssues.length;
      const result = classifyResult(headingCount, imageAltCount, contrastCount, manualCount);

      results.push({
        route,
        headingCount,
        imageAltCount,
        contrastCount,
        manualCount,
        result,
        violations: axeResult.violations,
        manualIssues,
      });
    }
  } finally {
    await context.close();
    await browser.close();
  }

  return results;
}

async function main() {
  const npm = npmCommand();
  await runCommand(npm, ["run", "build"], { cwd: ROOT_DIR });

  const preview = spawn(npm, ["run", "preview", "--", "--host", HOST, "--port", String(PORT), "--strictPort"], {
    cwd: ROOT_DIR,
    stdio: "pipe",
  });

  try {
    await waitForServerReady(preview);
    const results = await runAccessibilityAudit(BASE_URL);
    const report = renderReport(results);
    await fs.writeFile(REPORT_PATH, report, "utf8");

    const failCount = results.filter((item) => item.result === "FAIL").length;
    const warnCount = results.filter((item) => item.result === "WARN").length;
    console.log(`Accessibility audit complete: PASS=${results.length - failCount - warnCount}, WARN=${warnCount}, FAIL=${failCount}`);
    console.log(`Report written: ${REPORT_PATH}`);

    if (failCount > 0) {
      process.exitCode = 1;
    }
  } finally {
    preview.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

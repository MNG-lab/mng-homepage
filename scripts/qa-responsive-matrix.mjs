import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT_DIR, "content", "qa-responsive-matrix-report.md");
const SCREENSHOT_DIR = path.join(ROOT_DIR, "content", "qa-screenshots");
const HOST = "127.0.0.1";
const PORT = 4176;
const BASE_URL = `http://${HOST}:${PORT}`;

const ROUTES = ["/", "/research", "/professor", "/members", "/publications", "/gallery", "/contact", "/join-us"];

const VIEWPORTS = [
  {
    id: "mobile",
    label: "Mobile (390x844)",
    context: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  },
  {
    id: "tablet",
    label: "Tablet (768x1024)",
    context: { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  },
  {
    id: "desktop",
    label: "Desktop (1440x900)",
    context: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  },
];

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function routeSlug(route) {
  if (route === "/") return "home";
  return route.replace(/^\//, "").replaceAll("/", "-");
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

function renderReport(results) {
  const now = new Date().toISOString().slice(0, 10);
  const passed = results.filter((item) => item.ok).length;
  const lines = [
    "# P4 Responsive QA Matrix Report",
    "",
    `Date: ${now}`,
    `Base URL: ${BASE_URL}`,
    `Screenshot Directory: ${SCREENSHOT_DIR}`,
    "",
    "## Summary",
    "",
    `- Passed: ${passed}/${results.length}`,
    "",
    "## Matrix",
    "",
    "| Viewport | Route | Result | Screenshot |",
    "| --- | --- | --- | --- |",
  ];

  for (const result of results) {
    const shot = result.ok ? `[view](${result.relScreenshotPath})` : "-";
    lines.push(`| ${result.viewportLabel} | ${result.route} | ${result.ok ? "PASS" : "FAIL"} | ${shot} |`);
  }

  const failures = results.filter((item) => !item.ok);
  if (failures.length > 0) {
    lines.push("", "## Failures", "");
    failures.forEach((item) => {
      lines.push(`- ${item.viewportLabel} ${item.route}: ${item.error}`);
    });
  }

  return lines.join("\n") + "\n";
}

async function captureMatrix(baseUrl) {
  await fs.rm(SCREENSHOT_DIR, { recursive: true, force: true });
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const viewport of VIEWPORTS) {
      const folder = path.join(SCREENSHOT_DIR, viewport.id);
      await fs.mkdir(folder, { recursive: true });

      const context = await browser.newContext(viewport.context);
      const page = await context.newPage();

      for (const route of ROUTES) {
        const screenshotName = `${routeSlug(route)}.png`;
        const screenshotPath = path.join(folder, screenshotName);
        const relScreenshotPath = path.relative(path.dirname(REPORT_PATH), screenshotPath).split(path.sep).join("/");

        try {
          await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 30000 });
          await page.waitForSelector("#root", { timeout: 15000 });
          await page.waitForTimeout(250);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          results.push({ viewportLabel: viewport.label, route, ok: true, relScreenshotPath });
        } catch (error) {
          results.push({
            viewportLabel: viewport.label,
            route,
            ok: false,
            relScreenshotPath,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      await context.close();
    }
  } finally {
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
    const results = await captureMatrix(BASE_URL);
    const markdown = renderReport(results);
    await fs.writeFile(REPORT_PATH, markdown, "utf8");

    const failed = results.filter((item) => !item.ok);
    console.log(`Responsive matrix complete: ${results.length - failed.length}/${results.length} passed`);
    console.log(`Report written: ${REPORT_PATH}`);
    console.log(`Screenshots written: ${SCREENSHOT_DIR}`);

    if (failed.length > 0) {
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

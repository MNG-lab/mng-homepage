import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT_DIR, "content", "qa-cross-browser-report.md");
const HOST = "127.0.0.1";
const PORT = 4177;
const BASE_URL = `http://${HOST}:${PORT}`;
const ROUTES = ["/", "/research", "/professor", "/members", "/publications", "/gallery", "/contact", "/join-us"];
const VIEWPORT = { width: 1440, height: 900 };

const BROWSERS = [
  { id: "chromium", label: "Chromium (Chrome/Edge baseline)", launcher: chromium },
  { id: "firefox", label: "Firefox", launcher: firefox },
  { id: "webkit", label: "WebKit (Safari baseline)", launcher: webkit },
];

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

async function runMatrix(baseUrl) {
  const results = [];

  for (const browserDef of BROWSERS) {
    let browser;
    try {
      browser = await browserDef.launcher.launch({ headless: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const route of ROUTES) {
        results.push({
          browser: browserDef.label,
          route,
          ok: false,
          status: "SKIP",
          error: `Browser launch failed: ${message}`,
        });
      }
      continue;
    }

    try {
      const context = await browser.newContext({ viewport: VIEWPORT });
      const page = await context.newPage();

      for (const route of ROUTES) {
        try {
          const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 30000 });
          await page.waitForSelector("#root", { timeout: 15000 });
          const html = await page.content();
          const hasRoot = html.includes('id="root"');
          const status = response?.status() ?? "N/A";

          results.push({
            browser: browserDef.label,
            route,
            ok: Boolean(hasRoot),
            status,
          });
        } catch (error) {
          results.push({
            browser: browserDef.label,
            route,
            ok: false,
            status: "ERR",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      await context.close();
    } finally {
      await browser.close();
    }
  }

  return results;
}

function renderReport(results) {
  const now = new Date().toISOString().slice(0, 10);
  const passed = results.filter((item) => item.ok).length;
  const skipped = results.filter((item) => item.status === "SKIP").length;
  const failed = results.length - passed - skipped;

  const lines = [
    "# P4 Cross-Browser QA Report",
    "",
    `Date: ${now}`,
    `Base URL: ${BASE_URL}`,
    "",
    "## Browser Mapping",
    "",
    "- Chromium = Chrome/Edge baseline",
    "- WebKit = Safari baseline",
    "",
    "## Summary",
    "",
    `- Passed: ${passed}/${results.length}`,
    `- Failed: ${failed}`,
    `- Skipped: ${skipped}`,
    "",
    "## Matrix",
    "",
    "| Browser | Route | HTTP | Result |",
    "| --- | --- | --- | --- |",
  ];

  results.forEach((item) => {
    const result = item.ok ? "PASS" : item.status === "SKIP" ? "SKIP" : "FAIL";
    lines.push(`| ${item.browser} | ${item.route} | ${item.status} | ${result} |`);
  });

  const issues = results.filter((item) => !item.ok);
  if (issues.length) {
    lines.push("", "## Issues", "");
    issues.forEach((item) => {
      lines.push(`- ${item.browser} ${item.route}: ${item.error ?? `status=${item.status}`}`);
    });
  }

  return lines.join("\n") + "\n";
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
    const results = await runMatrix(BASE_URL);
    const report = renderReport(results);
    await fs.writeFile(REPORT_PATH, report, "utf8");

    const passed = results.filter((item) => item.ok).length;
    console.log(`Cross-browser matrix complete: ${passed}/${results.length} passed`);
    console.log(`Report written: ${REPORT_PATH}`);

    if (results.some((item) => !item.ok && item.status !== "SKIP")) {
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

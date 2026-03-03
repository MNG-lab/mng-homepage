import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT_DIR, "content", "qa-smoke-p4.md");
const HOST = "127.0.0.1";
const PORT = 4174;
const BASE_URL = `http://${HOST}:${PORT}`;
const ROUTES = ["/", "/research", "/professor", "/members", "/publications", "/gallery", "/contact", "/join-us"];

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

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function hasFlag(name) {
  return process.argv.includes(name);
}

async function ensureDistExists() {
  const distIndexPath = path.join(ROOT_DIR, "dist", "index.html");
  try {
    await fs.access(distIndexPath);
  } catch {
    throw new Error("--skip-build was provided, but dist/index.html was not found. Run npm run build first.");
  }
}

async function waitForServerReady(child, timeoutMs = 15000) {
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

async function fetchRoute(route) {
  try {
    const response = await fetch(`${BASE_URL}${route}`, { redirect: "follow" });
    const html = await response.text();
    const hasRoot = html.includes('id="root"');
    return { route, ok: response.ok && hasRoot, status: response.status, hasRoot };
  } catch (error) {
    return { route, ok: false, status: "ERR", hasRoot: false, error: error.message };
  }
}

function renderMarkdown(results) {
  const now = new Date().toISOString().slice(0, 10);
  const passed = results.filter((item) => item.ok).length;
  const lines = [
    "# P4 Route Smoke Test",
    "",
    `Date: ${now}`,
    `Base URL: ${BASE_URL}`,
    "",
    "## Summary",
    "",
    `- Passed: ${passed}/${results.length}`,
    "",
    "## Route Status",
    "",
    "| Route | HTTP | Root Element | Result |",
    "| --- | --- | --- | --- |",
  ];

  results.forEach((item) => {
    const rootText = item.hasRoot ? "yes" : "no";
    const resultText = item.ok ? "PASS" : "FAIL";
    lines.push(`| ${item.route} | ${item.status} | ${rootText} | ${resultText} |`);
  });

  return lines.join("\n") + "\n";
}

async function main() {
  const npm = npmCommand();
  const skipBuild = hasFlag("--skip-build");

  if (skipBuild) {
    await ensureDistExists();
    console.log("Skipping build step (--skip-build). Using existing dist output.");
  } else {
    console.log("Running build step before smoke test.");
    await runCommand(npm, ["run", "build"], { cwd: ROOT_DIR });
  }

  const preview = spawn(npm, ["run", "preview", "--", "--host", HOST, "--port", String(PORT), "--strictPort"], {
    cwd: ROOT_DIR,
    stdio: "pipe",
  });

  try {
    await waitForServerReady(preview);
    const results = [];
    for (const route of ROUTES) {
      results.push(await fetchRoute(route));
    }
    const markdown = renderMarkdown(results);
    await fs.writeFile(REPORT_PATH, markdown, "utf8");

    const failed = results.filter((item) => !item.ok);
    console.log(`Smoke test complete: ${results.length - failed.length}/${results.length} passed`);
    console.log(`Report written: ${REPORT_PATH}`);
    if (failed.length > 0) {
      failed.forEach((item) =>
        console.log(`- FAIL ${item.route}: ${item.status}${item.error ? ` (${item.error})` : ""}`)
      );
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

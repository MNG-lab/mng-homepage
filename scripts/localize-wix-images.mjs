import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT_DIR, "src", "content");
const OUTPUT_DIR = path.join(ROOT_DIR, "public", "media", "legacy-wix");
const URL_PATTERN = /https:\/\/static\.wixstatic\.com\/media\/[^"'\s]+/g;

function sanitizeFilename(value) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function extractBaseFilename(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const pathname = decodeURIComponent(url.pathname);
    const rawName = pathname.split("/").at(-1) || "image";
    const safeName = sanitizeFilename(rawName) || "image";
    if (/\.[a-z0-9]+$/i.test(safeName)) return safeName;
    return `${safeName}.jpg`;
  } catch {
    return "image.jpg";
  }
}

async function getContentFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getContentFiles(fullPath)));
      continue;
    }
    if (/\.(js|jsx|ts|tsx|json|md)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function collectUniqueUrls(files) {
  const map = new Map();

  for (const filePath of files) {
    const text = await fs.readFile(filePath, "utf8");
    const matches = text.match(URL_PATTERN) || [];

    for (const url of matches) {
      if (!map.has(url)) {
        const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 10);
        const baseName = extractBaseFilename(url);
        const fileName = `${hash}-${baseName}`;
        const relativePath = path.posix.join("media", "legacy-wix", fileName);
        map.set(url, {
          url,
          hash,
          fileName,
          relativePath,
          outputPath: path.join(OUTPUT_DIR, fileName),
        });
      }
    }
  }

  return map;
}

async function downloadBinary(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "mng-localize-wix-images/1.0",
      accept: "image/*,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed (${response.status}) for ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function ensureDownloads(items) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  for (const item of items) {
    try {
      await fs.access(item.outputPath);
      continue;
    } catch {
      // file does not exist
    }

    const binary = await downloadBinary(item.url);
    await fs.writeFile(item.outputPath, binary);
  }
}

function replaceAll(text, replacements) {
  let updated = text;
  for (const [oldUrl, data] of replacements) {
    updated = updated.split(oldUrl).join(data.relativePath);
  }
  return updated;
}

async function rewriteFiles(files, replacements) {
  let changedCount = 0;

  for (const filePath of files) {
    const original = await fs.readFile(filePath, "utf8");
    const updated = replaceAll(original, replacements);
    if (updated !== original) {
      await fs.writeFile(filePath, updated, "utf8");
      changedCount += 1;
    }
  }

  return changedCount;
}

async function main() {
  const files = await getContentFiles(CONTENT_DIR);
  const urlMap = await collectUniqueUrls(files);
  const items = [...urlMap.values()].sort((a, b) => a.url.localeCompare(b.url));

  if (items.length === 0) {
    console.log("No wixstatic URLs found in src/content.");
    return;
  }

  await ensureDownloads(items);
  const changedFiles = await rewriteFiles(files, urlMap);

  console.log(`Localized ${items.length} wixstatic image URL(s).`);
  console.log(`Downloaded assets into: ${path.relative(ROOT_DIR, OUTPUT_DIR)}`);
  console.log(`Updated ${changedFiles} content file(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

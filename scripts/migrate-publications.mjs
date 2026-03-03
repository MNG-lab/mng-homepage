import fs from "node:fs/promises";

const LEGACY_BASE = "https://dglab.yonsei.ac.kr/aitem-1";
const OUTPUT_FILE = new URL("../src/content/publications-data.js", import.meta.url);

function decodeHtmlEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value) {
  return decodeHtmlEntities(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").replace(/\s+\./g, ".").trim();
}

function extractWarmupJson(html) {
  const match = html.match(/<script type="application\/json" id="wix-warmup-data">([\s\S]*?)<\/script>/);
  if (!match) return null;
  return JSON.parse(match[1]);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "mng-homepage-migrator/2.0",
      accept: "text/html,application/json;q=0.9,*/*;q=0.8",
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }
  return response.text();
}

function classifyTheme(title) {
  const lower = title.toLowerCase();
  if (lower.includes("metabolic") || lower.includes("obesity") || lower.includes("steatohepatitis")) return "Metabolic Disease";
  if (lower.includes("fibrosis") || lower.includes("aging")) return "Aging & Fibrosis";
  if (lower.includes("drug-resistant") || lower.includes("indole derivative")) return "Drug Discovery";
  if (lower.includes("hearing") || lower.includes("hair bundle")) return "Sensory Biology";
  if (lower.includes("circadian") || lower.includes("period recruitment") || lower.includes("timeless")) return "Circadian Biology";
  if (lower.includes("cilia") || lower.includes("ciliary") || lower.includes("hedgehog") || lower.includes("ciliopathy")) {
    return "Cilia Biology";
  }
  if (lower.includes("dopamine") || lower.includes("parkinson")) return "Neurodegeneration";
  if (lower.includes("retinal") || lower.includes("neuronal necrosis") || lower.includes("apoptosis")) return "Neuroscience";
  return "Legacy Archive";
}

function toId(title, year, index) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 44);
  return `legacy-${year || "unknown"}-${slug || index + 1}-${index + 1}`;
}

function parseYear(input) {
  const match = String(input || "").match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

async function extractLegacyPublications() {
  const firstHtml = await fetchText(`${LEGACY_BASE}?dynamic_page=1`);
  const firstWarmup = extractWarmupJson(firstHtml);
  if (!firstWarmup) {
    throw new Error("Could not parse wix warmup data from first /aitem-1 page.");
  }

  const totalPages = firstWarmup.platform?.ssrPropsUpdates?.[1]?.["comp-m45dbdxm"]?.totalPages ?? 1;
  const records = [];

  for (let page = 1; page <= totalPages; page += 1) {
    const sourcePage = `${LEGACY_BASE}?dynamic_page=${page}`;
    const html = page === 1 ? firstHtml : await fetchText(sourcePage);
    const warmup = extractWarmupJson(html);
    if (!warmup) continue;

    const itemIds = warmup.platform?.ssrPropsUpdates?.[0]?.["comp-m45crr7u4"]?.items ?? [];
    const values = warmup.platform?.ssrPropsUpdates?.[1] ?? {};

    itemIds.forEach((id) => {
      const yearHtml = values[`comp-m45e0rgw__${id}`]?.html ?? "";
      const titleHtml = values[`comp-m45crr7x1__${id}`]?.html ?? "";
      const authorsHtml = values[`comp-m45crr7y1__${id}`]?.html ?? "";
      const readLabel = values[`comp-m45eai7u__${id}`]?.label ?? "";

      const year = parseYear(stripHtml(yearHtml)) ?? 0;
      const title = normalizeText(stripHtml(titleHtml));
      const authors = normalizeText(stripHtml(authorsHtml));
      const url = normalizeText(readLabel);

      if (!title) return;
      records.push({
        page,
        sourcePage,
        year,
        title,
        authors,
        url: /^https?:\/\//i.test(url) ? url : "",
        verified: Boolean(url),
        theme: classifyTheme(title),
      });
    });
  }

  return { totalPages, records };
}

function dedupeByTitleYear(records) {
  const deduped = [];
  const seen = new Set();
  for (const item of records) {
    const key = `${item.year}::${item.title}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function buildOutput(records, totalPages) {
  const ordered = [...records].sort((a, b) => b.year - a.year || a.page - b.page || a.title.localeCompare(b.title));
  const publicationsData = ordered.map((item, index) => ({
    id: toId(item.title, item.year, index),
    year: item.year,
    title: item.title,
    authors: item.authors,
    journal: "Legacy DGLab publication list",
    theme: item.theme,
    featured: item.year >= 2025,
    verified: item.verified,
    sourcePage: item.sourcePage,
    url: item.url || item.sourcePage,
  }));

  const verifiedItems = publicationsData.filter((item) => item.verified).length;

  const output = `export const publicationsData = ${JSON.stringify(publicationsData, null, 2)};

export const publicationThemes = ["All", ...new Set(publicationsData.map((item) => item.theme).filter(Boolean))];

export const publicationMigrationStatus = ${JSON.stringify(
    {
      verifiedItems,
      observedLegacyPagination: totalPages,
      note: "Migrated from /aitem-1 dynamic pages with title/authors/year/source-link extraction.",
    },
    null,
    2
  )};
`;

  return output;
}

async function run() {
  const { totalPages, records } = await extractLegacyPublications();
  const deduped = dedupeByTitleYear(records);
  const output = buildOutput(deduped, totalPages);
  await fs.writeFile(OUTPUT_FILE, output, "utf8");
  console.log(`Migrated ${deduped.length} publication entries from ${totalPages} /aitem-1 pages.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

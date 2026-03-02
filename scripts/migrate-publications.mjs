import fs from "node:fs/promises";

const LEGACY_BASE = "https://dglab.yonsei.ac.kr/publications/publications";
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
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "mng-homepage-migrator/1.0",
          accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        },
      });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status}) for ${url}`);
      }
      return response.text();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
  throw lastError;
}

function classifyTheme(title) {
  const lower = title.toLowerCase();
  if (lower.includes("drug-resistant") || lower.includes("indole derivative")) return "Drug Discovery";
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

async function fetchPubMedIdByTitle(title) {
  const query = encodeURIComponent(`${title}[Title]`);
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=1&tool=mng-homepage-migrator&email=admin%40dglab.yonsei.ac.kr&term=${query}`;
  const text = await fetchText(url);
  const json = JSON.parse(text);
  const id = json?.esearchresult?.idlist?.[0];
  return id || null;
}

async function fetchPubMedSummary(pubmedId) {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pubmedId}&retmode=json&tool=mng-homepage-migrator&email=admin%40dglab.yonsei.ac.kr`;
  const text = await fetchText(url);
  const json = JSON.parse(text);
  return json?.result?.[pubmedId] ?? null;
}

function extractMetaTags(html, metaName) {
  const pattern = new RegExp(`<meta\\s+name="${metaName}"\\s+content="([^"]*)"`, "gi");
  const values = [];
  let match = pattern.exec(html);
  while (match) {
    values.push(decodeHtmlEntities(match[1]));
    match = pattern.exec(html);
  }
  return values;
}

async function fetchCitationFallback(url) {
  const html = await fetchText(url);
  const citationTitle = extractMetaTags(html, "citation_title")[0] ?? "";
  const citationJournal = extractMetaTags(html, "citation_journal_title")[0] ?? "";
  const citationDate = extractMetaTags(html, "citation_publication_date")[0] ?? "";
  const citationAuthors = extractMetaTags(html, "citation_author");
  const citationPmid = extractMetaTags(html, "citation_pmid")[0] ?? "";
  return {
    title: citationTitle,
    journal: citationJournal,
    date: citationDate,
    authors: citationAuthors.join(", "),
    pmid: citationPmid,
  };
}

function parseYear(input) {
  const match = String(input || "").match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

async function extractLegacyPublications() {
  const firstHtml = await fetchText(LEGACY_BASE);
  const firstWarmup = extractWarmupJson(firstHtml);
  if (!firstWarmup) {
    throw new Error("Could not parse wix warmup data from first publications page.");
  }

  const totalPages = firstWarmup.platform?.ssrPropsUpdates?.[0]?.["comp-m45bxwwh"]?.totalPages ?? 1;
  const records = [];

  for (let page = 1; page <= totalPages; page += 1) {
    const sourcePage = page === 1 ? LEGACY_BASE : `${LEGACY_BASE}?dynamic_page=${page}`;
    const html = page === 1 ? firstHtml : await fetchText(sourcePage);
    const warmup = extractWarmupJson(html);
    if (!warmup) continue;

    const props = warmup.platform?.ssrPropsUpdates?.[0] ?? {};
    const titles = [];
    const authors = [];
    const links = [];

    for (const value of Object.values(props)) {
      if (value && typeof value === "object" && typeof value.html === "string") {
        const text = normalizeText(stripHtml(value.html));
        if (!text) continue;
        if (value.html.includes("<h2")) {
          titles.push(text);
        } else if (value.html.includes("<p")) {
          authors.push(text);
        }
      }

      if (value && typeof value === "object" && value.link?.href) {
        links.push(value.link.href);
      }
    }

    const title = [...new Set(titles)][0];
    const author = [...new Set(authors)][0] ?? "";
    const url = [...new Set(links)][0] ?? "";

    if (!title || !url) continue;

    records.push({
      page,
      sourcePage,
      title,
      extractedAuthors: author,
      url,
    });
  }

  return { totalPages, records };
}

async function enrichRecords(records) {
  const enriched = [];
  for (const record of records) {
    await new Promise((resolve) => setTimeout(resolve, 120));
    const pubmedFromUrl = record.url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/)?.[1] ?? null;
    let pubmedId = pubmedFromUrl;
    let citationFallback = null;

    if (!pubmedId) {
      try {
        pubmedId = await fetchPubMedIdByTitle(record.title);
      } catch {
        pubmedId = null;
      }
    }

    if (!pubmedId) {
      try {
        citationFallback = await fetchCitationFallback(record.url);
        if (citationFallback.pmid) {
          pubmedId = citationFallback.pmid;
        }
      } catch {
        citationFallback = null;
      }
    }

    let summary = null;
    if (pubmedId) {
      try {
        summary = await fetchPubMedSummary(pubmedId);
      } catch {
        summary = null;
      }
    }

    if (!citationFallback) {
      try {
        citationFallback = await fetchCitationFallback(record.url);
      } catch {
        citationFallback = null;
      }
    }

    const title = normalizeText(record.title || citationFallback?.title || "Untitled publication");
    const authors = normalizeText(
      record.extractedAuthors ||
        summary?.authors?.map((author) => author.name).join(", ") ||
        citationFallback?.authors ||
        "Unknown"
    );
    const journal = normalizeText(summary?.fulljournalname || summary?.source || citationFallback?.journal || "Legacy publication");
    const year = parseYear(summary?.pubdate) ?? parseYear(summary?.sortpubdate) ?? parseYear(citationFallback?.date) ?? 0;

    enriched.push({
      ...record,
      title,
      authors,
      journal,
      year,
      pubmedId,
      verified: Boolean(pubmedId || citationFallback?.title),
      theme: classifyTheme(title),
    });
  }

  const deduped = [];
  const seen = new Set();
  for (const item of enriched) {
    const key = `${item.title}::${item.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function buildOutput(records, totalPages) {
  const ordered = [...records].sort((a, b) => b.year - a.year || a.page - b.page);
  const publicationsData = ordered.map((item, index) => ({
    id: toId(item.title, item.year, index),
    year: item.year,
    title: item.title,
    authors: item.authors,
    journal: item.journal,
    theme: item.theme,
    featured: item.year >= 2024,
    verified: item.verified,
    sourcePage: item.sourcePage,
    url: item.url,
  }));

  const publicationThemes = ["All", ...new Set(publicationsData.map((item) => item.theme))];
  const verifiedItems = publicationsData.filter((item) => item.verified).length;

  const output = `export const publicationsData = ${JSON.stringify(publicationsData, null, 2)};

export const publicationThemes = ${JSON.stringify(publicationThemes, null, 2)};

export const publicationMigrationStatus = ${JSON.stringify(
    {
      verifiedItems,
      observedLegacyPagination: totalPages,
      note: "Legacy multi-page archive migrated with title/authors/link extraction and PubMed metadata enrichment.",
    },
    null,
    2
  )};
`;

  return output;
}

async function run() {
  const { totalPages, records } = await extractLegacyPublications();
  const enriched = await enrichRecords(records);
  const output = buildOutput(enriched, totalPages);
  await fs.writeFile(OUTPUT_FILE, output, "utf8");
  console.log(`Migrated ${enriched.length} publication entries from ${totalPages} legacy pages.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

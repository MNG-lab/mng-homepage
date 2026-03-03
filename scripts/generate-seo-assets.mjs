import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTES } from "../src/config/site-routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

const DEFAULT_SITE_URL = "https://mng-lab.github.io/mng-homepage";
const RAW_SITE_URL = process.env.VITE_SITE_URL || process.env.SITE_URL || DEFAULT_SITE_URL;

function normalizeSiteUrl(value) {
  try {
    const url = new URL(value);
    return url.href.replace(/\/+$/, "");
  } catch {
    throw new Error(`Invalid site URL: ${value}`);
  }
}

function buildSitemapXml(siteUrl) {
  const canonicalRoutes = [
    ROUTES.home,
    ROUTES.research,
    ROUTES.professor,
    ROUTES.members,
    ROUTES.publications,
    ROUTES.gallery,
    ROUTES.contact,
    ROUTES.join,
  ];

  const urls = canonicalRoutes
    .map((route) => {
      const pathName = route === "/" ? "/" : route;
      return `  <url>\n    <loc>${siteUrl}${pathName === "/" ? "/" : pathName}</loc>\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function buildRobotsTxt(siteUrl) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

async function main() {
  const siteUrl = normalizeSiteUrl(RAW_SITE_URL);
  const sitemapXml = buildSitemapXml(siteUrl);
  const robotsTxt = buildRobotsTxt(siteUrl);

  await fs.writeFile(path.join(PUBLIC_DIR, "sitemap.xml"), sitemapXml, "utf8");
  await fs.writeFile(path.join(PUBLIC_DIR, "robots.txt"), robotsTxt, "utf8");

  console.log("SEO assets generated");
  console.log(`- site URL: ${siteUrl}`);
  console.log(`- sitemap: ${path.join(PUBLIC_DIR, "sitemap.xml")}`);
  console.log(`- robots: ${path.join(PUBLIC_DIR, "robots.txt")}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

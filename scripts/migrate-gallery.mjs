import fs from "node:fs/promises";

const OUTPUT_FILE = new URL("../src/content/gallery-data.js", import.meta.url);

const GALLERY_SOURCES = [
  {
    id: "legacy-gallery-main",
    year: 2024,
    category: "Gallery",
    title: { ko: "갤러리 메인", en: "Gallery Main" },
    description: {
      ko: "기존 사이트 갤러리 메인 페이지에서 연도별/카테고리별 항목으로 진입합니다.",
      en: "Entry page from the legacy site with year/category sub-sections.",
    },
    sourcePage: "https://dglab.yonsei.ac.kr/gallery",
    collectImages: false,
  },
  {
    id: "legacy-gallery-2023",
    year: 2023,
    category: "Year Archive",
    title: { ko: "2023 이전 아카이브", en: "~2023 Archive" },
    description: {
      ko: "기존 갤러리의 2023년 이전 활동 모음 페이지",
      en: "Legacy activity archive page for years up to 2023.",
    },
    sourcePage: "https://dglab.yonsei.ac.kr/2023-1",
    collectImages: true,
  },
  {
    id: "legacy-gallery-2024",
    year: 2024,
    category: "Year Archive",
    title: { ko: "2024 아카이브", en: "2024 Archive" },
    description: {
      ko: "기존 갤러리의 2024년 활동 모음 페이지",
      en: "Legacy activity archive page for 2024.",
    },
    sourcePage: "https://dglab.yonsei.ac.kr/2024",
    collectImages: true,
  },
  {
    id: "legacy-gallery-wagle",
    year: 2024,
    category: "Lab Life",
    title: { ko: "와글와글", en: "Lab Life (WagleWagle)" },
    description: {
      ko: "연구실 활동 중심의 별도 갤러리 섹션",
      en: "A separate section focused on lab-life activities.",
    },
    sourcePage: "https://dglab.yonsei.ac.kr/%EC%99%80%EA%B8%80%EC%99%80%EA%B8%80",
    collectImages: true,
  },
];

const EXCLUDED_ALTS = new Set(["logo_header.png", "KakaoTalk_20241117_174010675.png"]);

function extractImageTags(html) {
  const tags = html.match(/<img\b[^>]*>/gi) ?? [];
  const results = [];

  for (const tag of tags) {
    const srcMatch = tag.match(/\ssrc="([^"]+)"/i);
    const altMatch = tag.match(/\salt="([^"]*)"/i);
    const src = srcMatch?.[1] ?? "";
    const alt = altMatch?.[1] ?? "";
    if (!src || !alt) continue;
    if (!src.includes("static.wixstatic.com/media/")) continue;
    if (EXCLUDED_ALTS.has(alt)) continue;
    results.push({ src, alt });
  }

  const deduped = [];
  const seen = new Set();
  for (const item of results) {
    const key = `${item.src}|${item.alt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function normalizeCaption(filename) {
  return filename
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/_edited/gi, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "dglab-gallery-migrator/1.0",
      accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }
  return response.text();
}

async function run() {
  const outputData = [];

  for (const source of GALLERY_SOURCES) {
    const item = { ...source };
    delete item.collectImages;

    if (source.collectImages) {
      const html = await fetchText(source.sourcePage);
      const images = extractImageTags(html).map((img, index) => {
        const caption = normalizeCaption(img.alt);
        return {
          id: `${source.id}-img-${index + 1}`,
          src: img.src,
          alt: { ko: img.alt, en: img.alt },
          caption: { ko: caption, en: caption },
        };
      });
      item.images = images;
    } else {
      item.images = [];
    }

    outputData.push(item);
  }

  const output = `export const galleryData = ${JSON.stringify(outputData, null, 2)};

export const galleryCategories = ${JSON.stringify(["All", "Gallery", "Year Archive", "Lab Life"], null, 2)};
`;

  await fs.writeFile(OUTPUT_FILE, output, "utf8");
  const migratedCount = outputData.reduce((sum, item) => sum + (item.images?.length ?? 0), 0);
  console.log(`Migrated ${migratedCount} gallery image item(s) across ${outputData.length} sections.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

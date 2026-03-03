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
    displayOrder: 1,
    hideCaptions: false,
    legacyQuery: { year: 2023, category: "Year Archive" },
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
    displayOrder: 0,
    hideCaptions: false,
    legacyQuery: { year: 2024, category: "Year Archive" },
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
    displayOrder: 2,
    hideCaptions: true,
    legacyQuery: { category: "Lab Life" },
    title: { ko: "와글와글", en: "Lab Moments" },
    description: {
      ko: "연구실 활동 중심의 별도 갤러리 섹션",
      en: "A separate section focused on lab moments.",
    },
    sourcePage: "https://dglab.yonsei.ac.kr/%EC%99%80%EA%B8%80%EC%99%80%EA%B8%80",
    collectImages: true,
  },
];

const EXCLUDED_ALTS = new Set(["logo_header.png", "KakaoTalk_20241117_174010675.png"]);

function cleanCaption(value) {
  return value
    .replace(/\u200b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidCaption(value) {
  if (!value) return false;
  if (value.length > 80) return false;
  if (/(Molecular NeuroGenetics Lab|Science Building|TEL\.|E-MAIL|서울특별시)/i.test(value)) return false;
  return true;
}

function toPlainText(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractImageTags(html) {
  const tags = [...html.matchAll(/<img\b[^>]*>/gi)];
  const results = [];

  for (const match of tags) {
    const tag = match[0];
    const srcMatch = tag.match(/\ssrc="([^"]+)"/i);
    const altMatch = tag.match(/\salt="([^"]*)"/i);
    const src = srcMatch?.[1] ?? "";
    const alt = altMatch?.[1] ?? "";
    if (!src || !alt) continue;
    if (!src.includes("static.wixstatic.com/media/")) continue;
    if (EXCLUDED_ALTS.has(alt)) continue;
    const near = html.slice(match.index, match.index + 7000);
    const textMatch = near.match(/<div[^>]*data-testid="richTextElement"[^>]*>([\s\S]*?)<\/div>/i);
    const detected = cleanCaption(textMatch ? toPlainText(textMatch[1]) : "");
    results.push({ src, alt, caption: isValidCaption(detected) ? detected : "" });
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

function decodeSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function fallbackCaptionBySource(sourceId, index) {
  if (sourceId === "legacy-gallery-wagle") return `와글와글 스냅샷 ${index + 1}`;
  if (sourceId === "legacy-gallery-2024") return `2024 활동 사진 ${index + 1}`;
  return `2023 이전 활동 사진 ${index + 1}`;
}

function captionLooksLikeFilename(value) {
  if (!value) return true;
  const token = value.toLowerCase();
  if (/(kakaotalk|photo\s*\d|img\s*\d|snapshot\s*\d)/i.test(token)) return true;
  if (/^\d{6,}/.test(token)) return true;
  return false;
}

function deriveReadableCaption(alt, sourceId, index) {
  const base = normalizeCaption(decodeSafe(alt))
    .replace(/\b(kakaotalk|photo|img)\b/gi, " ")
    .replace(/\b\d{6,}\b/g, " ")
    .replace(/\b\d{1,2}\b/g, " ")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!base) return fallbackCaptionBySource(sourceId, index);

  const hasHangul = /[가-힣]/.test(base);
  if (hasHangul && !captionLooksLikeFilename(base)) return base;

  return fallbackCaptionBySource(sourceId, index);
}

function toEnglishCaption(koCaption, fallback) {
  const map = new Map([
    ["교수님 생신", "Professor's Birthday"],
    ["KSBMB 섬유화연구분과 심포지움", "KSBMB Fibrosis Division Symposium"],
    ["경민 송별회", "Farewell for Gyeongmin"],
    ["연경 송별회", "Farewell for Yeonggyeong"],
    ["송별회", "Farewell"],
    ["송년회", "Year-end Party"],
    ["졸업 (시현 & 지연)", "Graduation (Sihyeon & Jiyeon)"],
    ["졸업 (경혜 & 윤지)", "Graduation (Kyounghye & Yoonji)"],
  ]);
  if (map.has(koCaption)) return map.get(koCaption);
  if (/^2024 활동 사진 \d+$/.test(koCaption)) {
    const number = koCaption.split(" ").at(-1);
    return `2024 Activity Photo ${number}`;
  }
  if (/^2023 이전 활동 사진 \d+$/.test(koCaption)) {
    const number = koCaption.split(" ").at(-1);
    return `Pre-2023 Activity Photo ${number}`;
  }
  if (/^와글와글 스냅샷 \d+$/.test(koCaption)) {
    const number = koCaption.split(" ").at(-1);
    return `Lab Moments Snapshot ${number}`;
  }
  return fallback || koCaption;
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
        const caption = img.caption || deriveReadableCaption(img.alt, source.id, index);
        const captionEn = toEnglishCaption(caption, caption);
        return {
          id: `${source.id}-img-${index + 1}`,
          src: img.src,
          alt: { ko: img.alt, en: img.alt },
          caption: { ko: caption, en: captionEn },
        };
      });
      item.images = images;
    } else {
      item.images = [];
    }

    outputData.push(item);
  }

  const output = `export const galleryData = ${JSON.stringify(outputData, null, 2)};
`;

  await fs.writeFile(OUTPUT_FILE, output, "utf8");
  const migratedCount = outputData.reduce((sum, item) => sum + (item.images?.length ?? 0), 0);
  console.log(`Migrated ${migratedCount} gallery image item(s) across ${outputData.length} sections.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

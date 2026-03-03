import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { membersData } from "../src/content/members-data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT_DIR, "content", "member-verification-report.md");

const MEMBERS_URL = "https://dglab.yonsei.ac.kr/members";
const PROFESSOR_URL = "https://dglab.yonsei.ac.kr/professor";

function decodeHtmlEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function toPlainText(html) {
  return decodeHtmlEntities(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\u200b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\u200b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function includesToken(text, keyword) {
  return normalizeToken(text).includes(normalizeToken(keyword));
}

function canonicalRoleFromLocalized(role) {
  const ko = role?.ko ?? "";
  const en = role?.en ?? "";
  const token = `${ko} ${en}`.toLowerCase();
  if (token.includes("박사후") || token.includes("postdoctoral")) return "Postdoctoral Researcher";
  if (token.includes("석박통합")) return "Integrated M.S./Ph.D.";
  if (token.includes("대학원생") || token.includes("graduate student")) return "Graduate Student";
  return "Unknown";
}

function detectRole(contextText) {
  const rules = [
    { label: "Postdoctoral Researcher", keys: ["박사 후 연구원", "박사후연구원", "postdoctoral"] },
    { label: "Integrated M.S./Ph.D.", keys: ["석박통합과정", "석박 통합", "integrated m.s./ph.d"] },
    { label: "Graduate Student", keys: ["대학원생", "graduate student"] },
  ];

  const normalizedContext = normalizeToken(contextText);
  let detected = { label: "Unknown", index: -1 };

  for (const rule of rules) {
    for (const key of rule.keys) {
      const token = normalizeToken(key);
      const idx = normalizedContext.lastIndexOf(token);
      if (idx > detected.index) {
        detected = { label: rule.label, index: idx };
      }
    }
  }
  return detected.label;
}

function extractMailtoContexts(html, before = 1200, after = 260) {
  const regex = /href="mailto:([^"]+)"/gi;
  const records = [];
  let match;
  let order = 0;

  while ((match = regex.exec(html))) {
    const email = String(match[1] || "").toLowerCase();
    const start = Math.max(0, match.index - before);
    const end = Math.min(html.length, match.index + after);
    const context = toPlainText(html.slice(start, end));
    records.push({ email, context, index: match.index, order });
    order += 1;
  }

  return records;
}

function groupByEmail(records) {
  const map = new Map();
  records.forEach((record) => {
    if (!map.has(record.email)) {
      map.set(record.email, []);
    }
    map.get(record.email).push(record);
  });
  return map;
}

function pickBestRecord(records, scorer) {
  if (!records.length) return null;
  let best = null;

  records.forEach((record) => {
    const scored = scorer(record);
    if (!best || scored.score > best.score || (scored.score === best.score && record.index > best.record.index)) {
      best = { record, ...scored };
    }
  });

  return best;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "dglab-member-verifier/1.0",
      accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }
  return response.text();
}

function verifyAgainstLegacy(memberContextRecords, professorContextRecords) {
  const currentByEmail = new Map(
    membersData.current.map((member) => [
      String(member.email || "").toLowerCase(),
      {
        expectedNameKo: member.name.ko,
        expectedNameEn: member.name.en,
        expectedRoleKo: member.role.ko,
        expectedRole: canonicalRoleFromLocalized(member.role),
      },
    ])
  );

  const memberContextsByEmail = groupByEmail(memberContextRecords);
  const professorContextsByEmail = groupByEmail(professorContextRecords);
  const expectedCurrentEmails = new Set([...currentByEmail.keys()]);
  const extractedCurrentEmails = new Set([...memberContextsByEmail.keys()]);

  const rows = [];
  const missingEmails = [];

  membersData.current.forEach((member) => {
    const email = String(member.email || "").toLowerCase();
    const expected = currentByEmail.get(email);
    const candidates = memberContextsByEmail.get(email) || [];

    if (!expected || !candidates.length) {
      missingEmails.push(email);
      rows.push({
        email,
        status: "current",
        expectedName: `${expected?.expectedNameKo ?? member.name.ko} / ${expected?.expectedNameEn ?? member.name.en}`,
        detectedName: "not found",
        expectedRole: expected?.expectedRole ?? canonicalRoleFromLocalized(member.role),
        detectedRole: "Unknown",
        result: "WARN",
      });
      return;
    }

    const best = pickBestRecord(candidates, (record) => {
      const nameKoMatch = includesToken(record.context, expected.expectedNameKo);
      const nameEnMatch = includesToken(record.context, expected.expectedNameEn);
      const roleDetected = detectRole(record.context);
      const roleMatch =
        roleDetected === expected.expectedRole ||
        includesToken(record.context, expected.expectedRole) ||
        includesToken(record.context, expected.expectedRoleKo);

      const nameMatched = nameKoMatch || nameEnMatch;
      const score = (nameMatched ? 20 : 0) + (roleMatch ? 12 : 0) + (roleDetected !== "Unknown" ? 4 : 0);

      return { score, roleDetected, roleMatch, nameMatched };
    });

    rows.push({
      email,
      status: "current",
      expectedName: `${expected.expectedNameKo} / ${expected.expectedNameEn}`,
      detectedName: best.nameMatched ? "matched" : "not found",
      expectedRole: expected.expectedRole,
      detectedRole: best.roleDetected,
      result: best.nameMatched && best.roleMatch ? "PASS" : "WARN",
    });
  });

  const extraEmails = [...extractedCurrentEmails]
    .filter((email) => !expectedCurrentEmails.has(email))
    .sort((a, b) => a.localeCompare(b));

  extraEmails.forEach((email) => {
    const candidates = memberContextsByEmail.get(email) || [];
    const best = pickBestRecord(candidates, (record) => {
      const roleDetected = detectRole(record.context);
      const score = roleDetected !== "Unknown" ? 2 : 0;
      return { score, roleDetected };
    });

    rows.push({
      email,
      status: "legacy-extra",
      expectedName: "-",
      detectedName: "-",
      expectedRole: "-",
      detectedRole: best?.roleDetected ?? "Unknown",
      result: "INFO",
    });
  });

  const piEmail = String(membersData.pi.email || "").toLowerCase();
  const piCandidates = professorContextsByEmail.get(piEmail) || [];
  const bestPi = pickBestRecord(piCandidates, (record) => {
    const nameKoMatch = includesToken(record.context, membersData.pi.name.ko);
    const nameEnMatch = includesToken(record.context, membersData.pi.name.en);
    const titleKoMatch = includesToken(record.context, "교수");
    const titleEnMatch = includesToken(record.context, "professor");
    const nameMatched = nameKoMatch || nameEnMatch;
    const titleMatched = titleKoMatch || titleEnMatch;
    const score = (nameMatched ? 20 : 0) + (titleMatched ? 8 : 0);
    return { score, nameMatched };
  });

  rows.push({
    email: piEmail,
    status: "pi",
    expectedName: `${membersData.pi.name.ko} / ${membersData.pi.name.en}`,
    detectedName: bestPi?.nameMatched ? "matched" : "not found",
    expectedRole: "Professor",
    detectedRole: bestPi ? "Professor" : "Unknown",
    result: bestPi?.nameMatched ? "PASS" : "WARN",
  });

  return {
    rows,
    missingEmails,
    extraEmails,
    expectedCurrentCount: expectedCurrentEmails.size,
    extractedCurrentCount: extractedCurrentEmails.size,
  };
}

function renderReport(summary) {
  const now = new Date().toISOString().slice(0, 10);
  const targetRows = summary.rows.filter((row) => row.status === "current" || row.status === "pi");
  const passCount = targetRows.filter((row) => row.result === "PASS").length;
  const warnCount = targetRows.filter((row) => row.result === "WARN").length;
  const infoCount = summary.rows.filter((row) => row.result === "INFO").length;

  const lines = [
    "# Member Verification Report",
    "",
    `Date: ${now}`,
    `Source pages: ${MEMBERS_URL}, ${PROFESSOR_URL}`,
    "",
    "## Summary",
    "",
    `- Expected current-member emails: ${summary.expectedCurrentCount}`,
    `- Extracted current-member emails from legacy page: ${summary.extractedCurrentCount}`,
    `- Target rows (current + PI): ${targetRows.length}`,
    `- PASS rows: ${passCount}`,
    `- WARN rows: ${warnCount}`,
    `- INFO rows (legacy extra emails): ${infoCount}`,
    "",
  ];

  if (summary.missingEmails.length) {
    lines.push("## Missing Emails", "");
    summary.missingEmails.forEach((email) => lines.push(`- ${email}`));
    lines.push("");
  }

  if (summary.extraEmails.length) {
    lines.push("## Extra Emails Found in Legacy", "");
    summary.extraEmails.forEach((email) => lines.push(`- ${email}`));
    lines.push("");
  }

  lines.push("## Detail", "", "| Email | Status | Expected Name | Name Match | Expected Role | Detected Role | Result |", "| --- | --- | --- | --- | --- | --- | --- |");
  summary.rows.forEach((row) => {
    lines.push(
      `| ${row.email} | ${row.status} | ${row.expectedName} | ${row.detectedName} | ${row.expectedRole} | ${row.detectedRole} | ${row.result} |`
    );
  });

  return lines.join("\n") + "\n";
}

async function main() {
  const [membersHtml, professorHtml] = await Promise.all([fetchText(MEMBERS_URL), fetchText(PROFESSOR_URL)]);
  const memberContexts = extractMailtoContexts(membersHtml, 3800, 260);
  const professorContexts = extractMailtoContexts(professorHtml, 8000, 450);

  const summary = verifyAgainstLegacy(memberContexts, professorContexts);
  const report = renderReport(summary);
  await fs.writeFile(REPORT_PATH, report, "utf8");

  const targetRows = summary.rows.filter((row) => row.status === "current" || row.status === "pi");
  const passCount = targetRows.filter((row) => row.result === "PASS").length;
  const warnCount = targetRows.filter((row) => row.result === "WARN").length;
  const infoCount = summary.rows.filter((row) => row.result === "INFO").length;
  console.log(`Member verification complete: PASS ${passCount}, WARN ${warnCount}, INFO ${infoCount}`);
  console.log(`Report written: ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contactData } from "../src/content/contact-data.js";
import { galleryData } from "../src/content/gallery-data.js";
import { membersData } from "../src/content/members-data.js";
import { professorData } from "../src/content/professor-data.js";
import { publicationsData } from "../src/content/publications-data.js";
import { researchAreas } from "../src/content/research-data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT_DIR, "content", "p3-validation-report.md");
const CHECK_URLS = process.argv.includes("--check-urls");
const WRITE_REPORT = process.argv.includes("--write-report");

const result = {
  errors: [],
  warnings: [],
  info: [],
  urlChecks: [],
};

function pushError(message) {
  result.errors.push(message);
}

function pushWarning(message) {
  result.warnings.push(message);
}

function pushInfo(message) {
  result.info.push(message);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isLocalizedText(value) {
  return isObject(value) && typeof value.ko === "string" && value.ko.trim() && typeof value.en === "string" && value.en.trim();
}

function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isAbsoluteHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    pushError(message);
  }
}

function assertLocalized(value, label) {
  if (!isLocalizedText(value)) {
    pushError(`${label} must be localized text {ko,en}`);
  }
}

function findDuplicates(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

function validateResearch() {
  assert(Array.isArray(researchAreas) && researchAreas.length > 0, "researchAreas must be a non-empty array");
  const ids = researchAreas.map((item) => item.id);
  const slugs = researchAreas.map((item) => item.slug);
  const dupIds = findDuplicates(ids);
  const dupSlugs = findDuplicates(slugs);

  if (dupIds.length) pushError(`researchAreas contains duplicate id(s): ${dupIds.join(", ")}`);
  if (dupSlugs.length) pushError(`researchAreas contains duplicate slug(s): ${dupSlugs.join(", ")}`);

  researchAreas.forEach((item, index) => {
    assert(typeof item.id === "string" && item.id.trim(), `researchAreas[${index}].id must be non-empty string`);
    assert(typeof item.slug === "string" && item.slug.trim(), `researchAreas[${index}].slug must be non-empty string`);
    assert(Number.isFinite(item.order), `researchAreas[${index}].order must be number`);
    assertLocalized(item.title, `researchAreas[${index}].title`);
    assertLocalized(item.summary, `researchAreas[${index}].summary`);
    assertLocalized(item.overview, `researchAreas[${index}].overview`);
    assert(Array.isArray(item.focus) && item.focus.length > 0, `researchAreas[${index}].focus must be non-empty array`);
    item.focus?.forEach((focusItem, focusIndex) => assertLocalized(focusItem, `researchAreas[${index}].focus[${focusIndex}]`));
    assert(Array.isArray(item.tags) && item.tags.length > 0, `researchAreas[${index}].tags must be non-empty array`);
  });
}

function validateProfessor() {
  assert(isObject(professorData), "professorData must be an object");
  assertLocalized(professorData.profile?.name, "professorData.profile.name");
  assertLocalized(professorData.profile?.title, "professorData.profile.title");
  assertLocalized(professorData.profile?.intro, "professorData.profile.intro");
  assert(Array.isArray(professorData.overview) && professorData.overview.length > 0, "professorData.overview must be non-empty array");
  professorData.overview?.forEach((item, index) => assertLocalized(item, `professorData.overview[${index}]`));
  assert(Array.isArray(professorData.focusAreas) && professorData.focusAreas.length > 0, "professorData.focusAreas must be non-empty array");
  professorData.focusAreas?.forEach((item, index) => assertLocalized(item, `professorData.focusAreas[${index}]`));
  assert(
    Array.isArray(professorData.responsibilities) && professorData.responsibilities.length > 0,
    "professorData.responsibilities must be non-empty array"
  );
  professorData.responsibilities?.forEach((item, index) => assertLocalized(item, `professorData.responsibilities[${index}]`));
  assert(Array.isArray(professorData.keywords) && professorData.keywords.length > 0, "professorData.keywords must be non-empty array");
  assert(isValidEmail(professorData.contact?.email), "professorData.contact.email must be a valid email");
  assert(isAbsoluteHttpUrl(professorData.contact?.scholarUrl), "professorData.contact.scholarUrl must be absolute URL");
}

function validateMembers() {
  assert(isObject(membersData), "membersData must be an object");
  assertLocalized(membersData.pi?.name, "membersData.pi.name");
  assertLocalized(membersData.pi?.title, "membersData.pi.title");
  assertLocalized(membersData.pi?.bio, "membersData.pi.bio");
  assert(isValidEmail(membersData.pi?.email), "membersData.pi.email must be a valid email");
  assert(isAbsoluteHttpUrl(membersData.pi?.scholarUrl), "membersData.pi.scholarUrl must be absolute URL");

  const current = Array.isArray(membersData.current) ? membersData.current : [];
  const alumni = Array.isArray(membersData.alumni) ? membersData.alumni : [];

  assert(current.length > 0, "membersData.current must be non-empty array");
  assert(alumni.length > 0, "membersData.alumni must be non-empty array");

  const dupIds = findDuplicates([...current, ...alumni].map((item) => item.id));
  if (dupIds.length) pushError(`membersData contains duplicate id(s): ${dupIds.join(", ")}`);

  current.forEach((member, index) => {
    assert(typeof member.id === "string" && member.id.trim(), `membersData.current[${index}].id must be non-empty string`);
    assertLocalized(member.name, `membersData.current[${index}].name`);
    if (member.role) assertLocalized(member.role, `membersData.current[${index}].role`);
    if (member.interests) assertLocalized(member.interests, `membersData.current[${index}].interests`);
    if (member.email && !isValidEmail(member.email)) {
      pushError(`membersData.current[${index}].email is invalid`);
    }
  });

  alumni.forEach((member, index) => {
    assert(typeof member.id === "string" && member.id.trim(), `membersData.alumni[${index}].id must be non-empty string`);
    assertLocalized(member.name, `membersData.alumni[${index}].name`);
    assert(typeof member.period === "string" && member.period.trim(), `membersData.alumni[${index}].period must be non-empty string`);
    assertLocalized(member.now, `membersData.alumni[${index}].now`);
  });

  if (membersData.pi?.email !== professorData.contact?.email) {
    pushWarning("membersData.pi.email differs from professorData.contact.email");
  }
}

function validatePublications() {
  assert(Array.isArray(publicationsData) && publicationsData.length > 0, "publicationsData must be non-empty array");
  const dupIds = findDuplicates(publicationsData.map((item) => item.id));
  if (dupIds.length) pushError(`publicationsData contains duplicate id(s): ${dupIds.join(", ")}`);

  publicationsData.forEach((item, index) => {
    assert(typeof item.id === "string" && item.id.trim(), `publicationsData[${index}].id must be non-empty string`);
    assert(Number.isFinite(item.year) && item.year >= 1900 && item.year <= 2100, `publicationsData[${index}].year out of range`);
    assert(typeof item.title === "string" && item.title.trim(), `publicationsData[${index}].title must be non-empty string`);
    assert(typeof item.authors === "string" && item.authors.trim(), `publicationsData[${index}].authors must be non-empty string`);
    assert(typeof item.journal === "string" && item.journal.trim(), `publicationsData[${index}].journal must be non-empty string`);
    if (item.url && !isAbsoluteHttpUrl(item.url)) {
      pushError(`publicationsData[${index}].url must be absolute URL`);
    }
  });
}

function validateGallery() {
  assert(Array.isArray(galleryData) && galleryData.length > 0, "galleryData must be non-empty array");
  const dupIds = findDuplicates(galleryData.map((item) => item.id));
  if (dupIds.length) pushError(`galleryData contains duplicate id(s): ${dupIds.join(", ")}`);

  galleryData.forEach((item, index) => {
    assert(typeof item.id === "string" && item.id.trim(), `galleryData[${index}].id must be non-empty string`);
    assert(Number.isFinite(item.year) && item.year >= 1900 && item.year <= 2100, `galleryData[${index}].year out of range`);
    assert(typeof item.category === "string" && item.category.trim(), `galleryData[${index}].category must be non-empty string`);
    assertLocalized(item.title, `galleryData[${index}].title`);
    assertLocalized(item.description, `galleryData[${index}].description`);

    if (Array.isArray(item.images)) {
      const imageIds = item.images.map((img) => img.id);
      const dupImageIds = findDuplicates(imageIds);
      if (dupImageIds.length) {
        pushError(`galleryData[${index}] contains duplicate image id(s): ${dupImageIds.join(", ")}`);
      }

      item.images.forEach((img, imgIndex) => {
        assert(typeof img.id === "string" && img.id.trim(), `galleryData[${index}].images[${imgIndex}].id must be non-empty string`);
        if (!isAbsoluteHttpUrl(img.src)) {
          pushError(`galleryData[${index}].images[${imgIndex}].src must be absolute URL`);
        }
        assertLocalized(img.alt, `galleryData[${index}].images[${imgIndex}].alt`);
        assertLocalized(img.caption, `galleryData[${index}].images[${imgIndex}].caption`);
      });

      if (item.category !== "Gallery" && item.images.length === 0) {
        pushWarning(`galleryData[${index}] has no image items for category ${item.category}`);
      }
    }
  });
}

function validateContact() {
  assertLocalized(contactData.locationTitle, "contactData.locationTitle");
  assertLocalized(contactData.address, "contactData.address");
  assertLocalized(contactData.altAddress, "contactData.altAddress");
  assertLocalized(contactData.emailTitle, "contactData.emailTitle");
  assertLocalized(contactData.phoneTitle, "contactData.phoneTitle");
  assertLocalized(contactData.officeHoursTitle, "contactData.officeHoursTitle");
  assertLocalized(contactData.officeHours, "contactData.officeHours");
  assertLocalized(contactData.linksTitle, "contactData.linksTitle");
  assert(isValidEmail(contactData.email), "contactData.email must be a valid email");

  const phones = Array.isArray(contactData.phones) ? contactData.phones : [];
  assert(phones.length > 0, "contactData.phones must be non-empty array");
  phones.forEach((phone, index) => {
    assertLocalized(phone.label, `contactData.phones[${index}].label`);
    assert(typeof phone.value === "string" && phone.value.trim(), `contactData.phones[${index}].value must be non-empty string`);
  });

  const links = Array.isArray(contactData.links) ? contactData.links : [];
  assert(links.length > 0, "contactData.links must be non-empty array");
  links.forEach((link, index) => {
    assertLocalized(link.label, `contactData.links[${index}].label`);
    const isInternalPath = typeof link.url === "string" && link.url.startsWith("/");
    if (!isInternalPath && !isAbsoluteHttpUrl(link.url)) {
      pushError(`contactData.links[${index}].url must be absolute URL or internal path`);
    }
  });
}

function collectExternalUrls() {
  const urls = new Set();
  [membersData.pi?.scholarUrl].forEach((item) => {
    if (item) urls.add(item);
  });
  [professorData.contact?.scholarUrl].forEach((item) => {
    if (item) urls.add(item);
  });
  publicationsData.forEach((item) => {
    if (item.url) urls.add(item.url);
  });
  contactData.links.forEach((item) => {
    if (isAbsoluteHttpUrl(item.url)) urls.add(item.url);
  });
  return [...urls];
}

async function fetchWithTimeout(url, method = "HEAD", timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "dglab-content-validator/1.0" },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrl(url) {
  try {
    let response = await fetchWithTimeout(url, "HEAD", 10000);
    if (response.status === 405 || response.status === 501) {
      response = await fetchWithTimeout(url, "GET", 12000);
    }
    return { url, ok: response.ok, status: response.status };
  } catch (error) {
    try {
      // Retry once with GET. Some hosts intermittently fail HEAD or slow-start.
      const retryResponse = await fetchWithTimeout(url, "GET", 15000);
      return { url, ok: retryResponse.ok, status: retryResponse.status, retried: true };
    } catch (retryError) {
      return { url, ok: false, status: "ERR", error: retryError.message || error.message };
    }
  }
}

async function runUrlChecks() {
  const urls = collectExternalUrls();
  for (const url of urls) {
    const check = await checkUrl(url);
    result.urlChecks.push(check);
    if (!check.ok) {
      pushWarning(`URL check failed: ${url} (${check.status}${check.error ? `: ${check.error}` : ""})`);
    }
  }
}

function renderConsoleReport() {
  console.log("Content validation summary");
  console.log(`- errors: ${result.errors.length}`);
  console.log(`- warnings: ${result.warnings.length}`);
  console.log(`- info: ${result.info.length}`);
  if (CHECK_URLS) {
    const okCount = result.urlChecks.filter((item) => item.ok).length;
    console.log(`- url checks: ${okCount}/${result.urlChecks.length} passed`);
  }

  if (result.errors.length) {
    console.log("\nErrors");
    result.errors.forEach((item) => console.log(`- ${item}`));
  }

  if (result.warnings.length) {
    console.log("\nWarnings");
    result.warnings.forEach((item) => console.log(`- ${item}`));
  }
}

function renderMarkdownReport() {
  const now = new Date().toISOString().slice(0, 10);
  const lines = [
    "# P3 Content Validation Report",
    "",
    `Date: ${now}`,
    `Checks: structure${CHECK_URLS ? " + URL health" : ""}`,
    "",
    "## Summary",
    "",
    `- Errors: ${result.errors.length}`,
    `- Warnings: ${result.warnings.length}`,
    `- Info: ${result.info.length}`,
  ];

  if (CHECK_URLS) {
    const okCount = result.urlChecks.filter((item) => item.ok).length;
    lines.push(`- URL checks: ${okCount}/${result.urlChecks.length} passed`);
  }

  if (result.errors.length) {
    lines.push("", "## Errors", "");
    result.errors.forEach((item) => lines.push(`- ${item}`));
  }

  if (result.warnings.length) {
    lines.push("", "## Warnings", "");
    result.warnings.forEach((item) => lines.push(`- ${item}`));
  }

  if (CHECK_URLS && result.urlChecks.length) {
    lines.push("", "## URL Status", "", "| URL | Status |", "| --- | --- |");
    result.urlChecks.forEach((item) => {
      const status = item.ok ? `${item.status} OK` : `${item.status} FAIL`;
      lines.push(`| ${item.url} | ${status} |`);
    });
  }

  return lines.join("\n") + "\n";
}

async function main() {
  validateResearch();
  validateProfessor();
  validateMembers();
  validatePublications();
  validateGallery();
  validateContact();

  pushInfo(`researchAreas: ${researchAreas.length}`);
  pushInfo(`publicationsData: ${publicationsData.length}`);
  pushInfo(`galleryData: ${galleryData.length}`);
  pushInfo(`members current/alumni: ${membersData.current.length}/${membersData.alumni.length}`);

  if (CHECK_URLS) {
    await runUrlChecks();
  }

  renderConsoleReport();

  if (WRITE_REPORT) {
    const markdown = renderMarkdownReport();
    await fs.writeFile(REPORT_PATH, markdown, "utf8");
    console.log(`\nReport written: ${REPORT_PATH}`);
  }

  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

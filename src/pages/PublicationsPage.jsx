import { useMemo, useState } from "react";
import { colors, spacing, typography } from "../design-tokens";
import { publicationMigrationStatus, publicationThemes, publicationsData } from "../content/publications-data";
import { useLanguage } from "../context/LanguageContext";

const PAGE_SIZE = 4;

const styles = {
  section: {
    maxWidth: 1080,
    margin: "0 auto",
    padding: `${spacing[12]} ${spacing[6]} ${spacing[16]}`,
  },
  eyebrow: {
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.xs,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: colors.brand.gold,
  },
  title: {
    marginTop: spacing[2],
    marginBottom: spacing[4],
    fontFamily: typography.fontFamily.serif,
    fontSize: "clamp(2rem, 5vw, 3rem)",
    color: colors.brand.navy,
  },
  desc: {
    margin: 0,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
  },
  filterRow: {
    marginTop: spacing[6],
    display: "flex",
    flexWrap: "wrap",
    gap: spacing[3],
    alignItems: "center",
  },
  select: {
    border: `1px solid ${colors.border.strong}`,
    borderRadius: 8,
    background: colors.surface.card,
    color: colors.text.primary,
    padding: "0.45rem 0.65rem",
    fontSize: typography.fontSize.sm,
  },
  list: {
    marginTop: spacing[6],
    display: "grid",
    gap: spacing[4],
  },
  item: {
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 12,
    padding: spacing[5],
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    gap: spacing[3],
    flexWrap: "wrap",
  },
  year: {
    fontFamily: typography.fontFamily.serif,
    color: colors.brand.gold,
    margin: 0,
  },
  theme: {
    margin: 0,
    fontSize: typography.fontSize.xs,
    color: colors.brand.accent,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 9999,
    padding: "0.2rem 0.5rem",
    alignSelf: "center",
  },
  paperTitle: {
    marginTop: spacing[3],
    marginBottom: spacing[2],
    fontFamily: typography.fontFamily.serif,
    color: colors.brand.navy,
  },
  meta: {
    margin: 0,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
  },
  link: {
    display: "inline-block",
    marginTop: spacing[2],
    color: colors.brand.accent,
    textDecoration: "none",
    fontSize: typography.fontSize.sm,
  },
  pagination: {
    marginTop: spacing[6],
    display: "flex",
    gap: spacing[2],
    flexWrap: "wrap",
  },
  pageButton: {
    border: `1px solid ${colors.border.strong}`,
    background: colors.surface.card,
    color: colors.text.primary,
    borderRadius: 9999,
    padding: "0.3rem 0.7rem",
    cursor: "pointer",
    fontSize: typography.fontSize.sm,
  },
  migrationNote: {
    marginTop: spacing[4],
    background: colors.surface.card,
    border: `1px dashed ${colors.border.strong}`,
    borderRadius: 10,
    padding: spacing[4],
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
  },
};

const copy = {
  eyebrow: { ko: "논문", en: "Publications" },
  title: { ko: "논문 아카이브", en: "Publication Archive" },
  description: {
    ko: "연도와 연구 테마로 목록을 필터링하고 페이지 단위로 탐색할 수 있습니다.",
    en: "Filter publications by year and theme, then browse by pages.",
  },
  yearFilter: { ko: "연도", en: "Year" },
  themeFilter: { ko: "테마", en: "Theme" },
  featured: { ko: "주요 논문", en: "Featured" },
  view: { ko: "원문 보기", en: "View Paper" },
  none: { ko: "조건에 맞는 논문이 없습니다.", en: "No publications match current filters." },
  migrationPrefix: { ko: "이관 상태", en: "Migration Status" },
};

export default function PublicationsPage() {
  const { language, t } = useLanguage();
  const years = useMemo(() => ["All", ...new Set(publicationsData.map((item) => String(item.year)))], []);
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedTheme, setSelectedTheme] = useState("All");
  const [page, setPage] = useState(1);
  const allOptionLabel = language === "ko" ? "전체" : "All";
  const paginationLabel = language === "ko" ? "페이지 탐색" : "Pagination";

  const filtered = useMemo(() => {
    const sorted = [...publicationsData].sort((a, b) => b.year - a.year || Number(b.featured) - Number(a.featured));
    return sorted.filter((item) => {
      const byYear = selectedYear === "All" || String(item.year) === selectedYear;
      const byTheme = selectedTheme === "All" || item.theme === selectedTheme;
      return byYear && byTheme;
    });
  }, [selectedTheme, selectedYear]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount);
  const start = (pageSafe - 1) * PAGE_SIZE;
  const current = filtered.slice(start, start + PAGE_SIZE);

  function onYearChange(value) {
    setSelectedYear(value);
    setPage(1);
  }

  function onThemeChange(value) {
    setSelectedTheme(value);
    setPage(1);
  }

  return (
    <section style={styles.section} aria-labelledby="publications-title">
      <div style={styles.eyebrow}>{t(copy.eyebrow)}</div>
      <h1 id="publications-title" style={styles.title}>
        {t(copy.title)}
      </h1>
      <p style={styles.desc}>{t(copy.description)}</p>
      <div style={styles.migrationNote}>
        <strong>{t(copy.migrationPrefix)}:</strong> {publicationMigrationStatus.verifiedItems} verified item(s), legacy archive with{" "}
        {publicationMigrationStatus.observedLegacyPagination} pages observed. {publicationMigrationStatus.note}
      </div>

      <div style={styles.filterRow}>
        <label htmlFor="publication-year-filter">{t(copy.yearFilter)}</label>
        <select
          id="publication-year-filter"
          value={selectedYear}
          onChange={(event) => onYearChange(event.target.value)}
          style={styles.select}
          aria-label={t(copy.yearFilter)}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year === "All" ? allOptionLabel : year}
            </option>
          ))}
        </select>

        <label htmlFor="publication-theme-filter">{t(copy.themeFilter)}</label>
        <select
          id="publication-theme-filter"
          value={selectedTheme}
          onChange={(event) => onThemeChange(event.target.value)}
          style={styles.select}
          aria-label={t(copy.themeFilter)}
        >
          {publicationThemes.map((theme) => (
            <option key={theme} value={theme}>
              {theme === "All" ? allOptionLabel : theme}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.list}>
        {current.length === 0 ? (
          <article style={styles.item}>{t(copy.none)}</article>
        ) : (
          current.map((item) => (
            <article key={item.id} style={styles.item}>
              <div style={styles.top}>
                <p style={styles.year}>{item.year}</p>
                <p style={styles.theme}>
                  {item.theme}
                  {item.featured ? ` - ${t(copy.featured)}` : ""}
                </p>
              </div>
              <h2 style={styles.paperTitle}>{item.title}</h2>
              <p style={styles.meta}>{item.authors}</p>
              <p style={styles.meta}>{item.journal}</p>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                style={styles.link}
                aria-label={`${t(copy.view)}: ${item.title}${language === "ko" ? " (새 탭)" : " (new tab)"}`}
              >
                {t(copy.view)}
              </a>
            </article>
          ))
        )}
      </div>

      <nav style={styles.pagination} aria-label={paginationLabel}>
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => (
          <button
            key={item}
            type="button"
            style={{
              ...styles.pageButton,
              background: item === pageSafe ? colors.brand.navy : colors.surface.card,
              color: item === pageSafe ? colors.text.inverse : colors.text.primary,
            }}
            onClick={() => setPage(item)}
            aria-current={item === pageSafe ? "page" : undefined}
            aria-label={language === "ko" ? `${item}페이지` : `Page ${item}`}
          >
            {item}
          </button>
        ))}
      </nav>
    </section>
  );
}

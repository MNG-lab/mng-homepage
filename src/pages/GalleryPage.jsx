import { useMemo, useState } from "react";
import { colors, spacing, typography } from "../design-tokens";
import { galleryCategories, galleryData } from "../content/gallery-data";
import { useLanguage } from "../context/LanguageContext";

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
  description: {
    margin: 0,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
  },
  filterRow: {
    marginTop: spacing[6],
    display: "flex",
    gap: spacing[3],
    flexWrap: "wrap",
  },
  select: {
    border: `1px solid ${colors.border.strong}`,
    borderRadius: 8,
    background: colors.surface.card,
    color: colors.text.primary,
    padding: "0.45rem 0.65rem",
    fontSize: typography.fontSize.sm,
  },
  grid: {
    marginTop: spacing[6],
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: spacing[4],
  },
  card: {
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 12,
    padding: spacing[5],
  },
  meta: {
    margin: 0,
    fontSize: typography.fontSize.xs,
    color: colors.brand.accent,
  },
  cardTitle: {
    marginTop: spacing[2],
    marginBottom: spacing[2],
    fontFamily: typography.fontFamily.serif,
    color: colors.brand.navy,
  },
  body: {
    margin: 0,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
  },
};

const copy = {
  eyebrow: { ko: "갤러리", en: "Gallery" },
  title: { ko: "연도/카테고리 갤러리", en: "Year and Category Gallery" },
  description: {
    ko: "활동 기록을 연도와 카테고리로 분류해 확인할 수 있습니다.",
    en: "Browse lab activities grouped by year and category.",
  },
  year: { ko: "연도", en: "Year" },
  category: { ko: "카테고리", en: "Category" },
  none: { ko: "조건에 맞는 항목이 없습니다.", en: "No gallery items match current filters." },
};

export default function GalleryPage() {
  const { t } = useLanguage();
  const years = useMemo(() => ["All", ...new Set(galleryData.map((item) => String(item.year)))], []);
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filtered = useMemo(() => {
    return galleryData.filter((item) => {
      const byYear = selectedYear === "All" || String(item.year) === selectedYear;
      const byCategory = selectedCategory === "All" || item.category === selectedCategory;
      return byYear && byCategory;
    });
  }, [selectedCategory, selectedYear]);

  return (
    <section style={styles.section}>
      <div style={styles.eyebrow}>{t(copy.eyebrow)}</div>
      <h1 style={styles.title}>{t(copy.title)}</h1>
      <p style={styles.description}>{t(copy.description)}</p>

      <div style={styles.filterRow}>
        <label>
          {t(copy.year)}{" "}
          <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} style={styles.select}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t(copy.category)}{" "}
          <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} style={styles.select}>
            {galleryCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={styles.grid}>
        {filtered.length === 0 ? (
          <article style={styles.card}>{t(copy.none)}</article>
        ) : (
          filtered.map((item) => (
            <article key={item.id} style={styles.card}>
              <p style={styles.meta}>
                {item.year} - {item.category}
              </p>
              <h2 style={styles.cardTitle}>{t(item.title)}</h2>
              <p style={styles.body}>{t(item.description)}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

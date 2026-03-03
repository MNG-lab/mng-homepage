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
  imageFrame: {
    marginTop: spacing[3],
    borderRadius: 10,
    overflow: "hidden",
    border: `1px solid ${colors.border.soft}`,
    background: colors.surface.subtle,
    aspectRatio: "4 / 3",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
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
  captionList: {
    margin: `${spacing[3]} 0 0`,
    paddingLeft: spacing[5],
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.relaxed,
  },
  captionItem: {
    marginBottom: spacing[1],
  },
  source: {
    display: "inline-block",
    marginTop: spacing[2],
    color: colors.brand.accent,
    fontSize: typography.fontSize.sm,
    textDecoration: "none",
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
  photos: { ko: "사진", en: "photos" },
  none: { ko: "조건에 맞는 항목이 없습니다.", en: "No gallery items match current filters." },
  source: { ko: "원본 보기", en: "View Source" },
};

export default function GalleryPage() {
  const { language, t } = useLanguage();
  const years = useMemo(() => ["All", ...new Set(galleryData.map((item) => String(item.year)))], []);
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const allOptionLabel = language === "ko" ? "전체" : "All";

  const filtered = useMemo(() => {
    return galleryData.filter((item) => {
      const byYear = selectedYear === "All" || String(item.year) === selectedYear;
      const byCategory = selectedCategory === "All" || item.category === selectedCategory;
      return byYear && byCategory;
    });
  }, [selectedCategory, selectedYear]);

  return (
    <section style={styles.section} aria-labelledby="gallery-title">
      <div style={styles.eyebrow}>{t(copy.eyebrow)}</div>
      <h1 id="gallery-title" style={styles.title}>
        {t(copy.title)}
      </h1>
      <p style={styles.description}>{t(copy.description)}</p>

      <div style={styles.filterRow}>
        <label htmlFor="gallery-year-filter">{t(copy.year)}</label>
        <select
          id="gallery-year-filter"
          value={selectedYear}
          onChange={(event) => setSelectedYear(event.target.value)}
          style={styles.select}
          aria-label={t(copy.year)}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year === "All" ? allOptionLabel : year}
            </option>
          ))}
        </select>
        <label htmlFor="gallery-category-filter">{t(copy.category)}</label>
        <select
          id="gallery-category-filter"
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
          style={styles.select}
          aria-label={t(copy.category)}
        >
          {galleryCategories.map((category) => (
            <option key={category} value={category}>
              {category === "All" ? allOptionLabel : category}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.grid}>
        {filtered.length === 0 ? (
          <article style={styles.card}>{t(copy.none)}</article>
        ) : (
          filtered.map((item) => (
            <article key={item.id} style={styles.card}>
              <p style={styles.meta}>
                {item.year} - {item.category}
                {item.images?.length ? ` · ${item.images.length} ${t(copy.photos)}` : ""}
              </p>
              {item.images?.[0] ? (
                <div style={styles.imageFrame}>
                  <img src={item.images[0].src} alt={t(item.images[0].alt)} style={styles.image} loading="lazy" />
                </div>
              ) : null}
              <h2 style={styles.cardTitle}>{t(item.title)}</h2>
              <p style={styles.body}>{t(item.description)}</p>
              {item.images?.length ? (
                <ul style={styles.captionList}>
                  {item.images.slice(0, 3).map((image) => (
                    <li key={image.id} style={styles.captionItem}>
                      {t(image.caption)}
                    </li>
                  ))}
                </ul>
              ) : null}
              <a
                href={item.sourcePage}
                target="_blank"
                rel="noreferrer"
                style={styles.source}
                aria-label={`${t(copy.source)}: ${t(item.title)}${language === "ko" ? " (새 탭)" : " (new tab)"}`}
              >
                {t(copy.source)}
              </a>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

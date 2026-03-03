import { Link } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";
import { getResearchDetailPath } from "../config/site-routes";
import { researchAreas } from "../content/research-data";
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
    margin: `${spacing[2]} 0 0`,
    fontFamily: typography.fontFamily.serif,
    fontSize: "clamp(2rem, 5vw, 3rem)",
    color: colors.brand.navy,
  },
  description: {
    marginTop: spacing[4],
    marginBottom: spacing[8],
    maxWidth: 760,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: spacing[5],
  },
  card: {
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 12,
    padding: spacing[6],
    display: "flex",
    flexDirection: "column",
    gap: spacing[4],
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  order: {
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.lg,
    color: colors.brand.gold,
    margin: 0,
  },
  cardTitle: {
    margin: 0,
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.xl,
    color: colors.brand.navy,
    lineHeight: typography.lineHeight.tight,
  },
  cardSummary: {
    margin: 0,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
    fontSize: typography.fontSize.sm,
  },
  tagWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  tag: {
    borderRadius: 9999,
    border: `1px solid ${colors.border.soft}`,
    background: colors.surface.base,
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
    padding: "0.2rem 0.55rem",
  },
  link: {
    marginTop: "auto",
    display: "inline-block",
    color: colors.brand.accent,
    textDecoration: "none",
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
};

const copy = {
  eyebrow: { ko: "연구", en: "Research" },
  title: { ko: "연구 분야", en: "Research Areas" },
  description: {
    ko: "각 연구 카드에서 상세 페이지로 이동해 세부 목표와 방법을 확인할 수 있습니다.",
    en: "Each research card links to a detail page with specific goals and methods.",
  },
  detailLink: { ko: "상세 보기", en: "View Details" },
};

export default function ResearchPage() {
  const { t } = useLanguage();

  return (
    <section style={styles.section} aria-labelledby="research-title">
      <div style={styles.eyebrow}>{t(copy.eyebrow)}</div>
      <h1 id="research-title" style={styles.title}>
        {t(copy.title)}
      </h1>
      <p style={styles.description}>{t(copy.description)}</p>

      <div style={styles.grid}>
        {researchAreas.map((area) => (
          <article key={area.id} style={styles.card}>
            <p style={styles.order}>{String(area.order).padStart(2, "0")}</p>
            <h2 style={styles.cardTitle}>{t(area.title)}</h2>
            <p style={styles.cardSummary}>{t(area.summary)}</p>

            <div style={styles.tagWrap}>
              {area.tags.map((tag) => (
                <span key={tag} style={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>

            <Link to={getResearchDetailPath(area.slug)} style={styles.link} aria-label={`${t(copy.detailLink)}: ${t(area.title)}`}>
              {t(copy.detailLink)}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

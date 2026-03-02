import { Link, useParams } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";
import { ROUTES } from "../config/site-routes";
import { researchAreas } from "../content/research-data";
import { useLanguage } from "../context/LanguageContext";

const styles = {
  section: {
    maxWidth: 980,
    margin: "0 auto",
    padding: `${spacing[12]} ${spacing[6]} ${spacing[16]}`,
  },
  backLink: {
    color: colors.brand.accent,
    textDecoration: "none",
    fontSize: typography.fontSize.sm,
  },
  title: {
    marginTop: spacing[5],
    marginBottom: spacing[4],
    fontFamily: typography.fontFamily.serif,
    fontSize: "clamp(2rem, 5vw, 3rem)",
    color: colors.brand.navy,
    lineHeight: typography.lineHeight.tight,
  },
  summary: {
    margin: 0,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
    fontSize: typography.fontSize.md,
  },
  panel: {
    marginTop: spacing[8],
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 12,
    padding: spacing[6],
  },
  panelTitle: {
    margin: 0,
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.xl,
    color: colors.brand.navy,
  },
  panelText: {
    marginTop: spacing[3],
    marginBottom: 0,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
  },
  list: {
    margin: `${spacing[4]} 0 0`,
    paddingLeft: spacing[5],
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
  },
  sourceLink: {
    display: "inline-block",
    marginTop: spacing[5],
    color: colors.brand.accent,
    textDecoration: "none",
    fontSize: typography.fontSize.sm,
  },
};

const copy = {
  back: { ko: "연구 목록으로", en: "Back to Research" },
  overview: { ko: "개요", en: "Overview" },
  focus: { ko: "핵심 목표", en: "Focus" },
  notFound: { ko: "요청한 연구 항목이 없습니다.", en: "Research item not found." },
  source: { ko: "기존 연구 페이지", en: "Legacy Research Page" },
};

export default function ResearchDetailPage() {
  const { slug } = useParams();
  const { language, t } = useLanguage();
  const area = researchAreas.find((item) => item.slug === slug);

  if (!area) {
    return (
      <section style={styles.section}>
        <Link to={ROUTES.research} style={styles.backLink}>
          {t(copy.back)}
        </Link>
        <h1 style={styles.title}>{t(copy.notFound)}</h1>
      </section>
    );
  }

  return (
    <section style={styles.section} aria-labelledby="research-detail-title">
      <Link to={ROUTES.research} style={styles.backLink}>
        {t(copy.back)}
      </Link>

      <h1 id="research-detail-title" style={styles.title}>
        {t(area.title)}
      </h1>
      <p style={styles.summary}>{t(area.summary)}</p>

      <article style={styles.panel}>
        <h2 style={styles.panelTitle}>{t(copy.overview)}</h2>
        <p style={styles.panelText}>{t(area.overview)}</p>
      </article>

      <article style={styles.panel}>
        <h2 style={styles.panelTitle}>{t(copy.focus)}</h2>
        <ul style={styles.list}>
          {area.focus.map((item) => (
            <li key={item.en}>{t(item)}</li>
          ))}
        </ul>
      </article>

      <a
        href={area.legacyPath}
        target="_blank"
        rel="noreferrer"
        style={styles.sourceLink}
        aria-label={`${t(copy.source)}: ${t(area.title)}${language === "ko" ? " (새 탭)" : " (new tab)"}`}
      >
        {t(copy.source)}
      </a>
    </section>
  );
}

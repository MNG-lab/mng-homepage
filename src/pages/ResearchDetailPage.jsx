import { Link, useParams } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";
import { ROUTES } from "../config/site-routes";
import { researchAreas } from "../content/research-data";
import { useLanguage } from "../context/LanguageContext";
import { resolveContentImageSrc } from "../utils/resolve-content-image-src";

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
  figureGrid: {
    marginTop: spacing[6],
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: spacing[4],
  },
  figureCard: {
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 12,
    overflow: "hidden",
  },
  figureMedia: {
    aspectRatio: "16 / 10",
    background: colors.surface.base,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[2],
  },
  figureImage: {
    width: "100%",
    height: "100%",
    display: "block",
    objectFit: "contain",
    objectPosition: "center",
    background: colors.surface.base,
  },
  figureCaption: {
    margin: 0,
    padding: spacing[3],
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.relaxed,
  },
};

const copy = {
  back: { ko: "연구 목록으로", en: "Back to Research" },
  overview: { ko: "개요", en: "Overview" },
  notFound: { ko: "요청한 연구 항목이 없습니다.", en: "Research item not found." },
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

      <article style={styles.panel}>
        <h2 style={styles.panelTitle}>{t(copy.overview)}</h2>
        {(Array.isArray(area.details) ? area.details : [area.overview]).map((paragraph, index) => (
          <p key={`${area.id}-overview-${index}`} style={styles.panelText}>
            {t(paragraph)}
          </p>
        ))}
      </article>

      {area.figures?.length ? (
        <section style={styles.figureGrid} aria-label={language === "ko" ? "연구 도해" : "Research figures"}>
          {area.figures.map((figure, index) => (
            <figure key={`${area.id}-figure-${index}`} style={styles.figureCard}>
              <div style={styles.figureMedia}>
                <img
                  src={resolveContentImageSrc(figure.src)}
                  alt={t(figure.caption)}
                  style={styles.figureImage}
                  loading="lazy"
                />
              </div>
              <figcaption style={styles.figureCaption}>{t(figure.caption)}</figcaption>
            </figure>
          ))}
        </section>
      ) : null}

    </section>
  );
}

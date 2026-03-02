import { Link } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";
import { ROUTES } from "../config/site-routes";
import { homeContent } from "../content/home-content";
import { useLanguage } from "../context/LanguageContext";

const styles = {
  hero: {
    background: `linear-gradient(135deg, ${colors.brand.navy} 0%, ${colors.brand.deep} 52%, #305f86 100%)`,
    color: colors.text.inverse,
    padding: `${spacing[16]} ${spacing[6]} ${spacing[12]}`,
  },
  heroInner: {
    maxWidth: 1040,
    margin: "0 auto",
  },
  eyebrow: {
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.xs,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: colors.brand.gold,
    marginBottom: spacing[3],
  },
  title: {
    margin: 0,
    fontFamily: typography.fontFamily.serif,
    fontWeight: typography.fontWeight.regular,
    fontSize: "clamp(2.1rem, 7vw, 3.5rem)",
    lineHeight: typography.lineHeight.tight,
    maxWidth: 760,
  },
  subtitle: {
    marginTop: spacing[4],
    marginBottom: spacing[8],
    maxWidth: 760,
    color: "rgba(255,255,255,0.86)",
    lineHeight: typography.lineHeight.relaxed,
    fontSize: typography.fontSize.md,
  },
  ctaRow: {
    display: "flex",
    gap: spacing[3],
    flexWrap: "wrap",
  },
  ctaPrimary: {
    background: colors.brand.gold,
    color: colors.brand.navy,
    textDecoration: "none",
    borderRadius: 9999,
    padding: `${spacing[3]} ${spacing[6]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  ctaSecondary: {
    border: "1px solid rgba(255,255,255,0.34)",
    color: colors.text.inverse,
    textDecoration: "none",
    borderRadius: 9999,
    padding: `${spacing[3]} ${spacing[6]}`,
    fontSize: typography.fontSize.sm,
  },
  contentWrap: {
    maxWidth: 1040,
    margin: "0 auto",
    padding: `${spacing[12]} ${spacing[6]} ${spacing[4]}`,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: spacing[6],
  },
  card: {
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 12,
    padding: spacing[6],
    scrollMarginTop: 100,
  },
  cardTitle: {
    margin: 0,
    color: colors.brand.navy,
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.xl,
  },
  cardText: {
    margin: `${spacing[3]} 0 0`,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
    fontSize: typography.fontSize.md,
  },
};

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <>
      <section id="top" style={styles.hero} aria-labelledby="home-hero-title">
        <div style={styles.heroInner}>
          <div style={styles.eyebrow}>{t(homeContent.eyebrow)}</div>
          <h1 id="home-hero-title" style={styles.title}>
            {t(homeContent.title)}
          </h1>
          <p style={styles.subtitle}>{t(homeContent.subtitle)}</p>

          <div style={styles.ctaRow}>
            <Link to={ROUTES.research} style={styles.ctaPrimary}>
              {t(homeContent.ctaPrimary)}
            </Link>
            <Link to={`${ROUTES.home}#about`} style={styles.ctaSecondary}>
              {t(homeContent.ctaSecondary)}
            </Link>
          </div>
        </div>
      </section>

      <section style={styles.contentWrap}>
        {homeContent.sections.map((section) => (
          <article key={section.id} id={section.id} style={styles.card}>
            <h2 style={styles.cardTitle}>{t(section.title)}</h2>
            <p style={styles.cardText}>{t(section.text)}</p>
          </article>
        ))}
      </section>
    </>
  );
}

import { Link } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";
import { ROUTES } from "../config/site-routes";

const sections = [
  {
    id: "about",
    title: "About",
    text: "We study the molecular mechanisms of cilia biology and connect basic science to rare disease and metabolism research.",
  },
  {
    id: "research-summary",
    title: "Research Summary",
    text: "Current focus areas: ciliopathies and rare genetic disease, obesity and metabolic regulation, liver fibrosis and aging.",
  },
  {
    id: "news",
    title: "News",
    text: "Major publications, conference activity, and grant updates are managed in a unified feed for lab visibility and recruiting.",
  },
  {
    id: "join",
    title: "Join",
    text: "Graduate students and postdocs can find role descriptions, application process, and direct contacts from the Join Us page.",
  },
];

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
    fontSize: "clamp(2.2rem, 7vw, 3.5rem)",
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
  return (
    <>
      <section id="top" style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.eyebrow}>Molecular NeuroGenetics Lab</div>
          <h1 style={styles.title}>DGLab Homepage Migration Baseline</h1>
          <p style={styles.subtitle}>
            P0 now uses a real route structure with reusable layout. Home anchors are linked and can be opened directly.
          </p>

          <div style={styles.ctaRow}>
            <Link to={ROUTES.research} style={styles.ctaPrimary}>
              Go to Research
            </Link>
            <Link to={`${ROUTES.home}#about`} style={styles.ctaSecondary}>
              Jump to About
            </Link>
          </div>
        </div>
      </section>

      <section style={styles.contentWrap}>
        {sections.map((section) => (
          <article key={section.id} id={section.id} style={styles.card}>
            <h2 style={styles.cardTitle}>{section.title}</h2>
            <p style={styles.cardText}>{section.text}</p>
          </article>
        ))}
      </section>
    </>
  );
}

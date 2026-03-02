import { Link } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";

const styles = {
  section: {
    maxWidth: 1040,
    margin: "0 auto",
    padding: `${spacing[12]} ${spacing[6]} ${spacing[16]}`,
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
    fontFamily: typography.fontFamily.serif,
    fontSize: "clamp(2rem, 5vw, 3rem)",
    lineHeight: typography.lineHeight.tight,
    color: colors.brand.navy,
    margin: 0,
  },
  description: {
    maxWidth: 760,
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.relaxed,
    color: colors.text.secondary,
    marginTop: spacing[5],
    marginBottom: spacing[8],
  },
  panel: {
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 12,
    padding: spacing[6],
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
  },
  listTitle: {
    margin: 0,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.xl,
  },
  list: {
    margin: `${spacing[4]} 0 0`,
    paddingLeft: spacing[5],
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.sans,
    lineHeight: typography.lineHeight.relaxed,
  },
  ctaRow: {
    marginTop: spacing[8],
    display: "flex",
    gap: spacing[3],
    flexWrap: "wrap",
  },
  ctaPrimary: {
    background: colors.brand.navy,
    color: colors.text.inverse,
    textDecoration: "none",
    borderRadius: 9999,
    padding: `${spacing[3]} ${spacing[6]}`,
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSize.sm,
  },
  ctaSecondary: {
    background: "transparent",
    color: colors.brand.navy,
    textDecoration: "none",
    borderRadius: 9999,
    border: `1px solid ${colors.brand.navy}`,
    padding: `${spacing[3]} ${spacing[6]}`,
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSize.sm,
  },
};

export default function PageTemplate({
  eyebrow,
  title,
  description,
  bullets,
  primaryCta,
  secondaryCta,
}) {
  return (
    <section style={styles.section}>
      <div style={styles.eyebrow}>{eyebrow}</div>
      <h1 style={styles.title}>{title}</h1>
      <p style={styles.description}>{description}</p>

      {Array.isArray(bullets) && bullets.length > 0 ? (
        <div style={styles.panel}>
          <h2 style={styles.listTitle}>In Scope</h2>
          <ul style={styles.list}>
            {bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={styles.ctaRow}>
        {primaryCta ? (
          <Link to={primaryCta.to} style={styles.ctaPrimary}>
            {primaryCta.label}
          </Link>
        ) : null}
        {secondaryCta ? (
          <Link to={secondaryCta.to} style={styles.ctaSecondary}>
            {secondaryCta.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

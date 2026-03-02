import { Link } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";
import { ROUTES } from "../config/site-routes";
import { pageContent } from "../content/page-content";
import { useLanguage } from "../context/LanguageContext";

export default function NotFoundPage() {
  const { t } = useLanguage();
  const content = pageContent.notFound;

  return (
    <section
      aria-labelledby="not-found-title"
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: `${spacing[16]} ${spacing[6]}`,
      }}
    >
      <p
        style={{
          margin: 0,
          color: colors.brand.gold,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontFamily: typography.fontFamily.serif,
          fontSize: typography.fontSize.xs,
        }}
      >
        {content.code}
      </p>
      <h1
        id="not-found-title"
        style={{
          marginTop: spacing[3],
          marginBottom: spacing[4],
          color: colors.brand.navy,
          fontFamily: typography.fontFamily.serif,
          fontSize: "clamp(2rem, 6vw, 3.2rem)",
        }}
      >
        {t(content.title)}
      </h1>
      <p
        style={{
          margin: 0,
          maxWidth: 640,
          color: colors.text.secondary,
          lineHeight: typography.lineHeight.relaxed,
        }}
      >
        {t(content.description)}
      </p>
      <Link
        to={ROUTES.home}
        style={{
          display: "inline-block",
          marginTop: spacing[6],
          borderRadius: 9999,
          textDecoration: "none",
          background: colors.brand.navy,
          color: colors.text.inverse,
          padding: `${spacing[3]} ${spacing[6]}`,
          fontSize: typography.fontSize.sm,
        }}
      >
        {t(content.cta)}
      </Link>
    </section>
  );
}

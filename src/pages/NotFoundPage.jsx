import { Link } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";
import { ROUTES } from "../config/site-routes";

export default function NotFoundPage() {
  return (
    <section
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
        404
      </p>
      <h1
        style={{
          marginTop: spacing[3],
          marginBottom: spacing[4],
          color: colors.brand.navy,
          fontFamily: typography.fontFamily.serif,
          fontSize: "clamp(2rem, 6vw, 3.2rem)",
        }}
      >
        Page Not Found
      </h1>
      <p
        style={{
          margin: 0,
          maxWidth: 640,
          color: colors.text.secondary,
          lineHeight: typography.lineHeight.relaxed,
        }}
      >
        The requested URL does not exist in the new route map.
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
        Go Home
      </Link>
    </section>
  );
}

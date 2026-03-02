import { Link, NavLink, Outlet } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";
import { HOME_ANCHOR_ITEMS, PRIMARY_NAV_ITEMS, ROUTES } from "../config/site-routes";

const styles = {
  app: {
    minHeight: "100vh",
    background: colors.surface.base,
    fontFamily: typography.fontFamily.sans,
    color: colors.text.primary,
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: colors.brand.navy,
    borderBottom: "1px solid rgba(255,255,255,0.12)",
  },
  headerInner: {
    maxWidth: 1160,
    margin: "0 auto",
    minHeight: 68,
    padding: `${spacing[4]} ${spacing[6]}`,
    display: "flex",
    gap: spacing[6],
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  brand: {
    textDecoration: "none",
    color: colors.text.inverse,
    display: "flex",
    alignItems: "center",
    gap: spacing[3],
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 9999,
    background: `linear-gradient(135deg, ${colors.brand.accent}, ${colors.brand.gold})`,
    display: "grid",
    placeItems: "center",
    fontFamily: typography.fontFamily.serif,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.xs,
  },
  brandName: {
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.md,
    lineHeight: 1.1,
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: spacing[4],
    flexWrap: "wrap",
  },
  footer: {
    background: colors.brand.navy,
    color: "rgba(255,255,255,0.78)",
    marginTop: spacing[16],
  },
  footerInner: {
    maxWidth: 1160,
    margin: "0 auto",
    padding: `${spacing[12]} ${spacing[6]}`,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: spacing[8],
  },
  footerTitle: {
    margin: 0,
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.lg,
  },
  footerText: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
  },
  footerLinks: {
    display: "flex",
    flexDirection: "column",
    gap: spacing[2],
  },
  footerBottom: {
    borderTop: "1px solid rgba(255,255,255,0.14)",
    padding: `${spacing[4]} ${spacing[6]} ${spacing[6]}`,
    maxWidth: 1160,
    margin: "0 auto",
    fontSize: typography.fontSize.xs,
    color: "rgba(255,255,255,0.6)",
  },
};

function navStyle(isActive) {
  return {
    color: isActive ? colors.text.inverse : "rgba(255,255,255,0.7)",
    textDecoration: "none",
    fontSize: typography.fontSize.sm,
    fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.medium,
  };
}

function footerLinkStyle() {
  return {
    color: "rgba(255,255,255,0.72)",
    textDecoration: "none",
    fontSize: typography.fontSize.sm,
  };
}

export default function SiteLayout() {
  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <Link to={ROUTES.home} style={styles.brand}>
            <span style={styles.brandMark}>M</span>
            <span style={styles.brandName}>MNG Lab</span>
          </Link>

          <nav style={styles.nav} aria-label="Primary">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <NavLink key={item.key} to={item.path} style={({ isActive }) => navStyle(isActive)} end={item.path === ROUTES.home}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div>
            <h2 style={styles.footerTitle}>Molecular NeuroGenetics Lab</h2>
            <p style={styles.footerText}>
              Department of Biochemistry
              <br />
              College of Life Science and Biotechnology
              <br />
              Yonsei University
            </p>
          </div>

          <div>
            <h3 style={styles.footerTitle}>Pages</h3>
            <div style={styles.footerLinks}>
              {PRIMARY_NAV_ITEMS.map((item) => (
                <Link key={item.key} to={item.path} style={footerLinkStyle()}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 style={styles.footerTitle}>Home Anchors</h3>
            <div style={styles.footerLinks}>
              {HOME_ANCHOR_ITEMS.map((item) => (
                <Link key={item.key} to={item.path} style={footerLinkStyle()}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.footerBottom}>(c) 2026 Molecular NeuroGenetics Lab, Yonsei University.</div>
      </footer>
    </div>
  );
}

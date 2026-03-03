import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";
import { HOME_ANCHOR_ITEMS, PRIMARY_NAV_ITEMS, ROUTES } from "../config/site-routes";
import { uiCopy } from "../content/ui-copy";
import { useLanguage } from "../context/LanguageContext";

const styles = {
  app: {
    minHeight: "100vh",
    background: colors.surface.base,
    fontFamily: typography.fontFamily.sans,
    color: colors.text.primary,
  },
  skipLink: {
    position: "absolute",
    left: spacing[4],
    top: -100,
    zIndex: 1000,
    borderRadius: 10,
    textDecoration: "none",
    background: colors.brand.gold,
    color: colors.brand.navy,
    padding: `${spacing[2]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  skipLinkVisible: {
    top: spacing[3],
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(11,29,58,0.92)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  headerInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "14px 20px",
    display: "flex",
    gap: 16,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  brand: {
    textDecoration: "none",
    color: colors.text.inverse,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    lineHeight: 1.15,
  },
  brandTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: "0.01em",
    color: colors.text.inverse,
  },
  brandSub: {
    fontSize: typography.fontSize.xs,
    color: "rgba(255,255,255,0.65)",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: spacing[3],
    flexWrap: "wrap",
  },
  nav: {
    display: "flex",
    gap: spacing[2],
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  languageWrap: {
    display: "inline-flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.22)",
    borderRadius: 9999,
    padding: 2,
  },
  langButton: {
    border: 0,
    background: "transparent",
    borderRadius: 9999,
    color: "rgba(255,255,255,0.8)",
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    padding: "0.32rem 0.66rem",
    cursor: "pointer",
  },
  footer: {
    background: colors.brand.navy,
    color: "rgba(255,255,255,0.8)",
    marginTop: 24,
  },
  footerInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: `${spacing[10]} ${spacing[5]} ${spacing[8]}`,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: spacing[6],
  },
  footerTitle: {
    margin: `0 0 ${spacing[3]} 0`,
    color: colors.text.inverse,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  footerText: {
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
    padding: `${spacing[4]} ${spacing[5]} ${spacing[6]}`,
    maxWidth: 1100,
    margin: "0 auto",
    fontSize: typography.fontSize.xs,
    color: "rgba(255,255,255,0.62)",
  },
};

function navStyle(isActive, isJoin) {
  return {
    textDecoration: "none",
    fontSize: typography.fontSize.xs,
    padding: "0.5rem 0.75rem",
    borderRadius: 9999,
    border: `1px solid ${isActive ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.14)"}`,
    color: isJoin
      ? isActive
        ? colors.text.inverse
        : colors.brand.gold
      : isActive
        ? colors.text.inverse
        : "rgba(255,255,255,0.72)",
    background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
    transition: "all 0.2s ease",
  };
}

function footerLinkStyle() {
  return {
    color: "rgba(255,255,255,0.82)",
    textDecoration: "none",
    fontSize: typography.fontSize.sm,
  };
}

function languageButtonStyle(isActive) {
  return {
    ...styles.langButton,
    background: isActive ? "rgba(255,255,255,0.16)" : "transparent",
    color: isActive ? colors.text.inverse : "rgba(255,255,255,0.78)",
  };
}

function resolveCopyright(text, year) {
  return String(text || "").replace("{year}", String(year));
}

export default function SiteLayout() {
  const { language, setLanguage, t } = useLanguage();
  const [skipFocused, setSkipFocused] = useState(false);
  const currentYear = new Date().getFullYear();

  const skipToMainLabel = language === "ko" ? "본문으로 건너뛰기" : "Skip to main content";
  const primaryNavLabel = language === "ko" ? "주요 메뉴" : "Primary navigation";

  return (
    <div style={styles.app}>
      <a
        href="#main-content"
        style={{ ...styles.skipLink, ...(skipFocused ? styles.skipLinkVisible : {}) }}
        onFocus={() => setSkipFocused(true)}
        onBlur={() => setSkipFocused(false)}
      >
        {skipToMainLabel}
      </a>

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <Link to={ROUTES.home} style={styles.brand}>
            <span style={styles.brandTitle}>MNG Lab</span>
            <span style={styles.brandSub}>Yonsei University</span>
          </Link>

          <div style={styles.controls}>
            <nav style={styles.nav} aria-label={primaryNavLabel}>
              {PRIMARY_NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.path}
                  style={({ isActive }) => navStyle(isActive, item.key === "join")}
                  end={item.path === ROUTES.home}
                >
                  {uiCopy.nav[item.key].en}
                </NavLink>
              ))}
            </nav>

            <div style={styles.languageWrap} role="group" aria-label={t(uiCopy.language.label)}>
              <button
                type="button"
                onClick={() => setLanguage("ko")}
                style={languageButtonStyle(language === "ko")}
                aria-pressed={language === "ko"}
              >
                KR
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                style={languageButtonStyle(language === "en")}
                aria-pressed={language === "en"}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div>
            <h2 style={styles.footerTitle}>{t(uiCopy.footer.labName)}</h2>
            <p style={styles.footerText}>
              {t(uiCopy.footer.department)}
              <br />
              {t(uiCopy.footer.college)}
              <br />
              {t(uiCopy.footer.university)}
            </p>
          </div>

          <div>
            <h3 style={styles.footerTitle}>{t(uiCopy.footer.pagesTitle)}</h3>
            <div style={styles.footerLinks}>
              {PRIMARY_NAV_ITEMS.map((item) => (
                <Link key={item.key} to={item.path} style={footerLinkStyle()}>
                  {t(uiCopy.nav[item.key])}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 style={styles.footerTitle}>{t(uiCopy.footer.anchorsTitle)}</h3>
            <div style={styles.footerLinks}>
              {HOME_ANCHOR_ITEMS.map((item) => (
                <Link key={item.key} to={item.path} style={footerLinkStyle()}>
                  {t(uiCopy.homeAnchors[item.key])}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.footerBottom}>{resolveCopyright(t(uiCopy.footer.copyright), currentYear)}</div>
      </footer>
    </div>
  );
}

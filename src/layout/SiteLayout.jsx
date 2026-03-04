import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";
import { HOME_ANCHOR_ITEMS, PRIMARY_NAV_ITEMS, ROUTES } from "../config/site-routes";
import { uiCopy } from "../content/ui-copy";
import { useLanguage } from "../context/LanguageContext";
import { useViewport } from "../hooks/useViewport";

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
  mobileHeaderRow: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3],
  },
  menuButton: {
    border: "1px solid rgba(255,255,255,0.24)",
    background: "rgba(255,255,255,0.08)",
    color: colors.text.inverse,
    borderRadius: 10,
    padding: "0.4rem 0.66rem",
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    cursor: "pointer",
    transition: "background 0.22s ease, border-color 0.22s ease, transform 0.22s ease",
  },
  mobilePanel: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: spacing[3],
    overflow: "hidden",
    maxHeight: 0,
    opacity: 0,
    transform: "translateY(-6px)",
    paddingTop: 0,
    borderTop: "1px solid rgba(255,255,255,0)",
    pointerEvents: "none",
    transition:
      "max-height 320ms ease, opacity 220ms ease, transform 280ms ease, padding-top 280ms ease, border-color 280ms ease",
  },
  mobilePanelOpen: {
    maxHeight: 320,
    opacity: 1,
    transform: "translateY(0)",
    paddingTop: spacing[2],
    borderTop: "1px solid rgba(255,255,255,0.12)",
    pointerEvents: "auto",
  },
  mobileNav: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: spacing[2],
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

function navStyle(isActive, isJoin, isMobile) {
  return {
    textDecoration: "none",
    fontSize: typography.fontSize.xs,
    padding: isMobile ? "0.42rem 0.68rem" : "0.5rem 0.75rem",
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

function mobileNavStyle(isActive, isJoin) {
  return {
    textDecoration: "none",
    fontSize: typography.fontSize.xs,
    textAlign: "center",
    padding: "0.52rem 0.6rem",
    borderRadius: 9999,
    border: `1px solid ${isActive ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.14)"}`,
    color: isJoin
      ? isActive
        ? colors.text.inverse
        : colors.brand.gold
      : isActive
        ? colors.text.inverse
        : "rgba(255,255,255,0.78)",
    background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
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
  const location = useLocation();
  const { isCompactNav } = useViewport();
  const [skipFocused, setSkipFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!isCompactNav) setMenuOpen(false);
  }, [isCompactNav]);

  const skipToMainLabel = language === "ko" ? "본문으로 건너뛰기" : "Skip to main content";
  const primaryNavLabel = language === "ko" ? "주요 메뉴" : "Primary navigation";
  const headerInnerStyle = isCompactNav
    ? {
        ...styles.headerInner,
        padding: "12px 16px",
        gap: 10,
        alignItems: "stretch",
      }
    : styles.headerInner;
  const controlsStyle = styles.controls;
  const navLayoutStyle = styles.nav;
  const languageWrapStyle = isCompactNav ? { ...styles.languageWrap, alignSelf: "flex-start" } : styles.languageWrap;
  const menuLabel = menuOpen ? (language === "ko" ? "메뉴 닫기" : "Close menu") : language === "ko" ? "메뉴" : "Menu";
  const menuButtonStyle = menuOpen
    ? { ...styles.menuButton, background: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.38)" }
    : styles.menuButton;

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
        <div style={headerInnerStyle}>
          {isCompactNav ? (
            <>
              <div style={styles.mobileHeaderRow}>
                <Link to={ROUTES.home} style={styles.brand}>
                  <span style={styles.brandTitle}>MNG Lab</span>
                  <span style={styles.brandSub}>Yonsei University</span>
                </Link>
                <button
                  type="button"
                  style={menuButtonStyle}
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-expanded={menuOpen}
                  aria-controls="mobile-nav-panel"
                >
                  {menuLabel}
                </button>
              </div>

              <div
                id="mobile-nav-panel"
                style={{ ...styles.mobilePanel, ...(menuOpen ? styles.mobilePanelOpen : {}) }}
                aria-hidden={!menuOpen}
              >
                <nav style={styles.mobileNav} aria-label={primaryNavLabel}>
                  {PRIMARY_NAV_ITEMS.map((item) => (
                    <NavLink
                      key={item.key}
                      to={item.path}
                      style={({ isActive }) => mobileNavStyle(isActive, item.key === "join")}
                      end={item.path === ROUTES.home}
                    >
                      {uiCopy.nav[item.key].en}
                    </NavLink>
                  ))}
                </nav>

                <div style={languageWrapStyle} role="group" aria-label={t(uiCopy.language.label)}>
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
            </>
          ) : (
            <>
              <Link to={ROUTES.home} style={styles.brand}>
                <span style={styles.brandTitle}>MNG Lab</span>
                <span style={styles.brandSub}>Yonsei University</span>
              </Link>

              <div style={controlsStyle}>
                <nav style={navLayoutStyle} aria-label={primaryNavLabel}>
                  {PRIMARY_NAV_ITEMS.map((item) => (
                      <NavLink
                        key={item.key}
                        to={item.path}
                        style={({ isActive }) => navStyle(isActive, item.key === "join", false)}
                        end={item.path === ROUTES.home}
                      >
                      {uiCopy.nav[item.key].en}
                    </NavLink>
                  ))}
                </nav>

                <div style={languageWrapStyle} role="group" aria-label={t(uiCopy.language.label)}>
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
            </>
          )}
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

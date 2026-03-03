import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";
import { ROUTES, getResearchDetailPath } from "../config/site-routes";
import { homeContent } from "../content/home-content";
import { useLanguage } from "../context/LanguageContext";

const AUTO_ROTATE_MS = 5000;

const styles = {
  hero: {
    position: "relative",
    minHeight: 520,
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    color: colors.text.inverse,
    transition: "background 0.8s ease",
  },
  heroGlow: {
    position: "absolute",
    inset: "-120px",
    background:
      "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.16), transparent 55%), radial-gradient(circle at 85% 30%, rgba(212,168,83,0.14), transparent 55%), radial-gradient(circle at 55% 90%, rgba(59,130,196,0.18), transparent 60%)",
    pointerEvents: "none",
  },
  heroInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: `${spacing[16]} ${spacing[5]} ${spacing[12]}`,
    position: "relative",
    zIndex: 1,
    width: "100%",
  },
  kicker: {
    fontSize: "0.82rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.74)",
  },
  heroTitle: {
    margin: `${spacing[3]} 0 ${spacing[2]}`,
    fontSize: "clamp(2rem, 6vw, 3.1rem)",
    lineHeight: 1.05,
    color: colors.text.inverse,
  },
  heroSub: {
    margin: 0,
    fontSize: typography.fontSize.lg,
    color: "rgba(255,255,255,0.82)",
    maxWidth: 780,
  },
  heroDesc: {
    marginTop: spacing[4],
    color: "rgba(255,255,255,0.8)",
    maxWidth: 700,
    lineHeight: typography.lineHeight.relaxed,
    minHeight: "3.2em",
  },
  heroCopyBlock: {
    minHeight: 230,
  },
  chipsRow: {
    marginTop: spacing[6],
    display: "flex",
    flexWrap: "wrap",
    gap: spacing[3],
    alignItems: "center",
  },
  chip: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    width: 164,
    minHeight: 40,
    borderRadius: 9999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "transparent",
    color: "rgba(255,255,255,0.72)",
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.fontSize.xs,
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "center",
  },
  chipActive: {
    background: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.3)",
    color: colors.text.inverse,
  },
  ctaRow: {
    marginTop: spacing[5],
    display: "flex",
    flexWrap: "wrap",
    gap: spacing[3],
  },
  ctaPrimary: {
    textDecoration: "none",
    borderRadius: 12,
    background: colors.brand.navy,
    color: colors.text.inverse,
    border: "1px solid rgba(11,29,58,0.22)",
    padding: `${spacing[3]} ${spacing[5]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  ctaGhost: {
    textDecoration: "none",
    borderRadius: 12,
    background: "rgba(255,255,255,0.1)",
    color: colors.text.inverse,
    border: "1px solid rgba(255,255,255,0.35)",
    padding: `${spacing[3]} ${spacing[5]}`,
    fontSize: typography.fontSize.sm,
  },
  statsWrap: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: `0 ${spacing[5]}`,
    marginTop: -36,
    position: "relative",
    zIndex: 2,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: spacing[3],
  },
  statCard: {
    background: colors.surface.card,
    border: "1px solid rgba(11,29,58,0.08)",
    borderRadius: 18,
    boxShadow: "0 10px 30px rgba(11,29,58,0.06)",
    padding: `${spacing[5]} ${spacing[5]}`,
  },
  statValue: {
    fontSize: "1.45rem",
    color: colors.brand.navy,
    fontWeight: typography.fontWeight.bold,
  },
  statLabel: {
    marginTop: 2,
    fontSize: typography.fontSize.sm,
    color: "rgba(61,61,61,0.75)",
  },
  section: {
    padding: `${spacing[16]} ${spacing[5]}`,
  },
  sectionOff: {
    background: colors.surface.subtle,
  },
  sectionInner: {
    maxWidth: 1100,
    margin: "0 auto",
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: spacing[3],
    margin: `0 0 ${spacing[5]}`,
    color: colors.brand.navy,
    fontSize: "clamp(1.6rem, 3.6vw, 2rem)",
    letterSpacing: "-0.01em",
  },
  pill: {
    fontSize: "0.69rem",
    padding: "5px 10px",
    borderRadius: 9999,
    background: "rgba(59,130,196,0.12)",
    color: colors.brand.accent,
    border: "1px solid rgba(59,130,196,0.18)",
    whiteSpace: "nowrap",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 0.8fr)",
    gap: spacing[4],
    alignItems: "start",
  },
  card: {
    background: colors.surface.card,
    borderRadius: 18,
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 8px 28px rgba(11,29,58,0.05)",
    padding: 28,
  },
  paragraph: {
    marginTop: 0,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
    fontSize: typography.fontSize.md,
  },
  muted: {
    color: "rgba(61,61,61,0.72)",
  },
  profile: {
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 18,
    padding: 18,
    background: "linear-gradient(180deg, rgba(240,237,230,0.8), white 70%)",
  },
  profileLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: 6,
    color: "rgba(61,61,61,0.72)",
  },
  profileName: {
    margin: 0,
    fontSize: typography.fontSize.xl,
    color: colors.brand.navy,
  },
  profileTitle: {
    marginTop: spacing[2],
    color: "rgba(61,61,61,0.76)",
    fontSize: typography.fontSize.sm,
  },
  researchGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: spacing[4],
  },
  researchCard: {
    position: "relative",
    overflow: "hidden",
    background: colors.surface.card,
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.06)",
    padding: spacing[6],
    transition: "transform 0.25s ease, box-shadow 0.25s ease",
  },
  researchNum: {
    fontWeight: typography.fontWeight.bold,
    letterSpacing: "0.12em",
    fontSize: typography.fontSize.xs,
    color: "rgba(11,29,58,0.55)",
  },
  researchTitle: {
    margin: `${spacing[3]} 0 ${spacing[2]}`,
    color: colors.brand.navy,
    fontSize: "1.08rem",
  },
  researchBody: {
    color: "rgba(61,61,61,0.82)",
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
  },
  tags: {
    marginTop: spacing[4],
    display: "flex",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  tag: {
    fontSize: "0.68rem",
    padding: "5px 10px",
    borderRadius: 9999,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "rgba(240,237,230,0.55)",
  },
  newsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: spacing[3],
  },
  newsCard: {
    background: colors.surface.card,
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 14,
    padding: spacing[5],
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: spacing[2],
    fontSize: "0.68rem",
    borderRadius: 9999,
    padding: "5px 10px",
    border: "1px solid rgba(0,0,0,0.08)",
    background: "rgba(240,237,230,0.55)",
    marginBottom: spacing[3],
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 9999,
  },
  newsTitle: {
    margin: `0 0 ${spacing[2]}`,
    color: colors.brand.navy,
    fontSize: typography.fontSize.md,
  },
  joinCard: {
    background: colors.surface.card,
    borderRadius: 18,
    color: colors.text.primary,
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 8px 28px rgba(11,29,58,0.05)",
    padding: 28,
  },
  joinText: {
    color: "rgba(61,61,61,0.72)",
    marginTop: 0,
    marginBottom: spacing[5],
    lineHeight: typography.lineHeight.relaxed,
    maxWidth: 780,
  },
  fadeUpOn: {
    opacity: 1,
    transform: "translateY(0)",
    transition: "opacity 0.5s ease, transform 0.5s ease",
  },
  fadeUpOff: {
    opacity: 0,
    transform: "translateY(12px)",
  },
};

function researchAccent(colorKey) {
  if (colorKey === "metab") return "#6B8E5A";
  if (colorKey === "aging") return "#9B6B9E";
  return colors.brand.accent;
}

function newsTypeColor(typeEn) {
  if (typeEn === "Funding") return "#6B8E5A";
  if (typeEn === "Conference") return "#9B6B9E";
  return colors.brand.accent;
}

export default function HomePage() {
  const { t } = useLanguage();
  const [activeSlide, setActiveSlide] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [hoveredResearch, setHoveredResearch] = useState(null);

  const slides = homeContent.hero.slides;
  const currentSlide = slides[activeSlide];

  useEffect(() => {
    setMounted(true);
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, AUTO_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <>
      <section id="top" style={{ ...styles.hero, background: currentSlide.gradient }} aria-labelledby="home-hero-title">
        <div style={styles.heroGlow} />
        <div style={styles.heroInner}>
          <div style={styles.kicker}>{t(homeContent.hero.kicker)}</div>
          <div style={{ ...(mounted ? styles.fadeUpOn : styles.fadeUpOff), ...styles.heroCopyBlock }} key={currentSlide.id}>
            <h1 id="home-hero-title" style={styles.heroTitle}>
              {t(currentSlide.title)}
            </h1>
            <p style={styles.heroSub}>{t(currentSlide.subtitle)}</p>
            <p style={styles.heroDesc}>{t(currentSlide.description)}</p>
          </div>

          <div style={styles.chipsRow}>
            {slides.map((slide, index) => {
              const selected = index === activeSlide;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  style={{ ...styles.chip, ...(selected ? styles.chipActive : {}) }}
                >
                  {slide.icon ? `${slide.icon} ` : ""}
                  {t(slide.label)}
                </button>
              );
            })}
          </div>

        </div>
      </section>

      <div style={styles.statsWrap}>
        <div style={styles.statsGrid} aria-label="Quick stats">
          {homeContent.stats.map((item) => (
            <article key={item.value} style={styles.statCard}>
              <div style={styles.statValue}>{item.value}</div>
              <div style={styles.statLabel}>{t(item.label)}</div>
            </article>
          ))}
        </div>
      </div>

      <section id="about" style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>
            {t(homeContent.about.title)} <span style={styles.pill}>{t(homeContent.about.pill)}</span>
          </h2>

          <div style={styles.twoCol}>
            <article style={styles.card}>
              <p style={styles.paragraph}>{t(homeContent.about.paragraphs[0])}</p>
              <p style={{ ...styles.paragraph, ...styles.muted }}>{t(homeContent.about.paragraphs[1])}</p>
              <div style={styles.ctaRow}>
                <Link to={ROUTES.join} style={styles.ctaPrimary}>
                  {t(homeContent.about.ctaJoin)}
                </Link>
                <Link to={`${ROUTES.home}#news`} style={{ ...styles.ctaPrimary, background: colors.surface.card, color: colors.brand.navy }}>
                  {t(homeContent.about.ctaNews)}
                </Link>
              </div>
            </article>

            <aside style={styles.profile}>
              <div style={styles.profileLabel}>{t(homeContent.profile.label)}</div>
              <h3 style={styles.profileName}>{t(homeContent.profile.name)}</h3>
              <div style={styles.profileTitle}>{t(homeContent.profile.title)}</div>
              <p style={{ ...styles.paragraph, marginTop: spacing[3], marginBottom: 0 }}>{t(homeContent.profile.bio)}</p>
              <div style={styles.ctaRow}>
                <a
                  href="https://scholar.google.com/citations?user=vZtD7W0AAAAJ"
                  target="_blank"
                  rel="noreferrer"
                  style={styles.ctaPrimary}
                >
                  {t(homeContent.profile.ctaScholar)} ↗
                </a>
                <Link to={ROUTES.contact} style={{ ...styles.ctaPrimary, background: colors.surface.card, color: colors.brand.navy }}>
                  {t(homeContent.profile.ctaContact)}
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section id="research-summary" style={{ ...styles.section, ...styles.sectionOff }}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>
            {t(homeContent.research.title)} <span style={styles.pill}>{t(homeContent.research.pill)}</span>
          </h2>

          <div style={styles.researchGrid}>
            {homeContent.research.cards.map((item) => {
              const accent = researchAccent(item.color);
              const isHovered = hoveredResearch === item.id;

              return (
                <article
                  key={item.id}
                  style={{
                    ...styles.researchCard,
                    transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                    boxShadow: isHovered ? "0 18px 40px rgba(11,29,58,0.1)" : "none",
                  }}
                  onMouseEnter={() => setHoveredResearch(item.id)}
                  onMouseLeave={() => setHoveredResearch(null)}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      background: accent,
                    }}
                  />
                  <div style={styles.researchNum}>{item.number}</div>
                  <h3 style={styles.researchTitle}>{t(item.title)}</h3>
                  <p style={styles.researchBody}>{t(item.description)}</p>
                  <div style={styles.tags}>
                    {item.tags.map((tag) => (
                      <span key={tag.en} style={styles.tag}>
                        {t(tag)}
                      </span>
                    ))}
                  </div>
                  <div style={{ marginTop: spacing[4] }}>
                    <Link
                      to={getResearchDetailPath(item.id)}
                      style={{ color: colors.brand.accent, fontSize: typography.fontSize.sm, textDecoration: "none" }}
                    >
                      {t({ ko: "상세 보기", en: "View details" })} →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="news" style={{ ...styles.section, ...styles.sectionOff }}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>
            {t(homeContent.news.title)} <span style={styles.pill}>{t(homeContent.news.pill)}</span>
          </h2>

          <div style={styles.newsGrid}>
            {homeContent.news.items.map((item) => {
              const typeEn = item.type.en;
              const dotColor = newsTypeColor(typeEn);
              return (
                <article key={`${item.year}-${typeEn}-${item.title.en}`} style={styles.newsCard}>
                  <div style={styles.badge}>
                    <span style={{ ...styles.badgeDot, background: dotColor }} />
                    <span>
                      {item.year} · {t(item.type)}
                    </span>
                  </div>
                  <h3 style={styles.newsTitle}>{t(item.title)}</h3>
                  <p style={{ ...styles.paragraph, marginBottom: 0 }}>{t(item.description)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="join" style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>
            {t(homeContent.join.title)} <span style={styles.pill}>{t(homeContent.join.pill)}</span>
          </h2>

          <article style={styles.joinCard}>
            <p style={styles.joinText}>{t(homeContent.join.description)}</p>
            <div style={styles.ctaRow}>
              <Link to={ROUTES.join} style={styles.ctaPrimary}>
                {t(homeContent.join.ctaPrimary)} →
              </Link>
              <Link to={ROUTES.contact} style={{ ...styles.ctaPrimary, background: colors.surface.card, color: colors.brand.navy }}>
                {t(homeContent.join.ctaSecondary)}
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

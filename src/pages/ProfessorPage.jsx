import { colors, spacing, typography } from "../design-tokens";
import { professorData } from "../content/professor-data";
import { useLanguage } from "../context/LanguageContext";

const styles = {
  section: {
    maxWidth: 1080,
    margin: "0 auto",
    padding: `${spacing[12]} ${spacing[6]} ${spacing[16]}`,
  },
  eyebrow: {
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.xs,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: colors.brand.gold,
  },
  title: {
    marginTop: spacing[2],
    marginBottom: spacing[2],
    fontFamily: typography.fontFamily.serif,
    fontSize: "clamp(2rem, 5vw, 3rem)",
    color: colors.brand.navy,
  },
  subtitle: {
    margin: 0,
    color: colors.text.secondary,
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.relaxed,
    maxWidth: 860,
  },
  profileCard: {
    marginTop: spacing[6],
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderLeft: `4px solid ${colors.brand.gold}`,
    borderRadius: 12,
    padding: spacing[6],
  },
  name: {
    margin: 0,
    color: colors.brand.navy,
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize["2xl"],
  },
  role: {
    marginTop: spacing[2],
    marginBottom: spacing[4],
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  body: {
    margin: 0,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
  },
  keywordWrap: {
    marginTop: spacing[4],
    display: "flex",
    gap: spacing[2],
    flexWrap: "wrap",
  },
  keyword: {
    borderRadius: 9999,
    border: `1px solid ${colors.border.soft}`,
    background: colors.surface.base,
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
    padding: "0.2rem 0.55rem",
  },
  grid: {
    marginTop: spacing[6],
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: spacing[4],
  },
  card: {
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 12,
    padding: spacing[5],
  },
  cardTitle: {
    margin: 0,
    color: colors.brand.navy,
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.xl,
  },
  list: {
    margin: `${spacing[3]} 0 0`,
    paddingLeft: spacing[5],
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
    fontSize: typography.fontSize.sm,
  },
  links: {
    marginTop: spacing[6],
    display: "flex",
    flexWrap: "wrap",
    gap: spacing[3],
  },
  pillLink: {
    display: "inline-block",
    borderRadius: 9999,
    textDecoration: "none",
    fontSize: typography.fontSize.sm,
    padding: "0.42rem 0.9rem",
    background: colors.surface.card,
    border: `1px solid ${colors.border.strong}`,
    color: colors.brand.navy,
  },
  source: {
    marginTop: spacing[6],
    background: colors.surface.card,
    border: `1px dashed ${colors.border.strong}`,
    borderRadius: 10,
    padding: spacing[4],
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
  },
  sourceLink: {
    color: colors.brand.accent,
    textDecoration: "none",
  },
};

const copy = {
  eyebrow: { ko: "교수 소개", en: "Professor" },
  pageTitle: { ko: "책임교수 소개", en: "Professor Profile" },
  programTitle: { ko: "연구 방향", en: "Research Programs" },
  responsibilityTitle: { ko: "주요 역할", en: "Core Responsibilities" },
  email: { ko: "이메일", en: "Email" },
  scholar: { ko: "Google Scholar", en: "Google Scholar" },
  source: { ko: "기존 Professor 페이지", en: "Legacy Professor Page" },
};

export default function ProfessorPage() {
  const { language, t } = useLanguage();
  const { profile, overview, focusAreas, responsibilities, keywords, contact, source } = professorData;

  return (
    <section style={styles.section} aria-labelledby="professor-title">
      <div style={styles.eyebrow}>{t(copy.eyebrow)}</div>
      <h1 id="professor-title" style={styles.title}>
        {t(copy.pageTitle)}
      </h1>
      <p style={styles.subtitle}>{t(profile.intro)}</p>

      <article style={styles.profileCard}>
        <h2 style={styles.name}>{t(profile.name)}</h2>
        <p style={styles.role}>{t(profile.title)}</p>
        {overview.map((item, index) => (
          <p key={index} style={{ ...styles.body, marginTop: index === 0 ? 0 : spacing[3] }}>
            {t(item)}
          </p>
        ))}
        <div style={styles.keywordWrap}>
          {keywords.map((item) => (
            <span key={item} style={styles.keyword}>
              {item}
            </span>
          ))}
        </div>
      </article>

      <div style={styles.grid}>
        <article style={styles.card}>
          <h2 style={styles.cardTitle}>{t(copy.programTitle)}</h2>
          <ul style={styles.list}>
            {focusAreas.map((item) => (
              <li key={item.en}>{t(item)}</li>
            ))}
          </ul>
        </article>

        <article style={styles.card}>
          <h2 style={styles.cardTitle}>{t(copy.responsibilityTitle)}</h2>
          <ul style={styles.list}>
            {responsibilities.map((item) => (
              <li key={item.en}>{t(item)}</li>
            ))}
          </ul>
        </article>
      </div>

      <div style={styles.links}>
        <a href={`mailto:${contact.email}`} style={styles.pillLink} aria-label={`${t(copy.email)}: ${contact.email}`}>
          {t(copy.email)}: {contact.email}
        </a>
        <a
          href={contact.scholarUrl}
          target="_blank"
          rel="noreferrer"
          style={styles.pillLink}
          aria-label={`${t(copy.scholar)}${language === "ko" ? " (새 탭)" : " (new tab)"}`}
        >
          {t(copy.scholar)}
        </a>
      </div>

      <div style={styles.source}>
        <a
          href={source.professorPage}
          target="_blank"
          rel="noreferrer"
          style={styles.sourceLink}
          aria-label={`${t(copy.source)}${language === "ko" ? " (새 탭)" : " (new tab)"}`}
        >
          {t(copy.source)}
        </a>
      </div>
    </section>
  );
}

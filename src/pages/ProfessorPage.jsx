import { useLayoutEffect, useRef, useState } from "react";
import { colors, spacing, typography } from "../design-tokens";
import { professorData } from "../content/professor-data";
import { useLanguage } from "../context/LanguageContext";
import { useViewport } from "../hooks/useViewport";
import { resolveContentImageSrc } from "../utils/resolve-content-image-src";

const EXPERIENCE_PREVIEW_ITEMS = 2;

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
    padding: spacing[5],
    display: "grid",
    gridTemplateColumns: "minmax(0, 180px) minmax(0, 1fr)",
    gap: spacing[5],
  },
  profilePhoto: {
    width: "100%",
    borderRadius: 10,
    border: `1px solid ${colors.border.soft}`,
    objectFit: "cover",
    aspectRatio: "3 / 4",
  },
  profileBody: {
    minWidth: 0,
  },
  name: {
    margin: 0,
    color: colors.brand.navy,
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize["2xl"],
  },
  role: {
    marginTop: spacing[2],
    marginBottom: spacing[2],
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
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: spacing[4],
    alignItems: "start",
  },
  card: {
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 12,
    padding: spacing[5],
    display: "flex",
    flexDirection: "column",
    gap: spacing[2],
  },
  cardTitle: {
    margin: 0,
    color: colors.brand.navy,
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.xl,
  },
  list: {
    margin: `${spacing[1]} 0 0`,
    paddingLeft: 0,
    listStyle: "none",
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
    fontSize: typography.fontSize.sm,
  },
  listItem: {
    padding: `${spacing[2]} 0`,
    borderBottom: `1px solid ${colors.border.soft}`,
  },
  listPeriod: {
    margin: 0,
    color: colors.brand.accent,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  listText: {
    margin: `${spacing[1]} 0 0`,
    color: colors.text.secondary,
  },
  listViewport: {
    overflow: "hidden",
    transition: "max-height 0.35s ease",
  },
  moreButton: {
    marginTop: spacing[2],
    alignSelf: "flex-start",
    borderRadius: 9999,
    border: `1px solid ${colors.border.strong}`,
    background: colors.surface.base,
    color: colors.brand.navy,
    fontSize: typography.fontSize.xs,
    padding: "0.35rem 0.75rem",
    cursor: "pointer",
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
};

const copy = {
  eyebrow: { ko: "교수 소개", en: "Professor" },
  pageTitle: { ko: "책임교수 소개", en: "Professor Profile" },
  affiliation: { ko: "소속", en: "Affiliation" },
  address: { ko: "연구실 주소", en: "Office Address" },
  educationTitle: { ko: "학력", en: "Education" },
  experienceTitle: { ko: "연구 및 경력", en: "Research and Professional Experience" },
  honorsTitle: { ko: "수상 및 장학", en: "Awards and Honors" },
  email: { ko: "이메일", en: "Email" },
  officePhone: { ko: "교수실", en: "Office" },
  scholar: { ko: "Google Scholar", en: "Google Scholar" },
  more: { ko: "더보기", en: "Show More" },
  less: { ko: "접기", en: "Show Less" },
};

export default function ProfessorPage() {
  const { language, t } = useLanguage();
  const { isMobile } = useViewport();
  const { profile, affiliation, address, overview, education, experience, honors, keywords, contact } = professorData;
  const [showAllExperience, setShowAllExperience] = useState(false);
  const experienceCardRef = useRef(null);
  const [cardHeight, setCardHeight] = useState(0);

  useLayoutEffect(() => {
    if (!experienceCardRef.current) return;
    const measured = Math.ceil(experienceCardRef.current.getBoundingClientRect().height);
    if (measured > 0) setCardHeight(measured);
  }, [language, showAllExperience, experience.length]);

  const hasExpandableExperience = experience.length > EXPERIENCE_PREVIEW_ITEMS;
  const visibleExperience = showAllExperience ? experience : experience.slice(0, EXPERIENCE_PREVIEW_ITEMS);
  const shouldEqualizeCards = !isMobile && !(hasExpandableExperience && showAllExperience);
  const equalHeightStyle = shouldEqualizeCards && cardHeight > 0 ? { minHeight: cardHeight } : {};
  const sectionStyle = isMobile ? { ...styles.section, padding: `${spacing[10]} ${spacing[4]} ${spacing[12]}` } : styles.section;
  const subtitleStyle = isMobile ? { ...styles.subtitle, fontSize: typography.fontSize.sm } : styles.subtitle;
  const profileCardStyle = isMobile
    ? { ...styles.profileCard, gridTemplateColumns: "1fr", padding: spacing[4], gap: spacing[4] }
    : styles.profileCard;
  const profilePhotoStyle = isMobile ? { ...styles.profilePhoto, maxWidth: 220 } : styles.profilePhoto;
  const nameStyle = isMobile ? { ...styles.name, fontSize: "clamp(1.9rem, 6vw, 2.4rem)" } : styles.name;
  const gridStyle = isMobile ? { ...styles.grid, gridTemplateColumns: "1fr", gap: spacing[3] } : styles.grid;
  const cardStyle = isMobile ? { ...styles.card, padding: spacing[4] } : styles.card;
  const linksStyle = isMobile ? { ...styles.links, marginTop: spacing[5], gap: spacing[2] } : styles.links;

  return (
    <section style={sectionStyle} aria-labelledby="professor-title">
      <div style={styles.eyebrow}>{t(copy.eyebrow)}</div>
      <h1 id="professor-title" style={styles.title}>
        {t(copy.pageTitle)}
      </h1>
      <p style={subtitleStyle}>{t(profile.intro)}</p>

      <article style={profileCardStyle}>
        <img src={resolveContentImageSrc(profile.photo)} alt={t(profile.name)} style={profilePhotoStyle} loading="lazy" />
        <div style={styles.profileBody}>
          <h2 style={nameStyle}>{t(profile.name)}</h2>
          <p style={styles.role}>{t(profile.title)}</p>
          <p style={styles.body}>
            <strong>{t(copy.affiliation)}:</strong> {t(affiliation)}
          </p>
          <p style={{ ...styles.body, marginTop: spacing[2] }}>
            <strong>{t(copy.address)}:</strong> {t(address)}
          </p>
          {overview.map((item, index) => (
            <p key={index} style={{ ...styles.body, marginTop: spacing[2] }}>
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
        </div>
      </article>

      <div style={gridStyle}>
        <article style={{ ...cardStyle, ...equalHeightStyle }}>
          <h2 style={styles.cardTitle}>{t(copy.educationTitle)}</h2>
          <ul style={styles.list}>
            {education.map((item) => (
              <li key={`${item.period}-${item.en}`} style={styles.listItem}>
                <p style={styles.listPeriod}>{item.period}</p>
                <p style={styles.listText}>{t({ ko: item.ko, en: item.en })}</p>
              </li>
            ))}
          </ul>
        </article>

        <article ref={experienceCardRef} style={cardStyle}>
          <h2 style={styles.cardTitle}>{t(copy.experienceTitle)}</h2>
          <ul style={styles.list}>
            {visibleExperience.map((item) => (
              <li key={`${item.period}-${item.en}`} style={styles.listItem}>
                <p style={styles.listPeriod}>{item.period}</p>
                <p style={styles.listText}>{t({ ko: item.ko, en: item.en })}</p>
              </li>
            ))}
          </ul>
          {hasExpandableExperience ? (
            <button
              type="button"
              style={styles.moreButton}
              onClick={() => setShowAllExperience((prev) => !prev)}
              aria-expanded={showAllExperience}
            >
              {showAllExperience ? t(copy.less) : t(copy.more)}
            </button>
          ) : null}
        </article>

        <article style={{ ...cardStyle, ...equalHeightStyle }}>
          <h2 style={styles.cardTitle}>{t(copy.honorsTitle)}</h2>
          <ul style={styles.list}>
            {honors.map((item) => (
              <li key={`${item.period}-${item.en}`} style={styles.listItem}>
                <p style={styles.listPeriod}>{item.period}</p>
                <p style={styles.listText}>{t({ ko: item.ko, en: item.en })}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div style={linksStyle}>
        <a href={`tel:${contact.officePhone.replace(/[^+\d]/g, "")}`} style={styles.pillLink}>
          {t(copy.officePhone)}: {contact.officePhone}
        </a>
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

    </section>
  );
}

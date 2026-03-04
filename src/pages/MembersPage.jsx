import { Link } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";
import { membersData } from "../content/members-data";
import { ROUTES } from "../config/site-routes";
import { useLanguage } from "../context/LanguageContext";

const MEMBER_CARD_WIDTH = 168; // 240px baseline scaled by 0.7.

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
    marginBottom: spacing[6],
    fontFamily: typography.fontFamily.serif,
    fontSize: "clamp(2rem, 5vw, 3rem)",
    color: colors.brand.navy,
  },
  professorLink: {
    display: "inline-block",
    marginTop: spacing[2],
    marginBottom: spacing[8],
    borderRadius: 9999,
    textDecoration: "none",
    fontSize: typography.fontSize.sm,
    padding: "0.45rem 0.95rem",
    background: colors.brand.navy,
    border: `1px solid ${colors.brand.navy}`,
    color: colors.text.inverse,
  },
  heading: {
    marginTop: spacing[8],
    marginBottom: spacing[4],
    fontFamily: typography.fontFamily.serif,
    color: colors.brand.navy,
    fontSize: typography.fontSize.xl,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${MEMBER_CARD_WIDTH}px, ${MEMBER_CARD_WIDTH}px))`,
    justifyContent: "center",
    gap: spacing[4],
  },
  memberCard: {
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 12,
    padding: spacing[4],
    display: "flex",
    flexDirection: "column",
    gap: spacing[2],
    width: `${MEMBER_CARD_WIDTH}px`,
  },
  photoWrap: {
    borderRadius: 10,
    overflow: "hidden",
    border: `1px solid ${colors.border.soft}`,
    aspectRatio: "4 / 5",
    background: colors.surface.subtle,
  },
  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  memberName: {
    margin: 0,
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  meta: {
    margin: 0,
    color: colors.brand.accent,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.relaxed,
  },
  desc: {
    margin: 0,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
    fontSize: typography.fontSize.sm,
  },
};

const copy = {
  eyebrow: { ko: "구성원", en: "Members" },
  title: { ko: "현재 구성원 및 동문", en: "Current Members and Alumni" },
  professorLink: { ko: "교수 상세 보기", en: "View Professor Profile" },
  current: { ko: "현재 구성원", en: "Current Members" },
  alumni: { ko: "동문", en: "Alumni" },
};

function extractRecentYear(period) {
  const matches = String(period || "").match(/\b(19|20)\d{2}\b/g) || [];
  if (!matches.length) return 0;
  return Math.max(...matches.map((value) => Number(value)));
}

export default function MembersPage() {
  const { t } = useLanguage();
  const { current, alumni } = membersData;
  const sortedAlumni = [...alumni].sort((a, b) => {
    const yearDiff = extractRecentYear(b.period) - extractRecentYear(a.period);
    if (yearDiff !== 0) return yearDiff;
    return a.name.ko.localeCompare(b.name.ko, "ko");
  });

  return (
    <section style={styles.section} aria-labelledby="members-title">
      <div style={styles.eyebrow}>{t(copy.eyebrow)}</div>
      <h1 id="members-title" style={styles.title}>
        {t(copy.title)}
      </h1>

      <Link to={ROUTES.professor} style={styles.professorLink}>
        {t(copy.professorLink)}
      </Link>

      <h2 style={styles.heading}>{t(copy.current)}</h2>
      <div style={styles.grid}>
        {current.map((member) => (
          <article key={member.id} style={styles.memberCard}>
            {member.photo ? (
              <div style={styles.photoWrap}>
                <img
                  src={member.photo}
                  alt={t(member.name)}
                  style={styles.photo}
                  loading="lazy"
                />
              </div>
            ) : null}
            <h3 style={styles.memberName}>{t(member.name)}</h3>
            {member.role ? <p style={styles.meta}>{t(member.role)}</p> : null}
            {member.email ? (
              <p style={{ ...styles.desc, marginTop: spacing[2] }}>
                {member.email}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      <h2 style={styles.heading}>{t(copy.alumni)}</h2>
      <div style={styles.grid}>
        {sortedAlumni.map((member) => (
          <article key={member.id} style={styles.memberCard}>
            {member.photo ? (
              <div style={styles.photoWrap}>
                <img
                  src={member.photo}
                  alt={t(member.name)}
                  style={styles.photo}
                  loading="lazy"
                />
              </div>
            ) : null}
            <h3 style={styles.memberName}>{t(member.name)}</h3>
            <p style={styles.meta}>{member.period}</p>
            {member.email ? (
              <p style={{ ...styles.desc, marginTop: spacing[2] }}>
                {member.email}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

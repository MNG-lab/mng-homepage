import { Link } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";
import { membersData } from "../content/members-data";
import { ROUTES } from "../config/site-routes";
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
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: spacing[4],
  },
  memberCard: {
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 12,
    padding: spacing[5],
  },
  memberName: {
    margin: 0,
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  meta: {
    marginTop: spacing[1],
    marginBottom: spacing[2],
    color: colors.brand.accent,
    fontSize: typography.fontSize.sm,
  },
  desc: {
    margin: 0,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
    fontSize: typography.fontSize.sm,
  },
  sourceBox: {
    marginTop: spacing[8],
    background: colors.surface.card,
    border: `1px dashed ${colors.border.strong}`,
    borderRadius: 10,
    padding: spacing[4],
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
  },
  sourceLink: {
    color: colors.brand.accent,
    textDecoration: "none",
  },
};

const copy = {
  eyebrow: { ko: "구성원", en: "Members" },
  title: { ko: "현재 구성원 및 동문", en: "Current Members and Alumni" },
  professorLink: { ko: "교수 상세 보기", en: "View Professor Profile" },
  current: { ko: "현재 구성원", en: "Current Members" },
  alumni: { ko: "동문", en: "Alumni" },
  source: { ko: "원본 멤버 페이지", en: "Legacy Members Page" },
};

export default function MembersPage() {
  const { language, t } = useLanguage();
  const { current, alumni } = membersData;

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
            <h3 style={styles.memberName}>{t(member.name)}</h3>
            <p style={styles.meta}>{t(member.role)}</p>
            <p style={styles.desc}>{t(member.interests)}</p>
            {member.email ? <p style={{ ...styles.desc, marginTop: spacing[2] }}>{member.email}</p> : null}
          </article>
        ))}
      </div>

      <h2 style={styles.heading}>{t(copy.alumni)}</h2>
      <div style={styles.grid}>
        {alumni.map((member) => (
          <article key={member.id} style={styles.memberCard}>
            <h3 style={styles.memberName}>{t(member.name)}</h3>
            <p style={styles.meta}>{member.period}</p>
            <p style={styles.desc}>{t(member.now)}</p>
          </article>
        ))}
      </div>

      <div style={styles.sourceBox}>
        <a
          href={membersData.source.membersPage}
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

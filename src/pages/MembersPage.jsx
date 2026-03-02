import { colors, spacing, typography } from "../design-tokens";
import { membersData } from "../content/members-data";
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
  piCard: {
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderLeft: `4px solid ${colors.brand.gold}`,
    borderRadius: 12,
    padding: spacing[6],
    marginBottom: spacing[8],
  },
  piName: {
    margin: 0,
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize["2xl"],
    color: colors.brand.navy,
  },
  piTitle: {
    marginTop: spacing[2],
    marginBottom: spacing[3],
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  piBio: {
    margin: 0,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
  },
  linkRow: {
    marginTop: spacing[4],
    display: "flex",
    gap: spacing[3],
    flexWrap: "wrap",
  },
  pillLink: {
    display: "inline-block",
    borderRadius: 9999,
    textDecoration: "none",
    fontSize: typography.fontSize.sm,
    padding: "0.4rem 0.85rem",
    background: colors.surface.base,
    border: `1px solid ${colors.border.strong}`,
    color: colors.brand.navy,
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
  title: { ko: "교수진, 구성원, 동문", en: "PI, Members, and Alumni" },
  pi: { ko: "책임교수", en: "Principal Investigator" },
  current: { ko: "현재 구성원", en: "Current Members" },
  alumni: { ko: "동문", en: "Alumni" },
  email: { ko: "이메일", en: "Email" },
  scholar: { ko: "Google Scholar", en: "Google Scholar" },
  source: { ko: "원본 멤버 페이지", en: "Legacy Members Page" },
};

export default function MembersPage() {
  const { t } = useLanguage();
  const { pi, current, alumni } = membersData;

  return (
    <section style={styles.section}>
      <div style={styles.eyebrow}>{t(copy.eyebrow)}</div>
      <h1 style={styles.title}>{t(copy.title)}</h1>

      <article style={styles.piCard}>
        <h2 style={styles.heading}>{t(copy.pi)}</h2>
        <h3 style={styles.piName}>{t(pi.name)}</h3>
        <p style={styles.piTitle}>{t(pi.title)}</p>
        <p style={styles.piBio}>{t(pi.bio)}</p>
        <div style={styles.linkRow}>
          <a href={`mailto:${pi.email}`} style={styles.pillLink}>
            {t(copy.email)}: {pi.email}
          </a>
          <a href={pi.scholarUrl} target="_blank" rel="noreferrer" style={styles.pillLink}>
            {t(copy.scholar)}
          </a>
        </div>
      </article>

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
        <a href={membersData.source.membersPage} target="_blank" rel="noreferrer" style={styles.sourceLink}>
          {t(copy.source)}
        </a>
      </div>
    </section>
  );
}

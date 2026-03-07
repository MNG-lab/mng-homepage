import { Link } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";
import { membersData } from "../content/members-data";
import { ROUTES } from "../config/site-routes";
import { useLanguage } from "../context/LanguageContext";
import { useViewport } from "../hooks/useViewport";
import { resolveContentImageSrc } from "../utils/resolve-content-image-src";

const MEMBER_PHOTO_WIDTH = 120;
const CURRENT_ORDER_KO = ["제수연", "김수정", "황보고은", "한연수", "김서영", "임현진", "남이진", "이준서"];
const ALUMNI_ORDER_KO = [
  "문희정",
  "이정휘",
  "이수진",
  "이경혜",
  "이윤지",
  "이한규",
  "정주현",
  "박주은",
  "박지현",
  "송지은",
  "오신애",
  "박시현",
  "전지연",
  "이경민",
  "김연경",
  "윤혜린",
];

function sortMembersByKoreanName(members, orderedNames) {
  const order = new Map(orderedNames.map((name, index) => [name, index]));
  return [...members].sort((a, b) => {
    const aOrder = order.get(a?.name?.ko);
    const bOrder = order.get(b?.name?.ko);
    if (aOrder == null && bOrder == null) return 0;
    if (aOrder == null) return 1;
    if (bOrder == null) return -1;
    return aOrder - bOrder;
  });
}

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
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: spacing[4],
  },
  memberCard: {
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 0,
    overflow: "hidden",
    padding: 0,
    display: "grid",
    gridTemplateColumns: `${MEMBER_PHOTO_WIDTH}px minmax(0, 1fr)`,
    alignItems: "start",
    columnGap: 0,
    rowGap: 0,
  },
  photoWrap: {
    borderRadius: 0,
    overflow: "hidden",
    width: `${MEMBER_PHOTO_WIDTH}px`,
    height: "100%",
    alignSelf: "stretch",
    background: colors.surface.subtle,
  },
  memberInfo: {
    padding: spacing[4],
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: spacing[1],
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
    fontSize: typography.fontSize.xl,
    lineHeight: typography.lineHeight.snug,
    color: colors.text.primary,
    overflowWrap: "anywhere",
  },
  meta: {
    margin: 0,
    color: colors.brand.accent,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
    overflowWrap: "anywhere",
  },
  desc: {
    margin: 0,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
    fontSize: typography.fontSize.xs,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
};

const copy = {
  eyebrow: { ko: "구성원", en: "Members" },
  title: { ko: "현재 구성원 및 동문", en: "Current Members and Alumni" },
  professorLink: { ko: "교수 상세 보기", en: "View Professor Profile" },
  current: { ko: "현재 구성원", en: "Current Members" },
  alumni: { ko: "동문", en: "Alumni" },
};

export default function MembersPage() {
  const { t } = useLanguage();
  const { isMobile } = useViewport();
  const { current, alumni } = membersData;
  const orderedCurrent = sortMembersByKoreanName(current, CURRENT_ORDER_KO);
  const orderedAlumni = sortMembersByKoreanName(alumni, ALUMNI_ORDER_KO);
  const gridStyle = isMobile
    ? { ...styles.grid, gridTemplateColumns: "minmax(0, 1fr)" }
    : styles.grid;

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
      <div style={gridStyle}>
        {orderedCurrent.map((member) => (
          <article key={member.id} style={styles.memberCard}>
            {member.photo ? (
              <div style={styles.photoWrap}>
                <img
                  src={resolveContentImageSrc(member.photo)}
                  alt={t(member.name)}
                  style={styles.photo}
                  loading="lazy"
                />
              </div>
            ) : null}
            <div style={styles.memberInfo}>
              {member.role ? <p style={styles.meta}>{t(member.role)}</p> : null}
              <h3 style={styles.memberName}>{t(member.name)}</h3>
              {member.email ? <p style={styles.desc}>{member.email}</p> : null}
            </div>
          </article>
        ))}
      </div>

      <h2 style={styles.heading}>{t(copy.alumni)}</h2>
      <div style={gridStyle}>
        {orderedAlumni.map((member) => (
          <article key={member.id} style={styles.memberCard}>
            {member.photo ? (
              <div style={styles.photoWrap}>
                <img
                  src={resolveContentImageSrc(member.photo)}
                  alt={t(member.name)}
                  style={styles.photo}
                  loading="lazy"
                />
              </div>
            ) : null}
            <div style={styles.memberInfo}>
              <p style={styles.meta}>{member.period}</p>
              <h3 style={styles.memberName}>{t(member.name)}</h3>
              {member.email ? <p style={styles.desc}>{member.email}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

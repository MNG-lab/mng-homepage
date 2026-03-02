import { Link } from "react-router-dom";
import { colors, spacing, typography } from "../design-tokens";
import { contactData } from "../content/contact-data";
import { useLanguage } from "../context/LanguageContext";

const styles = {
  section: {
    maxWidth: 980,
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: spacing[4],
  },
  card: {
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 12,
    padding: spacing[5],
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: spacing[2],
    fontFamily: typography.fontFamily.serif,
    color: colors.brand.navy,
    fontSize: typography.fontSize.lg,
  },
  cardBody: {
    margin: 0,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
    fontSize: typography.fontSize.sm,
  },
  links: {
    marginTop: spacing[6],
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 12,
    padding: spacing[5],
    display: "grid",
    gap: spacing[3],
  },
  quickLink: {
    textDecoration: "none",
    color: colors.brand.accent,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
};

const copy = {
  eyebrow: { ko: "연락처", en: "Contact" },
  title: { ko: "연락 및 방문 안내", en: "Contact and Visit" },
};

export default function ContactPage() {
  const { t } = useLanguage();

  return (
    <section style={styles.section}>
      <div style={styles.eyebrow}>{t(copy.eyebrow)}</div>
      <h1 style={styles.title}>{t(copy.title)}</h1>

      <div style={styles.grid}>
        <article style={styles.card}>
          <h2 style={styles.cardTitle}>{t(contactData.locationTitle)}</h2>
          <p style={styles.cardBody}>{t(contactData.address)}</p>
          <p style={{ ...styles.cardBody, marginTop: spacing[2] }}>{t(contactData.altAddress)}</p>
        </article>
        <article style={styles.card}>
          <h2 style={styles.cardTitle}>{t(contactData.emailTitle)}</h2>
          <p style={styles.cardBody}>{contactData.email}</p>
        </article>
        <article style={styles.card}>
          <h2 style={styles.cardTitle}>{t(contactData.phoneTitle)}</h2>
          {contactData.phones.map((phone) => (
            <p key={phone.value} style={styles.cardBody}>
              {t(phone.label)}: {phone.value}
            </p>
          ))}
        </article>
        <article style={styles.card}>
          <h2 style={styles.cardTitle}>{t(contactData.officeHoursTitle)}</h2>
          <p style={styles.cardBody}>{t(contactData.officeHours)}</p>
        </article>
      </div>

      <article style={styles.links}>
        <h2 style={styles.cardTitle}>{t(contactData.linksTitle)}</h2>
        {contactData.links.map((item) => {
          const isInternal = item.url.startsWith("/");
          if (isInternal) {
            return (
              <Link key={item.url} to={item.url} style={styles.quickLink}>
                {t(item.label)}
              </Link>
            );
          }

          return (
            <a key={item.url} href={item.url} target="_blank" rel="noreferrer" style={styles.quickLink}>
              {t(item.label)}
            </a>
          );
        })}
      </article>
    </section>
  );
}

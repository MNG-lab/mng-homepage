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
  card: {
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 12,
    padding: spacing[5],
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: spacing[3],
    fontFamily: typography.fontFamily.serif,
    color: colors.brand.navy,
    fontSize: typography.fontSize.lg,
  },
  body: {
    margin: 0,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
  },
  mapFrame: {
    width: "100%",
    border: 0,
    borderRadius: 10,
    minHeight: 320,
  },
  transitTitle: {
    marginTop: spacing[4],
    marginBottom: spacing[2],
    color: colors.brand.navy,
    fontFamily: typography.fontFamily.serif,
    fontSize: typography.fontSize.md,
  },
  transitList: {
    margin: 0,
    paddingLeft: spacing[5],
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.relaxed,
    fontSize: typography.fontSize.sm,
  },
  coloredText: {
    fontWeight: typography.fontWeight.semibold,
  },
  infoCard: {
    marginTop: spacing[5],
    background: colors.surface.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 12,
    padding: spacing[5],
  },
  infoRow: {
    marginTop: spacing[2],
  },
  label: {
    color: colors.brand.navy,
    fontWeight: typography.fontWeight.semibold,
  },
  linkText: {
    color: colors.brand.accent,
    textDecoration: "none",
    fontWeight: typography.fontWeight.semibold,
  },
  linksWrap: {
    marginTop: spacing[5],
    display: "flex",
    flexWrap: "wrap",
    gap: spacing[3],
  },
  pillLink: {
    display: "inline-block",
    textDecoration: "none",
    color: colors.brand.accent,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    border: `1px solid ${colors.border.strong}`,
    background: colors.surface.base,
    borderRadius: 9999,
    padding: "0.4rem 0.85rem",
  },
};

const copy = {
  eyebrow: { ko: "연락처", en: "Contact" },
  title: { ko: "연락 및 방문 안내", en: "Contact and Visit" },
  infoTitle: { ko: "연구실 정보", en: "Lab Information" },
};

export default function ContactPage() {
  const { language, t } = useLanguage();

  return (
    <section style={styles.section} aria-labelledby="contact-title">
      <div style={styles.eyebrow}>{t(copy.eyebrow)}</div>
      <h1 id="contact-title" style={styles.title}>
        {t(copy.title)}
      </h1>

      <article style={styles.card}>
        <h2 style={styles.cardTitle}>{t(contactData.mapTitle)}</h2>
        <iframe
          title={t(contactData.mapTitle)}
          src={contactData.mapEmbedUrl}
          style={styles.mapFrame}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        <h3 style={styles.transitTitle}>{t(contactData.transitTitle)}</h3>
        <ul style={styles.transitList}>
          {contactData.transit.map((item) => {
            if (item.line) {
              return (
                <li key={item.mode.en}>
                  <strong>{t(item.mode)}:</strong>{" "}
                  <span style={{ ...styles.coloredText, color: item.lineColor }}>{t(item.line)}</span> {t(item.detail)}
                </li>
              );
            }

            return (
              <li key={item.mode.en}>
                <strong>{t(item.mode)}:</strong>
                <ul style={{ ...styles.transitList, marginTop: spacing[1] }}>
                  {item.groups.map((group) => (
                    <li key={group.label.en}>
                      <span style={{ ...styles.coloredText, color: group.color }}>{t(group.label)}:</span> {group.routes}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </article>

      <article style={styles.infoCard}>
        <h2 style={styles.cardTitle}>{t(copy.infoTitle)}</h2>
        <p style={styles.body}>
          <span style={styles.label}>{t(contactData.locationTitle)}:</span> {t(contactData.address)}
        </p>
        <p style={{ ...styles.body, ...styles.infoRow }}>{t(contactData.altAddress)}</p>
        <p style={{ ...styles.body, ...styles.infoRow }}>
          <span style={styles.label}>{t(contactData.emailTitle)}:</span>{" "}
          <a href={`mailto:${contactData.email}`} style={styles.linkText}>
            {contactData.email}
          </a>
        </p>
        <p style={{ ...styles.body, ...styles.infoRow }}>
          <span style={styles.label}>{t(contactData.phoneTitle)}:</span>{" "}
          {contactData.phones.map((phone, index) => (
            <span key={phone.value}>
              {index > 0 ? " / " : ""}
              {t(phone.label)}{" "}
              <a href={`tel:${phone.value.replace(/[^+\d]/g, "")}`} style={styles.linkText}>
                {phone.value}
              </a>
            </span>
          ))}
        </p>
        <p style={{ ...styles.body, ...styles.infoRow }}>
          <span style={styles.label}>{t(contactData.officeHoursTitle)}:</span> {t(contactData.officeHours)}
        </p>

        <div style={styles.linksWrap}>
          {contactData.links.map((item) => {
            const isInternal = item.url.startsWith("/");
            if (isInternal) {
              return (
                <Link key={item.url} to={item.url} style={styles.pillLink}>
                  {t(item.label)}
                </Link>
              );
            }
            return (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                style={styles.pillLink}
                aria-label={`${t(item.label)}${language === "ko" ? " (새 탭)" : " (new tab)"}`}
              >
                {t(item.label)}
              </a>
            );
          })}
        </div>
      </article>
    </section>
  );
}

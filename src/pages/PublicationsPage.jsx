import PageTemplate from "../components/PageTemplate";
import { ROUTES } from "../config/site-routes";
import { pageContent } from "../content/page-content";
import { useLanguage } from "../context/LanguageContext";

export default function PublicationsPage() {
  const { t } = useLanguage();
  const content = pageContent.publications;

  return (
    <PageTemplate
      eyebrow={t(content.eyebrow)}
      title={t(content.title)}
      description={t(content.description)}
      bullets={content.bullets.map((item) => t(item))}
      scopeTitle={t(pageContent.common.inScope)}
      primaryCta={{ to: ROUTES.research, label: t(content.primaryCta) }}
      secondaryCta={{ to: ROUTES.home, label: t(content.secondaryCta) }}
    />
  );
}

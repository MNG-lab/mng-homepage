import PageTemplate from "../components/PageTemplate";
import { ROUTES } from "../config/site-routes";
import { pageContent } from "../content/page-content";
import { useLanguage } from "../context/LanguageContext";

export default function ResearchPage() {
  const { t } = useLanguage();
  const content = pageContent.research;

  return (
    <PageTemplate
      eyebrow={t(content.eyebrow)}
      title={t(content.title)}
      description={t(content.description)}
      bullets={content.bullets.map((item) => t(item))}
      scopeTitle={t(pageContent.common.inScope)}
      primaryCta={{ to: ROUTES.publications, label: t(content.primaryCta) }}
      secondaryCta={{ to: `${ROUTES.home}#research-summary`, label: t(content.secondaryCta) }}
    />
  );
}

import PageTemplate from "../components/PageTemplate";
import { ROUTES } from "../config/site-routes";

export default function ResearchPage() {
  return (
    <PageTemplate
      eyebrow="Research"
      title="Research Programs"
      description="This page is the template baseline for Research 1/2/3 details and can be expanded using structured data files."
      bullets={[
        "Cilia biology and rare genetic disease",
        "Obesity and metabolic regulation",
        "Liver fibrosis and aging",
      ]}
      primaryCta={{ to: ROUTES.publications, label: "View Publications" }}
      secondaryCta={{ to: `${ROUTES.home}#research-summary`, label: "Back to Home Summary" }}
    />
  );
}

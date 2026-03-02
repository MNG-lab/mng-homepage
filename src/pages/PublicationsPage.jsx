import PageTemplate from "../components/PageTemplate";
import { ROUTES } from "../config/site-routes";

export default function PublicationsPage() {
  return (
    <PageTemplate
      eyebrow="Publications"
      title="Publication Archive"
      description="The publication template is structured for year, tags, filtering, and pagination in the next phase."
      bullets={[
        "Year-based grouping",
        "Theme filters",
        "Featured publication section",
      ]}
      primaryCta={{ to: ROUTES.research, label: "Research Areas" }}
      secondaryCta={{ to: ROUTES.home, label: "Back Home" }}
    />
  );
}

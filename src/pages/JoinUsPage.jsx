import PageTemplate from "../components/PageTemplate";
import { ROUTES } from "../config/site-routes";

export default function JoinUsPage() {
  return (
    <PageTemplate
      eyebrow="Join Us"
      title="Recruitment"
      description="This page is the operational entry point for open positions, eligibility, and application flow."
      bullets={[
        "Open position summary",
        "Eligibility and required documents",
        "Application process and FAQ",
      ]}
      primaryCta={{ to: ROUTES.contact, label: "Contact PI" }}
      secondaryCta={{ to: ROUTES.home, label: "Back Home" }}
    />
  );
}

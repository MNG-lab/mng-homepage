import PageTemplate from "../components/PageTemplate";
import { ROUTES } from "../config/site-routes";

export default function MembersPage() {
  return (
    <PageTemplate
      eyebrow="Members"
      title="Members and Alumni"
      description="This template is ready to render PI, current members, and alumni sections from external content files."
      bullets={[
        "PI profile block",
        "Current members grouped by role",
        "Alumni list with current affiliation",
      ]}
      primaryCta={{ to: ROUTES.contact, label: "Contact the Lab" }}
      secondaryCta={{ to: ROUTES.home, label: "Back Home" }}
    />
  );
}

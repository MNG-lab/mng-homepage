import PageTemplate from "../components/PageTemplate";
import { ROUTES } from "../config/site-routes";

export default function ContactPage() {
  return (
    <PageTemplate
      eyebrow="Contact"
      title="Contact"
      description="Contact details, map embed, and external links will be sourced from `content/contact.json` in migration phase."
      bullets={[
        "Address and phone",
        "Email and external links",
        "Map embed placeholder",
      ]}
      primaryCta={{ to: ROUTES.join, label: "Open Positions" }}
      secondaryCta={{ to: ROUTES.home, label: "Back Home" }}
    />
  );
}

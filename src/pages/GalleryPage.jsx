import PageTemplate from "../components/PageTemplate";
import { ROUTES } from "../config/site-routes";

export default function GalleryPage() {
  return (
    <PageTemplate
      eyebrow="Gallery"
      title="Gallery and Events"
      description="The gallery template is prepared for category and year grouping with data-driven rendering."
      bullets={[
        "Event categories",
        "Year collections",
        "Accessible image captions",
      ]}
      primaryCta={{ to: ROUTES.join, label: "Join Us" }}
      secondaryCta={{ to: ROUTES.home, label: "Back Home" }}
    />
  );
}

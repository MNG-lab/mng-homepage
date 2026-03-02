import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import SiteLayout from "./layout/SiteLayout";
import { ROUTES } from "./config/site-routes";
import HomePage from "./pages/HomePage";
import ResearchPage from "./pages/ResearchPage";
import ResearchDetailPage from "./pages/ResearchDetailPage";
import MembersPage from "./pages/MembersPage";
import PublicationsPage from "./pages/PublicationsPage";
import GalleryPage from "./pages/GalleryPage";
import ContactPage from "./pages/ContactPage";
import JoinUsPage from "./pages/JoinUsPage";
import NotFoundPage from "./pages/NotFoundPage";

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const sectionId = location.hash.replace("#", "");
      const node = document.getElementById(sectionId);
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname, location.hash]);

  return null;
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route path="/publications/publications" element={<Navigate to={ROUTES.publications} replace />} />

        <Route element={<SiteLayout />}>
          <Route path={ROUTES.home} element={<HomePage />} />
          <Route path={ROUTES.research} element={<ResearchPage />} />
          <Route path={ROUTES.researchDetail} element={<ResearchDetailPage />} />
          <Route path={ROUTES.members} element={<MembersPage />} />
          <Route path={ROUTES.publications} element={<PublicationsPage />} />
          <Route path={ROUTES.gallery} element={<GalleryPage />} />
          <Route path={ROUTES.contact} element={<ContactPage />} />
          <Route path={ROUTES.join} element={<JoinUsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}

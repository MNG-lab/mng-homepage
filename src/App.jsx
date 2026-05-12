import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { LEGACY_ROUTE_REDIRECTS, ROUTES } from "./config/site-routes";
import SeoManager from "./components/SeoManager";
import SiteLayout from "./layout/SiteLayout";
import HomePage from "./pages/HomePage";
import ResearchPage from "./pages/ResearchPage";
import ResearchDetailPage from "./pages/ResearchDetailPage";
import ProfessorPage from "./pages/ProfessorPage";
import MembersPage from "./pages/MembersPage";
import PublicationsPage from "./pages/PublicationsPage";
import GalleryPage from "./pages/GalleryPage";
import ContactPage from "./pages/ContactPage";
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
      <SeoManager />
      <ScrollManager />
      <Routes>
        {LEGACY_ROUTE_REDIRECTS.map((route) => (
          <Route key={route.from} path={route.from} element={<Navigate to={route.to} replace />} />
        ))}

        <Route element={<SiteLayout />}>
          <Route path={ROUTES.home} element={<HomePage />} />
          <Route path={ROUTES.research} element={<ResearchPage />} />
          <Route path={ROUTES.researchDetail} element={<ResearchDetailPage />} />
          <Route path={ROUTES.professor} element={<ProfessorPage />} />
          <Route path={ROUTES.members} element={<MembersPage />} />
          <Route path={ROUTES.publications} element={<PublicationsPage />} />
          <Route path={ROUTES.gallery} element={<GalleryPage />} />
          <Route path={ROUTES.contact} element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}

import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ROUTES } from "./config/site-routes";
import SeoManager from "./components/SeoManager";

const SiteLayout = lazy(() => import("./layout/SiteLayout"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ResearchPage = lazy(() => import("./pages/ResearchPage"));
const ResearchDetailPage = lazy(() => import("./pages/ResearchDetailPage"));
const ProfessorPage = lazy(() => import("./pages/ProfessorPage"));
const MembersPage = lazy(() => import("./pages/MembersPage"));
const PublicationsPage = lazy(() => import("./pages/PublicationsPage"));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const JoinUsPage = lazy(() => import("./pages/JoinUsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

const loadingStyles = {
  minHeight: "32vh",
  display: "grid",
  placeItems: "center",
  fontSize: "0.95rem",
  color: "#3D3D3D",
};

function RouteFallback() {
  return (
    <div role="status" aria-live="polite" style={loadingStyles}>
      Loading page...
    </div>
  );
}

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
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/publications/publications" element={<Navigate to={ROUTES.publications} replace />} />

          <Route element={<SiteLayout />}>
            <Route path={ROUTES.home} element={<HomePage />} />
            <Route path={ROUTES.research} element={<ResearchPage />} />
            <Route path={ROUTES.researchDetail} element={<ResearchDetailPage />} />
            <Route path={ROUTES.professor} element={<ProfessorPage />} />
            <Route path={ROUTES.members} element={<MembersPage />} />
            <Route path={ROUTES.publications} element={<PublicationsPage />} />
            <Route path={ROUTES.gallery} element={<GalleryPage />} />
            <Route path={ROUTES.contact} element={<ContactPage />} />
            <Route path={ROUTES.join} element={<JoinUsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

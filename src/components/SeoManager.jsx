import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ROUTES } from "../config/site-routes";
import { PAGE_SEO, SITE_NAME, SITE_URL } from "../config/site-metadata";
import { useLanguage } from "../context/LanguageContext";

function upsertMetaByName(name, content) {
  if (!content) return;
  let tag = document.head.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertMetaByProperty(property, content) {
  if (!content) return;
  let tag = document.head.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertCanonical(href) {
  let tag = document.head.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

function resolveSeoKey(pathname) {
  if (pathname === ROUTES.home) return "home";
  if (pathname === ROUTES.research) return "research";
  if (pathname.startsWith("/research/")) return "researchDetail";
  if (pathname === ROUTES.professor) return "professor";
  if (pathname === ROUTES.members) return "members";
  if (pathname === ROUTES.publications || pathname === "/publications/publications") return "publications";
  if (pathname === ROUTES.gallery) return "gallery";
  if (pathname === ROUTES.contact) return "contact";
  if (pathname === ROUTES.join) return "join";
  return "notFound";
}

export default function SeoManager() {
  const location = useLocation();
  const { language } = useLanguage();

  useEffect(() => {
    const seoKey = resolveSeoKey(location.pathname);
    const localized = PAGE_SEO[seoKey]?.[language] ?? PAGE_SEO.home.en;

    const normalizedBaseUrl = SITE_URL.replace(/\/+$/, "");
    const normalizedPath = location.pathname === "/" ? "" : location.pathname;
    const canonicalUrl = `${normalizedBaseUrl}${normalizedPath}`;

    document.title = localized.title;
    document.documentElement.lang = language;

    upsertMetaByName("description", localized.description);
    upsertMetaByName("keywords", localized.keywords);
    upsertMetaByName("robots", "index,follow");
    upsertMetaByName("twitter:card", "summary");
    upsertMetaByName("twitter:title", localized.title);
    upsertMetaByName("twitter:description", localized.description);

    upsertMetaByProperty("og:type", "website");
    upsertMetaByProperty("og:locale", language === "ko" ? "ko_KR" : "en_US");
    upsertMetaByProperty("og:site_name", SITE_NAME[language]);
    upsertMetaByProperty("og:title", localized.title);
    upsertMetaByProperty("og:description", localized.description);
    upsertMetaByProperty("og:url", canonicalUrl);

    upsertCanonical(canonicalUrl);
  }, [language, location.pathname]);

  return null;
}

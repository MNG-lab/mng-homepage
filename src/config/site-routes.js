export const ROUTES = {
  home: "/",
  research: "/research",
  researchDetail: "/research/:slug",
  professor: "/professor",
  members: "/members",
  publications: "/publications",
  gallery: "/gallery",
  contact: "/contact",
  join: "/join-us",
};

export function getResearchDetailPath(slug) {
  return `/research/${slug}`;
}

export const LEGACY_ROUTE_REDIRECTS = [
  { from: "/publications/publications", to: ROUTES.publications },
  { from: "/publications/publications/", to: ROUTES.publications },
  { from: "/aitem-1", to: ROUTES.publications },
  { from: "/research-1", to: getResearchDetailPath("research-1") },
  { from: "/research-1/", to: getResearchDetailPath("research-1") },
  { from: "/research-2", to: getResearchDetailPath("research-2") },
  { from: "/research-2/", to: getResearchDetailPath("research-2") },
  { from: "/research-3", to: getResearchDetailPath("research-3") },
  { from: "/research-3/", to: getResearchDetailPath("research-3") },
  { from: "/2023-1", to: `${ROUTES.gallery}?year=2023&category=Year%20Archive` },
  { from: "/2024", to: `${ROUTES.gallery}?year=2024&category=Year%20Archive` },
  { from: "/%EC%99%80%EA%B8%80%EC%99%80%EA%B8%80", to: `${ROUTES.gallery}?category=Lab%20Life` },
  { from: "/와글와글", to: `${ROUTES.gallery}?category=Lab%20Life` },
  { from: "/news", to: `${ROUTES.home}#news` },
];

export const PRIMARY_NAV_ITEMS = [
  { key: "home", path: ROUTES.home },
  { key: "research", path: ROUTES.research },
  { key: "professor", path: ROUTES.professor },
  { key: "members", path: ROUTES.members },
  { key: "publications", path: ROUTES.publications },
  { key: "gallery", path: ROUTES.gallery },
  { key: "contact", path: ROUTES.contact },
  { key: "join", path: ROUTES.join },
];

export const HOME_ANCHOR_ITEMS = [
  { key: "about", path: `${ROUTES.home}#about` },
  { key: "research-summary", path: `${ROUTES.home}#research-summary` },
  { key: "news", path: `${ROUTES.home}#news` },
  { key: "join", path: `${ROUTES.home}#join` },
];

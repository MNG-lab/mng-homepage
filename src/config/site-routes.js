export const ROUTES = {
  home: "/",
  research: "/research",
  researchDetail: "/research/:slug",
  members: "/members",
  publications: "/publications",
  gallery: "/gallery",
  contact: "/contact",
  join: "/join-us",
};

export function getResearchDetailPath(slug) {
  return `/research/${slug}`;
}

export const PRIMARY_NAV_ITEMS = [
  { key: "home", path: ROUTES.home },
  { key: "research", path: ROUTES.research },
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

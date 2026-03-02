export const ROUTES = {
  home: "/",
  research: "/research",
  members: "/members",
  publications: "/publications",
  gallery: "/gallery",
  contact: "/contact",
  join: "/join-us",
};

export const PRIMARY_NAV_ITEMS = [
  { key: "home", label: "Home", path: ROUTES.home },
  { key: "research", label: "Research", path: ROUTES.research },
  { key: "members", label: "Members", path: ROUTES.members },
  { key: "publications", label: "Publications", path: ROUTES.publications },
  { key: "gallery", label: "Gallery", path: ROUTES.gallery },
  { key: "contact", label: "Contact", path: ROUTES.contact },
  { key: "join", label: "Join Us", path: ROUTES.join },
];

export const HOME_ANCHOR_ITEMS = [
  { key: "about", label: "About", path: `${ROUTES.home}#about` },
  { key: "research-summary", label: "Research Summary", path: `${ROUTES.home}#research-summary` },
  { key: "news", label: "News", path: `${ROUTES.home}#news` },
  { key: "join", label: "Join", path: `${ROUTES.home}#join` },
];

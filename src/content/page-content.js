export const pageContent = {
  common: {
    inScope: { ko: "포함 범위", en: "In Scope" },
  },
  research: {
    eyebrow: { ko: "연구", en: "Research" },
    title: { ko: "연구 프로그램", en: "Research Programs" },
    description: {
      ko: "Research 1/2/3 상세 페이지 확장을 위한 템플릿 베이스입니다.",
      en: "This page is the template baseline for Research 1/2/3 details.",
    },
    bullets: [
      { ko: "섬모 생물학과 희귀 유전질환", en: "Cilia biology and rare genetic disease" },
      { ko: "비만과 대사 조절", en: "Obesity and metabolic regulation" },
      { ko: "간섬유화와 노화", en: "Liver fibrosis and aging" },
    ],
    primaryCta: { ko: "논문 보기", en: "View Publications" },
    secondaryCta: { ko: "홈 요약으로", en: "Back to Home Summary" },
  },
  members: {
    eyebrow: { ko: "구성원", en: "Members" },
    title: { ko: "구성원 및 동문", en: "Members and Alumni" },
    description: {
      ko: "PI, 재학생, 동문 구성을 데이터 파일로 렌더링하기 위한 템플릿입니다.",
      en: "This template is ready to render PI, current members, and alumni from external content files.",
    },
    bullets: [
      { ko: "PI 프로필", en: "PI profile block" },
      { ko: "역할별 재학생 목록", en: "Current members grouped by role" },
      { ko: "동문 및 진로", en: "Alumni list with current affiliation" },
    ],
    primaryCta: { ko: "연락하기", en: "Contact the Lab" },
    secondaryCta: { ko: "홈으로", en: "Back Home" },
  },
  publications: {
    eyebrow: { ko: "논문", en: "Publications" },
    title: { ko: "논문 아카이브", en: "Publication Archive" },
    description: {
      ko: "연도/태그/필터/페이지네이션을 위한 구조를 다음 단계에서 확장합니다.",
      en: "The publication template is structured for year, tags, filtering, and pagination in the next phase.",
    },
    bullets: [
      { ko: "연도별 그룹", en: "Year-based grouping" },
      { ko: "테마 필터", en: "Theme filters" },
      { ko: "주요 논문 섹션", en: "Featured publication section" },
    ],
    primaryCta: { ko: "연구 분야", en: "Research Areas" },
    secondaryCta: { ko: "홈으로", en: "Back Home" },
  },
  gallery: {
    eyebrow: { ko: "갤러리", en: "Gallery" },
    title: { ko: "갤러리 및 이벤트", en: "Gallery and Events" },
    description: {
      ko: "연도/카테고리 기반 데이터 렌더링을 위한 템플릿입니다.",
      en: "The gallery template is prepared for category and year grouping with data-driven rendering.",
    },
    bullets: [
      { ko: "이벤트 카테고리", en: "Event categories" },
      { ko: "연도별 모음", en: "Year collections" },
      { ko: "접근 가능한 캡션", en: "Accessible image captions" },
    ],
    primaryCta: { ko: "지원 페이지", en: "Join Us" },
    secondaryCta: { ko: "홈으로", en: "Back Home" },
  },
  contact: {
    eyebrow: { ko: "연락처", en: "Contact" },
    title: { ko: "연락처", en: "Contact" },
    description: {
      ko: "주소, 지도, 외부 링크는 `content/contact.json` 기반으로 연결될 예정입니다.",
      en: "Contact details, map embed, and external links will be sourced from `content/contact.json` in migration phase.",
    },
    bullets: [
      { ko: "주소와 전화", en: "Address and phone" },
      { ko: "이메일과 링크", en: "Email and external links" },
      { ko: "지도 임베드", en: "Map embed placeholder" },
    ],
    primaryCta: { ko: "모집 보기", en: "Open Positions" },
    secondaryCta: { ko: "홈으로", en: "Back Home" },
  },
  join: {
    eyebrow: { ko: "지원", en: "Join Us" },
    title: { ko: "연구실 모집", en: "Recruitment" },
    description: {
      ko: "모집 공고, 자격 요건, 지원 절차를 운영하는 핵심 페이지입니다.",
      en: "This page is the operational entry point for open positions, eligibility, and application flow.",
    },
    bullets: [
      { ko: "모집 포지션 요약", en: "Open position summary" },
      { ko: "자격 및 제출 서류", en: "Eligibility and required documents" },
      { ko: "지원 절차와 FAQ", en: "Application process and FAQ" },
    ],
    primaryCta: { ko: "PI에게 연락", en: "Contact PI" },
    secondaryCta: { ko: "홈으로", en: "Back Home" },
  },
  notFound: {
    code: "404",
    title: { ko: "페이지를 찾을 수 없습니다", en: "Page Not Found" },
    description: {
      ko: "요청한 URL은 신규 라우트 맵에 존재하지 않습니다.",
      en: "The requested URL does not exist in the new route map.",
    },
    cta: { ko: "홈으로 이동", en: "Go Home" },
  },
};

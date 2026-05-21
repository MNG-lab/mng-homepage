const DEFAULT_SITE_URL = "https://www.dglab.yonsei.ac.kr";
const RAW_SITE_URL = import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL;

function normalizeSiteUrl(url) {
  return String(url || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

export const SITE_URL = normalizeSiteUrl(RAW_SITE_URL);

export const SITE_NAME = {
  ko: "MNG Lab | 연세대학교",
  en: "MNG Lab | Yonsei University",
};

export const PAGE_SEO = {
  home: {
    ko: {
      title: "MNG Lab | 연세대학교",
      description: "MNG Lab은 연세대학교 생화학과에서 희귀 유전질환, 비만, 대사질환, 노화 관련 질환 진행을 연구하는 대사 및 유전질환 연구실입니다.",
      keywords: "MNG Lab, Metabolic and Genetic disorders Lab, 연세대학교, 생화학과, 희귀 유전질환, 비만, 대사질환, 노화",
    },
    en: {
      title: "MNG Lab | Yonsei University",
      description: "MNG Lab is the Metabolic and Genetic disorders Lab at Yonsei University, studying rare genetic diseases, obesity, metabolic disorders, and age-related disease progression.",
      keywords: "MNG Lab, Metabolic and Genetic disorders Lab, Yonsei University, Biochemistry, Rare Genetic Disease, Obesity, Metabolic Disease, Aging",
    },
  },
  research: {
    ko: {
      title: "Research | MNG Lab",
      description: "MNG Lab의 연구 분야와 프로젝트를 확인할 수 있습니다.",
      keywords: "MNG Lab 연구, 연구 분야, 프로젝트, 데이터 분석, 최적화",
    },
    en: {
      title: "Research | MNG Lab",
      description: "Explore MNG Lab research domains and ongoing projects.",
      keywords: "MNG Lab Research, Research Areas, Projects, Analytics, Optimization",
    },
  },
  researchDetail: {
    ko: {
      title: "Research Detail | MNG Lab",
      description: "MNG Lab의 세부 연구 주제를 소개합니다.",
      keywords: "세부 연구, 연구 주제, MNG Lab",
    },
    en: {
      title: "Research Detail | MNG Lab",
      description: "Detailed research topics from MNG Lab.",
      keywords: "Research Topic, Research Detail, MNG Lab",
    },
  },
  professor: {
    ko: {
      title: "Professor | MNG Lab",
      description: "MNG Lab 책임교수 소개와 연구 방향을 안내합니다.",
      keywords: "MNG Lab Professor, MNG Lab PI, 고혁완, Hyuk Wan Ko",
    },
    en: {
      title: "Professor | MNG Lab",
      description: "Professor profile and research direction of MNG Lab.",
      keywords: "MNG Lab Professor, MNG Lab PI, Hyuk Wan Ko",
    },
  },
  members: {
    ko: {
      title: "Members | MNG Lab",
      description: "MNG Lab 교수진, 학생, 졸업생 구성원을 소개합니다.",
      keywords: "MNG Lab 구성원, 교수, 학생, 졸업생",
    },
    en: {
      title: "Members | MNG Lab",
      description: "Meet MNG Lab faculty, students, and alumni.",
      keywords: "MNG Lab Members, Faculty, Students, Alumni",
    },
  },
  publications: {
    ko: {
      title: "Publications | MNG Lab",
      description: "MNG Lab의 최신 논문과 연구 성과를 제공합니다.",
      keywords: "MNG Lab 논문, Publications, 저널, 학회",
    },
    en: {
      title: "Publications | MNG Lab",
      description: "Browse MNG Lab publications and research outputs.",
      keywords: "MNG Lab Publications, Journals, Conferences, Research Output",
    },
  },
  gallery: {
    ko: {
      title: "Gallery | MNG Lab",
      description: "MNG Lab의 행사 및 연구 활동 사진을 확인할 수 있습니다.",
      keywords: "MNG Lab Gallery, 행사 사진, 연구실 활동",
    },
    en: {
      title: "Gallery | MNG Lab",
      description: "See event and activity photos from MNG Lab.",
      keywords: "MNG Lab Gallery, Events, Lab Activities",
    },
  },
  contact: {
    ko: {
      title: "Contact | MNG Lab",
      description: "MNG Lab 연락처 및 방문 정보를 안내합니다.",
      keywords: "MNG Lab 연락처, 위치, 문의",
    },
    en: {
      title: "Contact | MNG Lab",
      description: "Contact information and directions for MNG Lab.",
      keywords: "MNG Lab Contact, Location, Inquiry",
    },
  },
  notFound: {
    ko: {
      title: "페이지를 찾을 수 없습니다 | MNG Lab",
      description: "요청하신 페이지를 찾을 수 없습니다.",
      keywords: "404, 페이지 없음, MNG Lab",
    },
    en: {
      title: "Page Not Found | MNG Lab",
      description: "The requested page could not be found.",
      keywords: "404, Page Not Found, MNG Lab",
    },
  },
};

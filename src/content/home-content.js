export const homeContent = {
  hero: {
    kicker: {
      ko: "Molecular NeuroGenetics Lab",
      en: "Molecular NeuroGenetics Lab",
    },
    ctaPrimary: {
      ko: "연구 보기",
      en: "Explore Research",
    },
    ctaSecondary: {
      ko: "연구실 소개",
      en: "About the Lab",
    },
    slides: [
      {
        id: "rare",
        label: { ko: "희귀질환", en: "Rare Diseases" },
        icon: "",
        title: {
          ko: "희귀질환 및 섬모병 연구",
          en: "Rare Diseases & Ciliopathies",
        },
        subtitle: {
          ko: "유전질환의 분자 기전을 규명합니다",
          en: "Unraveling the molecular basis of genetic disorders",
        },
        description: {
          ko: "일차섬모의 구조와 기능이 Carpenter syndrome 및 두개골조기유합증과 같은 희귀 유전질환에 어떻게 연결되는지 분석하며, BMP signaling과 ciliogenesis 조절 인자를 발굴합니다.",
          en: "We investigate how primary cilia structure and function contribute to rare genetic conditions including Carpenter syndrome and craniosynostosis, identifying novel regulators of BMP signaling and ciliogenesis.",
        },
        gradient: "linear-gradient(135deg, #0B1D3A 0%, #1a3a5c 50%, #2d5a7b 100%)",
      },
      {
        id: "metabolic",
        label: { ko: "대사질환", en: "Metabolic Disease" },
        icon: "⚕️",
        title: {
          ko: "비만 및 대사질환 연구",
          en: "Obesity & Metabolic Disorders",
        },
        subtitle: {
          ko: "대사질환 치료 타깃을 탐색합니다",
          en: "Discovering new therapeutic targets for metabolic diseases",
        },
        description: {
          ko: "CEP89, NCS1 등 섬모 단백질이 ER-mitochondria contact sites와 mitophagy를 통해 비만 및 대사 항상성에 미치는 영향을 규명합니다.",
          en: "Our research explores how ciliary proteins such as CEP89 and NCS1 regulate mitophagy and ER-mitochondria contact sites, revealing novel mechanisms underlying obesity and metabolic homeostasis.",
        },
        gradient: "linear-gradient(135deg, #1a3a5c 0%, #0B1D3A 50%, #2a1a4a 100%)",
      },
      {
        id: "aging",
        label: { ko: "노화/섬유화", en: "Fibrosis & Aging" },
        icon: "",
        title: {
          ko: "간섬유화 및 노화 연구",
          en: "Liver Fibrosis & Aging",
        },
        subtitle: {
          ko: "항노화 전략과 섬모 대사를 연결합니다",
          en: "Targeting cilia metabolism for anti-aging strategies",
        },
        description: {
          ko: "일차섬모 대사를 기반으로 항노화 기술을 개발하고, 간섬유화 진행 기전 및 장 발달 과정에서의 Cilk1 기능을 연구합니다.",
          en: "We develop anti-aging technologies through primary cilia metabolism and investigate the mechanisms of hepatic fibrosis progression, with a focus on intestinal development and villus morphogenesis.",
        },
        gradient: "linear-gradient(135deg, #2a1a4a 0%, #1a3a5c 50%, #0B1D3A 100%)",
      },
    ],
  },
  stats: [
    { value: "2010", label: { ko: "연구실 설립", en: "Lab Established" } },
    { value: "15+", label: { ko: "연구 경력", en: "Years of Research" } },
    { value: "50+", label: { ko: "논문 수", en: "Publications" } },
    { value: "3", label: { ko: "핵심 연구축", en: "Research Areas" } },
  ],
  about: {
    title: { ko: "Welcome to MNG Lab", en: "Welcome to MNG Lab" },
    pill: { ko: "소개", en: "About" },
    paragraphs: [
      {
        ko: "MNG Lab은 일차섬모(primary cilia)의 생물학적 기능을 중심으로 발생, 신호전달, 대사 조절의 핵심 기전을 연구합니다.",
        en: "The Molecular NeuroGenetics Laboratory at Yonsei University focuses on understanding the biology and functions of primary cilia - organelles essential for development, signaling, and metabolic regulation.",
      },
      {
        ko: "기초 섬모생물학을 희귀질환/대사질환의 중개연구로 확장하여 질환 메커니즘을 밝히고 치료 전략으로 연결하는 것을 목표로 합니다.",
        en: "Our research spans from fundamental cilia biology to translational studies on rare genetic disorders and metabolic diseases, utilizing advanced molecular, genetic, and imaging techniques to uncover disease mechanisms and explore therapeutic strategies.",
      },
    ],
    ctaJoin: { ko: "Join Us", en: "Join Us" },
    ctaNews: { ko: "Lab News", en: "Lab News" },
  },
  profile: {
    label: { ko: "Principal Investigator", en: "Principal Investigator" },
    name: { ko: "Hyuk Wan Ko, Ph.D.", en: "Hyuk Wan Ko, Ph.D." },
    title: { ko: "Professor, Dept. of Biochemistry", en: "Professor, Dept. of Biochemistry" },
    bio: {
      ko: "Rutgers University 신경과학 박사 학위를 취득했으며 Princeton University에서 박사후연구를 수행했습니다.",
      en: "Ph.D. in Neuroscience from Rutgers University. Postdoctoral training at Princeton University.",
    },
    ctaScholar: { ko: "Google Scholar", en: "Google Scholar" },
    ctaContact: { ko: "Contact", en: "Contact" },
  },
  research: {
    title: { ko: "Research Areas", en: "Research Areas" },
    pill: { ko: "3 themes", en: "3 themes" },
    cards: [
      {
        id: "research-1",
        number: "01",
        color: "cilia",
        title: {
          ko: "Cilia Biology & Rare Genetic Diseases",
          en: "Cilia Biology & Rare Genetic Diseases",
        },
        description: {
          ko: "centriole appendage proteins의 ciliogenesis 조절 기전과 Carpenter syndrome의 BMP signaling 이상을 동물모델 기반으로 분석합니다.",
          en: "Investigating the roles of centriole appendage proteins in ciliogenesis using mouse models, and elucidating how MEGF8 and RAB23 cause craniosynostosis through distinct BMP signaling mechanisms.",
        },
        tags: [
          { ko: "Primary Cilia", en: "Primary Cilia" },
          { ko: "Ciliogenesis", en: "Ciliogenesis" },
          { ko: "Craniosynostosis", en: "Craniosynostosis" },
          { ko: "BMP Signaling", en: "BMP Signaling" },
        ],
      },
      {
        id: "research-2",
        number: "02",
        color: "metab",
        title: {
          ko: "Obesity & Metabolic Regulation",
          en: "Obesity & Metabolic Regulation",
        },
        description: {
          ko: "CEP89 결손이 ER-미토콘드리아 접촉부위 기반 mitophagy를 통해 비만 표현형으로 이어지는 경로를 규명합니다.",
          en: "Uncovering how CEP89 deficiency drives obesity through impaired mitophagy via NCS1 at ER-mitochondria contact sites, revealing new therapeutic targets for metabolic diseases.",
        },
        tags: [
          { ko: "Mitophagy", en: "Mitophagy" },
          { ko: "ER-Mito Contact Sites", en: "ER-Mito Contact Sites" },
          { ko: "Metabolic Homeostasis", en: "Metabolic Homeostasis" },
        ],
      },
      {
        id: "research-3",
        number: "03",
        color: "aging",
        title: {
          ko: "Liver Fibrosis & Anti-aging",
          en: "Liver Fibrosis & Anti-aging",
        },
        description: {
          ko: "일차섬모 대사 기반 항노화 연구와 함께 간섬유화 진행 및 장 융모 발생에서 Cilk1 기능을 연구합니다.",
          en: "Developing anti-aging technologies through primary cilia metabolism and investigating the role of Cilk1 in intestinal development and villus morphogenesis.",
        },
        tags: [
          { ko: "Hepatic Fibrosis", en: "Hepatic Fibrosis" },
          { ko: "Aging", en: "Aging" },
          { ko: "Intestinal Development", en: "Intestinal Development" },
        ],
      },
    ],
  },
  news: {
    title: { ko: "Lab News", en: "Lab News" },
    pill: { ko: "Timeline", en: "Timeline" },
    items: [
      {
        type: { ko: "Publication", en: "Publication" },
        year: "2025",
        title: {
          ko: "Cilk1 is essential for mesenchymal cilia maintenance and epithelial-mesenchymal crosstalk in intestinal villus morphogenesis",
          en: "Cilk1 is essential for mesenchymal cilia maintenance and epithelial-mesenchymal crosstalk in intestinal villus morphogenesis",
        },
        description: {
          ko: "저자: Song J., Je S.Y., Lee B., Ko H.W.",
          en: "Authors: Song J., Je S.Y., Lee B., Ko H.W.",
        },
      },
      {
        type: { ko: "Publication", en: "Publication" },
        year: "2025",
        title: {
          ko: "Ebastine-mediated destabilization of E3 ligase MKRN1 protects against metabolic dysfunction-associated steatohepatitis",
          en: "Ebastine-mediated destabilization of E3 ligase MKRN1 protects against metabolic dysfunction-associated steatohepatitis",
        },
        description: {
          ko: "저자: Kim S., Han H.J., Rho H. 외",
          en: "Authors: Kim S., Han H.J., Rho H. et al.",
        },
      },
      {
        type: { ko: "Publication", en: "Publication" },
        year: "2025",
        title: {
          ko: "Ebastine-mediated SHANK2 establishes auditory hair bundle architecture essential for mammalian hearing steatohepatitis",
          en: "Ebastine-mediated SHANK2 establishes auditory hair bundle architecture essential for mammalian hearing steatohepatitis",
        },
        description: {
          ko: "저자: Choi H.S., Park H., Min H. 외",
          en: "Authors: Choi H.S., Park H., Min H. et al.",
        },
      },
      {
        type: { ko: "Publication", en: "Publication" },
        year: "2024",
        title: {
          ko: "Distinct roles of centriole distal appendage proteins in ciliary assembly and disassembly",
          en: "Distinct roles of centriole distal appendage proteins in ciliary assembly and disassembly",
        },
        description: {
          ko: "저자: Su-yeon Je, Hyuk Wan Ko",
          en: "Authors: Su-yeon Je, Hyuk Wan Ko",
        },
      },
    ],
  },
  join: {
    title: { ko: "Join Our Lab", en: "Join Our Lab" },
    pill: { ko: "Recruiting", en: "Recruiting" },
    description: {
      ko: "※ 이 섹션은 기존 홈페이지에 없는 신규 영역입니다. 모집 공고 문구와 지원 요건, 연락처 링크를 운영용으로 입력해 주세요.",
      en: "※ 이 섹션은 기존 홈페이지에 없는 신규 영역입니다. 모집 공고 문구와 지원 요건, 연락처 링크를 운영용으로 입력해 주세요.",
    },
    ctaPrimary: { ko: "Open Positions", en: "Open Positions" },
    ctaSecondary: { ko: "Contact Us", en: "Contact Us" },
  },
};

export const homeContent = {
  hero: {
    kicker: {
      ko: "Metabolic and Genetic disorders Lab",
      en: "Metabolic and Genetic disorders Lab",
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
          ko: "섬모 생물학 및 희귀 유전질환",
          en: "Cilia Biology & Rare Genetic Diseases",
        },
        subtitle: {
          ko: "섬모와 유전자 변이가 질환으로 이어지는 과정을 밝힙니다",
          en: "Connecting cilia and genetic defects to human disease",
        },
        description: {
          ko: "세포 신호전달과 조직 항상성에 중요한 섬모가 어떻게 형성·유지·조절되는지, 그리고 섬모 관련 유전자 변이가 희귀 유전질환으로 이어지는지 연구합니다.",
          en: "We study how cilia are formed, maintained, and regulated, and how mutations in cilia-related genes lead to rare genetic diseases.",
        },
        gradient: "linear-gradient(135deg, #0B1D3A 0%, #1a3a5c 50%, #2d5a7b 100%)",
      },
      {
        id: "metabolic",
        label: { ko: "대사 항상성", en: "Metabolic Homeostasis" },
        icon: "⚕️",
        title: {
          ko: "비만 및 대사 항상성",
          en: "Obesity & Metabolic Homeostasis",
        },
        subtitle: {
          ko: "세포 수준의 불균형이 전신 대사질환으로 이어지는 과정을 탐구합니다",
          en: "Tracing cellular imbalance to whole-body metabolic disease",
        },
        description: {
          ko: "세포소기관 기능, 세포 신호전달, 대사 경로가 지방조직 생물학, 에너지 소비, 전신 대사 항상성에 미치는 영향을 연구합니다.",
          en: "We investigate how organelle function, cellular signaling, and metabolic pathways influence adipose tissue biology, energy expenditure, and metabolic homeostasis.",
        },
        gradient: "linear-gradient(135deg, #1a3a5c 0%, #0B1D3A 50%, #2a1a4a 100%)",
      },
      {
        id: "aging",
        label: { ko: "노화 대사질환", en: "Age-Related Disorders" },
        icon: "",
        title: {
          ko: "노화 관련 대사질환",
          en: "Age-Related Metabolic Disorders",
        },
        subtitle: {
          ko: "노화와 대사 스트레스가 질병 진행을 악화시키는 기전을 연구합니다",
          en: "Understanding how aging and metabolic stress drive disease progression",
        },
        description: {
          ko: "노화가 염증, 조직 복구 저하, 대사 불균형과 상호작용해 간섬유화 및 대사질환 진행을 촉진하는 과정을 연구합니다.",
          en: "We study how aging interacts with inflammation, impaired tissue repair, and metabolic imbalance to promote liver fibrosis and metabolic disease progression.",
        },
        gradient: "linear-gradient(135deg, #2a1a4a 0%, #1a3a5c 50%, #0B1D3A 100%)",
      },
    ],
  },
  metrics: {
    establishedYear: 2010,
  },
  about: {
    title: { ko: "Welcome to MNG Lab", en: "Welcome to MNG Lab" },
    pill: { ko: "소개", en: "About" },
    paragraphs: [
      {
        ko: "MNG Lab(Metabolic and Genetic disorders Lab)은 세포가 생물학적 균형을 유지하는 방식과, 이 균형이 무너질 때 희귀 유전질환·비만·대사질환·노화 관련 질환 진행으로 이어지는 과정을 연구합니다.",
        en: "The MNG Lab (Metabolic and Genetic disorders Lab) studies how cells maintain biological balance and how disruption of this balance leads to rare genetic diseases, obesity, metabolic disorders, and age-related disease progression.",
      },
      {
        ko: "분자생물학, 세포생물학, 유전학, 질환 모델, 중개연구 접근을 결합해 세포소기관 기능 이상, 유전적 결함, 대사 경로, 노화 과정이 인간 질환에 기여하는 기전을 밝히고자 합니다.",
        en: "By combining molecular biology, cell biology, genetics, disease models, and translational approaches, we aim to uncover how organelle dysfunction, genetic defects, metabolic pathways, and aging-related processes contribute to human disease.",
      },
    ],
    ctaNews: { ko: "Lab News", en: "Lab News" },
  },
  profile: {
    label: { ko: "Principal Investigator", en: "Principal Investigator" },
    ctaScholar: { ko: "Google Scholar", en: "Google Scholar" },
    ctaContact: { ko: "Contact", en: "Contact" },
  },
  research: {
    title: { ko: "Research Areas", en: "Research Areas" },
    cards: [
      {
        id: "research-1",
        number: "01",
        color: "cilia",
        title: {
          ko: "섬모 생물학 및 희귀 유전질환",
          en: "Cilia Biology & Rare Genetic Diseases",
        },
        description: {
          ko: "섬모가 세포 신호전달과 조직 항상성을 조절하는 방식, 그리고 섬모 관련 유전자 변이가 희귀 유전질환으로 이어지는 과정을 연구합니다.",
          en: "Studying how cilia regulate cellular signaling and tissue homeostasis, and how cilia-related gene mutations lead to rare genetic diseases.",
        },
        tags: [
          { ko: "Cilia Biology", en: "Cilia Biology" },
          { ko: "Rare Genetic Diseases", en: "Rare Genetic Diseases" },
          { ko: "Ciliopathies", en: "Ciliopathies" },
        ],
      },
      {
        id: "research-2",
        number: "02",
        color: "metab",
        title: {
          ko: "비만 및 대사 항상성",
          en: "Obesity & Metabolic Homeostasis",
        },
        description: {
          ko: "세포소기관 기능, 세포 신호전달, 대사 경로가 지방조직 생물학과 전신 대사 균형에 미치는 영향을 분석합니다.",
          en: "Analyzing how organelle function, cellular signaling, and metabolic pathways influence adipose tissue biology and whole-body metabolic balance.",
        },
        tags: [
          { ko: "Obesity", en: "Obesity" },
          { ko: "Metabolic Homeostasis", en: "Metabolic Homeostasis" },
          { ko: "Organelle Biology", en: "Organelle Biology" },
        ],
      },
      {
        id: "research-3",
        number: "03",
        color: "aging",
        title: {
          ko: "노화 관련 대사질환",
          en: "Age-Related Metabolic Disorders",
        },
        description: {
          ko: "노화가 대사 스트레스, 염증, 조직 복구 저하와 상호작용해 간섬유화 및 대사질환 진행을 악화시키는 기전을 연구합니다.",
          en: "Studying how aging interacts with metabolic stress, inflammation, and impaired tissue repair to worsen liver fibrosis and metabolic disease progression.",
        },
        tags: [
          { ko: "Aging", en: "Aging" },
          { ko: "Metabolic Disorders", en: "Metabolic Disorders" },
          { ko: "Liver Fibrosis", en: "Liver Fibrosis" },
        ],
      },
    ],
  },
  news: {
    title: { ko: "Lab News", en: "Lab News" },
    pill: { ko: "Timeline", en: "Timeline" },
  },
};

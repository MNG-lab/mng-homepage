export const contactData = {
  locationTitle: {
    ko: "연구실 위치",
    en: "Lab Location",
  },
  address: {
    ko: "03722 서울특별시 서대문구 연세로 50 연세대학교 323동(과학원) S305호",
    en: "Room S305, Building 323, Yonsei University, 50 Yonsei-ro, Seodaemun-gu, Seoul 03722, Korea",
  },
  altAddress: {
    ko: "교수 연구실: 323동 S309호",
    en: "Professor office: Room S309, Building 323",
  },
  emailTitle: {
    ko: "이메일",
    en: "Email",
  },
  email: "kohw@yonsei.ac.kr",
  phoneTitle: {
    ko: "전화",
    en: "Phone",
  },
  phones: [
    { label: { ko: "실험실", en: "Lab" }, value: "02-2123-7584" },
    { label: { ko: "교수실", en: "Office" }, value: "02-2123-2699" },
    { label: { ko: "대표 연락", en: "Main Line" }, value: "+82-2-2123-7286" },
  ],
  officeHoursTitle: {
    ko: "문의 가능 시간",
    en: "Office Hours",
  },
  officeHours: {
    ko: "평일 09:00-18:00 (KST)",
    en: "Weekdays 09:00-18:00 (KST)",
  },
  transitTitle: {
    ko: "오시는 길",
    en: "Directions",
  },
  transit: [
    {
      mode: { ko: "지하철", en: "Subway" },
      line: {
        ko: "2호선",
        en: "Line 2",
      },
      lineColor: "#2aa85a",
      detail: {
        ko: "신촌역 하차 후 연세대학교 방면 도보 약 15분",
        en: "Get off at Sinchon Station and walk about 15 minutes toward Yonsei University",
      },
    },
    {
      mode: { ko: "버스(연세대학교 앞)", en: "Bus (Yonsei University Stop)" },
      groups: [
        {
          label: { ko: "파랑버스(간선)", en: "Blue (Trunk)" },
          color: "#2f6fe4",
          routes: "163, 170, 171, 172, 270, 272, 370, 470, 601, 606, 700, 750, 751",
        },
        {
          label: { ko: "초록버스(지선)", en: "Green (Branch)" },
          color: "#2aa85a",
          routes: "서대문03, 서대문04, 서대문05, 6711, 6712, 6714, 7014, 7015, 7017, 7020, 7613, 7712, 7720, 7725, 7726, 7727, 7728",
        },
        {
          label: { ko: "빨강버스(광역)", en: "Red (Express)" },
          color: "#d54444",
          routes: "9600, 9601, 9602, 9702, 9704, 9706, 9708, 9713",
        },
      ],
    },
  ],
  mapTitle: {
    ko: "지도",
    en: "Map",
  },
  mapEmbedUrl:
    "https://www.google.com/maps?q=%EC%97%B0%EC%84%B8%EB%8C%80%ED%95%99%EA%B5%90+%EA%B3%BC%ED%95%99%EC%9B%90&output=embed",
  mapImages: [],
  linksTitle: {
    ko: "바로가기",
    en: "Quick Links",
  },
  links: [
    {
      label: { ko: "지원 안내", en: "Join Us" },
      url: "/join-us",
    },
  ],
};

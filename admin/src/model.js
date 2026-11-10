export const STORAGE_KEY = "mng-admin-demo-v1";
export const PAGES = [
  "홈",
  "연구 소개",
  "교수 소개",
  "구성원",
  "논문",
  "갤러리",
  "연락처",
];
export const STATUS = {
  queued: { label: "접수됨", tone: "gray", step: 0 },
  working: { label: "작업 중", tone: "blue", step: 1 },
  review: { label: "확인 필요", tone: "amber", step: 2 },
  deploying: { label: "반영 중", tone: "blue", step: 3 },
  done: { label: "반영 완료", tone: "green", step: 4 },
  failed: { label: "작업 실패", tone: "red", step: 1 },
  cancelled: { label: "요청 취소", tone: "gray", step: -1 },
};
export function initialRequests() {
  return [
    {
      id: 104,
      title: "새 연구원의 이메일을 변경해주세요",
      page: "구성원",
      description:
        "구성원 소개의 김민수 연구원 이메일을 새 주소로 변경해주세요.",
      before: "minsu.old@example.com",
      after: "minsu.new@example.com",
      status: "review",
      date: "2026-11-10T01:30:00Z",
      author: "김관리",
      kind: "edit",
    },
    {
      id: 103,
      title: "홈 화면의 연구실 소식을 업데이트해주세요",
      page: "홈",
      description: "11월 연구실 세미나 소식을 홈 화면에 추가해주세요.",
      before: "10월 연구실 세미나",
      after: "11월 연구실 세미나 · 11월 20일 오후 3시",
      status: "done",
      date: "2026-11-09T05:00:00Z",
      author: "이편집",
      kind: "edit",
    },
    {
      id: 102,
      title: "새로 게재된 논문을 추가해주세요",
      page: "논문",
      description: "2026년 논문 목록에 제공한 논문 제목과 저자를 추가해주세요.",
      before: "논문 12편",
      after: "논문 13편",
      status: "done",
      date: "2026-11-06T03:00:00Z",
      author: "김관리",
      kind: "edit",
    },
    {
      id: 101,
      title: "연구실 단체 사진을 교체해주세요",
      page: "갤러리",
      description: "갤러리의 대표 사진을 새 단체 사진으로 교체해주세요.",
      before: "기존 단체 사진",
      after: "새 단체 사진",
      status: "failed",
      date: "2026-11-04T02:00:00Z",
      author: "이편집",
      kind: "edit",
      error:
        "사진을 찾을 수 없어 작업을 멈췄어요. 요청 내용을 보완한 뒤 다시 시도해주세요.",
    },
  ];
}
export function readRequests() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (
      Array.isArray(saved) &&
      saved.every(
        (r) =>
          Number.isSafeInteger(r.id) &&
          STATUS[r.status] &&
          PAGES.includes(r.page) &&
          typeof r.title === "string",
      )
    )
      return saved;
  } catch {
    /* The demo still works when local storage is unavailable. */
  }
  return initialRequests();
}
export function makeRequest(requests, fields, author) {
  return {
    ...fields,
    id: Math.max(100, ...requests.map((r) => r.id)) + 1,
    status: "queued",
    date: new Date().toISOString(),
    author,
    kind: fields.kind || "edit",
  };
}
export function canRollback(request, requests) {
  return (
    request.status === "done" &&
    request.kind !== "rollback" &&
    !requests.some((r) => r.sourceId === request.id && r.status !== "cancelled")
  );
}

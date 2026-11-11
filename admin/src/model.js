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
export const PAGE_LABELS = {
  홈: "Home",
  "연구 소개": "Research",
  "교수 소개": "Professor",
  구성원: "Members",
  논문: "Publications",
  갤러리: "Gallery",
  연락처: "Contact",
  "전체 홈페이지": "Entire website",
};
export const pageLabel = (value) => PAGE_LABELS[value] || value;
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
  return migrateRevisions([
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
  ]);
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
          (PAGES.includes(r.page) || r.page === "전체 홈페이지") &&
          typeof r.title === "string",
      )
    )
      return migrateRevisions(saved);
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

// Revision metadata models whole-site snapshots; request records are never deleted.
export function migrateRevisions(requests) {
  let revision = 0;
  let snapshot = [];
  const migrated = new Map();
  const done = requests
    .filter((r) => r.status === "done")
    .sort((a, b) =>
      a.revision && b.revision
        ? a.revision - b.revision
        : Date.parse(a.appliedAt || a.date) -
            Date.parse(b.appliedAt || b.date) || a.id - b.id,
    );
  for (const request of done) {
    revision = Math.max(revision + 1, request.revision || 0);
    if (Array.isArray(request.snapshotIds)) snapshot = request.snapshotIds;
    else if (request.kind === "rollback")
      snapshot = snapshot.filter((id) => id !== request.sourceId);
    else snapshot = [...snapshot, request.id];
    migrated.set(request.id, {
      ...request,
      revision,
      appliedAt: request.appliedAt || request.date,
      snapshotIds: [...snapshot],
    });
  }
  return requests.map((r) => migrated.get(r.id) || r);
}
export function latestRevision(requests) {
  return requests
    .filter((r) => r.status === "done" && r.revision)
    .sort((a, b) => b.revision - a.revision)[0];
}
export function restoreImpact(target, requests) {
  const latest = latestRevision(requests);
  const targetIds = target?.snapshotIds || [];
  const currentIds = latest?.snapshotIds || [];
  return {
    removed: requests.filter(
      (r) => currentIds.includes(r.id) && !targetIds.includes(r.id),
    ),
    restored: requests.filter(
      (r) => targetIds.includes(r.id) && !currentIds.includes(r.id),
    ),
    latest,
  };
}
export function canRollback(request, requests) {
  if (request.status !== "done" || !request.snapshotIds) return false;
  const impact = restoreImpact(request, requests);
  return (
    (impact.removed.length > 0 || impact.restored.length > 0) &&
    !requests.some(
      (r) =>
        r.kind === "restore" &&
        r.sourceId === request.id &&
        ["queued", "working", "review", "deploying"].includes(r.status),
    )
  );
}
export function restoreFields(target, requests) {
  const { removed, restored, latest } = restoreImpact(target, requests);
  return {
    title: `시점 복원: #${target.id} 반영 직후`,
    page: "전체 홈페이지",
    description: `홈페이지 전체를 요청 #${target.id} 반영 직후로 복원합니다. 이후 변경 ${removed.length}건이 현재 홈페이지에서 제거됩니다. 과거 요청과 변경 이력은 삭제하지 않습니다.`,
    before: `현재 홈페이지 · 리비전 ${latest.revision}`,
    after: `요청 #${target.id} 반영 직후 · 리비전 ${target.revision}`,
    kind: "restore",
    sourceId: target.id,
    targetRevision: target.revision,
    baseRevision: latest.revision,
    targetSnapshotIds: [...target.snapshotIds],
    removedRequestIds: removed.map((r) => r.id),
    restoredRequestIds: restored.map((r) => r.id),
  };
}
export function transitionRequest(requests, id, status) {
  const request = requests.find((r) => r.id === id);
  if (!request) return requests;
  const latest = latestRevision(requests);
  if (
    ["deploying", "done"].includes(status) &&
    request.kind === "restore" &&
    latest?.revision !== request.baseRevision
  ) {
    return requests.map((r) =>
      r.id === id
        ? {
            ...r,
            status: "failed",
            error:
              "복원 준비 후 새 변경이 반영됐어요. 변경 이력에서 복원 시점을 다시 선택해 영향 범위를 확인해주세요.",
          }
        : r,
    );
  }
  return requests.map((r) =>
    r.id !== id
      ? r
      : status === "done"
        ? {
            ...r,
            status,
            revision: (latest?.revision || 0) + 1,
            appliedAt: new Date().toISOString(),
            snapshotIds:
              r.kind === "restore"
                ? [...r.targetSnapshotIds]
                : [...(latest?.snapshotIds || []), r.id],
          }
        : { ...r, status },
  );
}

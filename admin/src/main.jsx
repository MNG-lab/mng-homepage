import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import {
  STORAGE_KEY,
  PAGES,
  STATUS,
  initialRequests,
  readRequests,
  makeRequest,
  canRollback,
  pageLabel,
  restoreImpact,
  restoreFields,
  transitionRequest,
  latestRevision,
} from "./model";
import "./style.css";
import AuthGate from "./AuthGate";

function Icon({ name, size = 20, ...props }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    settings: (
      <>
        <path d="m9 3 1-1h4l1 3 3 1 3 3-1 3 1 3-3 3-3 1-1 3h-4l-1-3-3-1-3-3 1-3-1-3 3-3 3-1z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="m9 5 7 7-7 7" />,
    external: (
      <>
        <path d="M14 3h7v7M21 3l-10 10" />
        <path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    undo: (
      <>
        <path d="M3 10h11a6 6 0 0 1 0 12M3 10l5-5M3 10l5 5" />
      </>
    ),
    shield: (
      <>
        <path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7v1" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.file}
    </svg>
  );
}
function Badge({ status }) {
  const s = STATUS[status];
  return (
    <span className={`badge ${s.tone}`}>
      <i />
      {s.label}
    </span>
  );
}
function date(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
function Modal({ title, children, close, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      aria-labelledby="modal-title"
    >
      <header>
        <div>
          <span className="eyebrow">MNG WEBSITE MANAGER</span>
          <h2 id="modal-title">{title}</h2>
        </div>
        <button className="icon-btn" onClick={close} aria-label="창 닫기">
          <Icon name="close" />
        </button>
      </header>
      {children}
    </dialog>
  );
}
const VIEW_PATHS = {
  overview: "/dashboard",
  requests: "/requests",
  history: "/history",
  settings: "/settings",
};
function App({ authenticatedUser = null }) {
  const location = useLocation();
  const routeTo = useNavigate();
  const detailMatch = location.pathname.match(/^\/requests\/(\d+)$/);
  const newRequestRoute = location.pathname === "/requests/new";
  const routeModal = detailMatch ? "detail" : newRequestRoute ? "new" : null;
  const backgroundPath = Object.values(VIEW_PATHS).includes(
    location.state?.backgroundPath,
  )
    ? location.state.backgroundPath
    : "/requests";
  const activePath = routeModal ? backgroundPath : location.pathname;
  const view =
    Object.keys(VIEW_PATHS).find((key) => VIEW_PATHS[key] === activePath) ||
    "overview";
  const [requests, setRequests] = useState(readRequests);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [pageFilter, setPageFilter] = useState("전체 페이지");
  const [role, setRole] = useState(authenticatedUser?.role || "admin");
  const [localModal, setLocalModal] = useState(null);
  const modal = localModal || routeModal;
  const selected = detailMatch ? Number(detailMatch[1]) : null;
  const [notice, setNotice] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const isAdmin = role === "admin" || role === "owner";
  const current = requests.find((r) => r.id === selected);
  const pending = requests.filter((r) => r.status === "review");
  const ongoing = requests.filter((r) =>
    ["queued", "working", "deploying"].includes(r.status),
  );
  const completed = requests.filter((r) => r.status === "done");
  const currentRevision = latestRevision(requests);
  const impact = current ? restoreImpact(current, requests) : null;
  useEffect(() => {
    setLocalModal(null);
    if (location.pathname === "/") routeTo("/dashboard", { replace: true });
  }, [location.key, location.pathname, routeTo]);
  useEffect(() => {
    document.title = `${{ overview: "대시보드", requests: "수정 요청", history: "변경 이력", settings: "설정" }[view]} · MNG 홈페이지 관리`;
  }, [view]);
  function setModal(next) {
    if (next === "new") {
      routeTo("/requests/new", {
        state: { backgroundPath: VIEW_PATHS[view], openedInApp: true },
      });
    } else if (next === "detail") {
      setLocalModal(null);
    } else if (next === null) {
      if (localModal) setLocalModal(null);
      else if (routeModal) {
        if (location.state?.openedInApp) routeTo(-1);
        else routeTo(backgroundPath, { replace: true });
      }
    } else setLocalModal(next);
  }
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }, [requests]);
  useEffect(() => {
    const active = requests.filter((r) =>
      ["queued", "working", "deploying"].includes(r.status),
    );
    const timers = active.map((r) =>
      setTimeout(
        () =>
          setRequests((prev) => {
            if (prev.find((x) => x.id === r.id)?.status !== r.status)
              return prev;
            return transitionRequest(
              prev,
              r.id,
              { queued: "working", working: "review", deploying: "done" }[
                r.status
              ],
            );
          }),
        r.status === "queued" ? 1400 : 2800,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [requests]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  function navigate(target) {
    routeTo(VIEW_PATHS[target]);
    setLocalModal(null);
    setFilter("all");
    setQuery("");
    setPageFilter("전체 페이지");
  }
  function changeStatus(id, status) {
    setRequests((prev) => transitionRequest(prev, id, status));
  }
  function showDetail(id) {
    routeTo(`/requests/${id}`, {
      state: { backgroundPath: VIEW_PATHS[view], openedInApp: true },
    });
  }
  function addRequest(fields) {
    const request = makeRequest(
      requests,
      fields,
      isAdmin ? "관리자" : "편집자",
    );
    setRequests((prev) => [request, ...prev]);
    setLocalModal(null);
    routeTo(`/requests/${request.id}`, {
      replace: Boolean(routeModal),
      state: {
        backgroundPath: VIEW_PATHS[view],
        openedInApp: location.state?.openedInApp || false,
      },
    });
    setNotice(
      "테스트 요청이 접수되었어요. 실제 GitHub 작업은 실행되지 않습니다.",
    );
  }
  function rollback(source) {
    if (!isAdmin || !canRollback(source, requests)) return;
    addRequest(restoreFields(source, requests));
  }
  const shown = requests.filter(
    (r) =>
      (!["requests", "history"].includes(view) ||
        view !== "history" ||
        r.status === "done") &&
      (filter === "all" || r.status === filter) &&
      (pageFilter === "전체 페이지" || r.page === pageFilter) &&
      `${r.title} ${r.id} ${pageLabel(r.page)}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const titles = {
    overview: [
      "홈페이지 관리",
      "작은 수정부터 새로운 소식까지, 여기서 편하게 관리하세요.",
    ],
    requests: [
      "수정 요청",
      "요청부터 반영까지, 진행 상황을 한눈에 확인하세요.",
    ],
    history: [
      "변경 이력",
      "홈페이지에 반영된 변경을 확인하고, 원하는 반영 시점을 선택해 홈페이지 전체를 복원하세요.",
    ],
    settings: ["설정", "연결 상태와 관리자 권한을 관리하세요."],
  };
  function RequestTable({ rows, compact = false }) {
    return (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>요청 내용</th>
              <th>대상 페이지</th>
              <th>상태</th>
              <th>요청일</th>
              <th>
                <span className="sr-only">상세 보기</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, compact ? 5 : undefined).map((r) => (
              <tr key={r.id}>
                <td>
                  <button
                    className="request-link"
                    onClick={() => showDetail(r.id)}
                  >
                    {["rollback", "restore"].includes(r.kind) && (
                      <Icon name="undo" size={16} />
                    )}
                    <span>
                      {r.title}
                      <small>
                        #{r.id} · {r.author}
                      </small>
                    </span>
                  </button>
                </td>
                <td>
                  <span className="page-tag">{pageLabel(r.page)}</span>
                </td>
                <td>
                  <Badge status={r.status} />
                  {r.status === "done" &&
                    r.kind === "edit" &&
                    !currentRevision?.snapshotIds?.includes(r.id) && (
                      <small className="history-excluded">
                        복원으로 제외됨
                      </small>
                    )}
                </td>
                <td className="date-cell">{date(r.date)}</td>
                <td>
                  <button
                    className="icon-btn"
                    aria-label={`${r.title} 상세 보기`}
                    onClick={() => showDetail(r.id)}
                  >
                    <Icon name="arrow" size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty">
            <Icon name="search" size={28} />
            <h3>표시할 요청이 없어요</h3>
            <p>검색어나 필터를 바꾸거나 새 요청을 만들어보세요.</p>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <span className="brand-symbol">
            m<span>·</span>
          </span>
          <span>
            MNG Lab<small>홈페이지 관리</small>
          </span>
        </a>
        <div className="workspace-label">
          WORKSPACE <span>테스트</span>
        </div>
        <nav aria-label="주 메뉴">
          {[
            ["overview", "grid", "대시보드"],
            ["requests", "file", "수정 요청"],
            ["history", "clock", "변경 이력"],
            ["settings", "settings", "설정"],
          ].map(([id, icon, label]) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => navigate(id)}
              aria-current={view === id ? "page" : undefined}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {id === "requests" && pending.length > 0 && (
                <b>{pending.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <Icon name="shield" />
            <strong>안심하고 테스트하세요</strong>
            <p>이 화면의 작업은 실제 홈페이지에 반영되지 않아요.</p>
          </div>
          <a
            className="site-link"
            href="https://dglab.yonsei.ac.kr/"
            target="_blank"
            rel="noreferrer"
          >
            홈페이지 방문 <Icon name="external" size={15} />
          </a>
          <div className="profile">
            <span className="avatar">C</span>
            <div>
              <strong>{isAdmin ? "관리자" : "편집자"}</strong>
              <small>chominho96@gmail.com</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            워크스페이스 <Icon name="arrow" size={13} />{" "}
            <span>{titles[view][0]}</span>
          </div>
          <span className="demo-pill">
            <span />
            인터랙션 데모
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">MNG LAB / WEBSITE</div>
              <h1>{titles[view][0]}</h1>
              <p>{titles[view][1]}</p>
            </div>
            {view !== "settings" && (
              <button className="primary" onClick={() => setModal("new")}>
                <Icon name="plus" size={18} />새 수정 요청
              </button>
            )}
          </div>
          <div className="test-notice">
            <Icon name="info" size={17} />
            <p>
              <strong>먼저 사용 흐름을 확인해보세요.</strong> 예시 데이터로
              동작하며, 요청과 변경은 이 브라우저에만 저장됩니다.
            </p>
          </div>
          {storageWarning && (
            <p role="alert" className="error-note">
              브라우저 저장 공간을 사용할 수 없어 새로고침하면 변경이 사라질 수
              있어요.
            </p>
          )}
          {view === "overview" && (
            <>
              <div className="stats">
                <button
                  onClick={() => {
                    navigate("requests");
                    setFilter("review");
                  }}
                  className="stat-card"
                >
                  <span>
                    확인이 필요한 요청 <Icon name="file" />
                  </span>
                  <div>
                    {pending.length}
                    <small>건</small>
                  </div>
                  <p>
                    <i className="dot amber-dot" />
                    변경 내용을 확인해주세요
                  </p>
                </button>
                <button
                  onClick={() => {
                    navigate("requests");
                    setFilter(ongoing[0]?.status || "working");
                  }}
                  className="stat-card"
                >
                  <span>
                    진행 중인 작업 <Icon name="spark" />
                  </span>
                  <div>
                    {ongoing.length}
                    <small>건</small>
                  </div>
                  <p>접수부터 홈페이지 반영까지</p>
                </button>
                <button
                  onClick={() => navigate("history")}
                  className="stat-card"
                >
                  <span>
                    반영 이력 <Icon name="check" />
                  </span>
                  <div>
                    {completed.length}
                    <small>건</small>
                  </div>
                  <p>
                    <i className="dot green-dot" />
                    변경 이력에서 되돌릴 수 있어요
                  </p>
                </button>
              </div>
              {pending.length > 0 && (
                <section className="review-callout">
                  <span className="callout-icon">
                    <Icon name="check" size={23} />
                  </span>
                  <div>
                    <span className="eyebrow">READY FOR REVIEW</span>
                    <h2>새 변경사항이 준비됐어요</h2>
                    <p>{pending[0].title}</p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => showDetail(pending[0].id)}
                  >
                    변경 확인하기 <Icon name="arrow" size={16} />
                  </button>
                </section>
              )}
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>최근 수정 요청</h2>
                    <p>최근 요청의 진행 상황을 확인하세요.</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("requests")}
                  >
                    전체 보기 <Icon name="arrow" size={15} />
                  </button>
                </div>
                <RequestTable rows={requests} compact />
              </section>
              <section className="how-it-works">
                <div>
                  <span className="eyebrow">HOW IT WORKS</span>
                  <h2>홈페이지 수정, 이렇게 진행돼요.</h2>
                </div>
                <ol>
                  {[
                    ["01", "수정 요청", "바꾸고 싶은 내용을 적어주세요."],
                    ["02", "변경 확인", "준비된 결과를 미리 확인하세요."],
                    ["03", "홈페이지 반영", "관리자가 확인하면 반영돼요."],
                  ].map(([n, t, d]) => (
                    <li key={n}>
                      <span>{n}</span>
                      <div>
                        <strong>{t}</strong>
                        <p>{d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
          {["requests", "history"].includes(view) && (
            <section className="panel">
              <div className="list-tools">
                {view === "requests" ? (
                  <div className="tabs" aria-label="상태 필터">
                    {[
                      ["all", "전체"],
                      ["review", "확인 필요"],
                      ["working", "작업 중"],
                      ["done", "반영 완료"],
                      ["failed", "실패"],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        className={filter === id ? "selected" : ""}
                        onClick={() => setFilter(id)}
                        aria-pressed={filter === id}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="history-help">
                    <Icon name="undo" size={17} />
                    선택한 요청이 반영된 직후의 홈페이지 전체로 복원합니다.
                    이후 변경은 현재 화면에서 제외되고, 반영 이력은 보존돼요.
                  </div>
                )}
                <div className="filters">
                  <label className="search-box">
                    <Icon name="search" size={17} />
                    <input
                      aria-label="요청 검색"
                      placeholder="요청 제목, 번호 검색"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <select
                    aria-label="페이지 필터"
                    value={pageFilter}
                    onChange={(e) => setPageFilter(e.target.value)}
                  >
                    {["전체 페이지", ...PAGES].map((p) => (
                      <option key={p} value={p}>
                        {pageLabel(p)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <RequestTable rows={shown} />
            </section>
          )}
          {view === "settings" && (
            <div className="settings-grid">
              <section className="panel setting-panel">
                <div className="section-heading">
                  <div>
                    <h2>서비스 연결</h2>
                    <p>실제 연결은 다음 확인 단계에서 진행합니다.</p>
                  </div>
                  <Icon name="shield" />
                </div>
                {[
                  ["GitHub", "요청 · 변경 이력 · 자동 작업", "연결 예정"],
                  ["Cloudflare", "관리자 로그인 · 미리보기 배포", "연결 예정"],
                  ["Codex 인증", "자동 수정 작업에 사용하는 인증", "연결 예정"],
                ].map(([name, desc, state]) => (
                  <div className="connection-row" key={name}>
                    <span className="service-icon">{name[0]}</span>
                    <div>
                      <strong>{name}</strong>
                      <p>{desc}</p>
                    </div>
                    <span className="badge gray">{state}</span>
                  </div>
                ))}
                <div className="settings-note">
                  <Icon name="info" size={17} />
                  <p>
                    이 데모에서는 실제 토큰을 입력하거나 저장하지 않습니다. 인증
                    갱신은 관리자에게만 제공됩니다.
                  </p>
                </div>
              </section>
              <section className="panel setting-panel">
                <div className="section-heading">
                  <div>
                    <h2>멤버와 권한</h2>
                    <p>요청은 함께, 최종 반영은 관리자가.</p>
                  </div>
                </div>
                <div className="member-row">
                  <span className="avatar">C</span>
                  <div>
                    <strong>{authenticatedUser?.email || "데모 관리자"}</strong>
                    <small>테스트 환경의 최초 관리자</small>
                  </div>
                  <span className="badge blue">{role === "owner" ? "최고 관리자" : role === "admin" ? "관리자" : "편집자"}</span>
                </div>
                <div className="role-description">
                  <p>
                    <strong>관리자</strong> 요청 작성, 반영 승인, 되돌리기, 인증
                    관리
                  </p>
                  <p>
                    <strong>편집자</strong> 요청 작성, 결과 확인
                  </p>
                </div>
                {!authenticatedUser && <label className="role-switch">
                  권한 체험{" "}
                  <select
                    aria-label="테스트 역할"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="admin">관리자로 보기</option>
                    <option value="editor">편집자로 보기</option>
                  </select>
                </label>}
                <p className="fine-print">
                  {authenticatedUser ? "Google 로그인과 서버 접근 제어가 적용되었습니다. 요청·승인·복원은 아직 데모입니다." : "화면 확인용 역할 전환입니다. 실제 로그인은 별도 테스트 배포에서 확인합니다."}
                </p>
              </section>
              <section className="panel setting-panel reset-panel">
                <div>
                  <h2>데모 초기화</h2>
                  <p>
                    이 브라우저의 테스트 요청을 지우고 예시 상태로 돌아갑니다.
                  </p>
                </div>
                <button className="secondary" onClick={() => setModal("reset")}>
                  초기화
                </button>
              </section>
            </div>
          )}
          <footer className="page-footer">
            <span>MNG Lab · 홈페이지 관리</span>
            <span>
              테스트 환경 <i />
              운영 홈페이지와 분리되어 있어요
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {notice}
        </div>
      )}
      {modal === "new" && (
        <Modal title="무엇을 수정할까요?" close={() => setModal(null)}>
          <RequestForm submit={addRequest} cancel={() => setModal(null)} />
        </Modal>
      )}
      {modal === "reset" && (
        <Modal title="테스트 내용을 초기화할까요?" close={() => setModal(null)}>
          <div className="modal-body">
            <p>
              이 브라우저에서 만든 요청과 진행 상태가 지워집니다. GitHub와 실제
              홈페이지에는 영향을 주지 않습니다.
            </p>
          </div>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setModal(null)}>
              취소
            </button>
            <button
              className="primary"
              onClick={() => {
                setRequests(initialRequests());
                setModal(null);
                setNotice("데모를 초기 상태로 되돌렸어요.");
              }}
            >
              초기화하기
            </button>
          </div>
        </Modal>
      )}
      {modal === "rollback" && current && (
        <Modal
          title="이 시점으로 홈페이지를 복원할까요?"
          close={() => setModal("detail")}
        >
          <div className="modal-body">
            <div className="rollback-target">
              <span className="page-tag">{pageLabel(current.page)}</span>
              <h3>{current.title}</h3>
              <p>
                요청 #{current.id} · {date(current.date)}
              </p>
            </div>
            <p>
              요청 #{current.id}가 반영된 직후의{" "}
              <strong>홈페이지 전체 상태</strong>로 복원하는 새 요청을 만듭니다.
              해당 요청의 변경은 유지됩니다.
            </p>
            <div className="rollback-scope">
              <strong>
                현재 홈페이지에서 제거될 변경 · {impact.removed.length}건
              </strong>
              {impact.removed.length ? (
                <ul className="impact-list">
                  {impact.removed.map((r) => (
                    <li key={r.id}>
                      <span className="page-tag">{pageLabel(r.page)}</span>
                      <span>
                        #{r.id} {r.title}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>제거되는 변경은 없습니다.</p>
              )}
              {impact.restored.length > 0 && (
                <>
                  <strong>다시 포함될 변경 · {impact.restored.length}건</strong>
                  <ul className="impact-list">
                    {impact.restored.map((r) => (
                      <li key={r.id}>
                        #{r.id} {r.title}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="inline-note">
              <Icon name="info" size={17} />
              복원 결과를 확인하고 승인해야 반영됩니다. 기존 요청·배포 이력은
              삭제하지 않으며 복원 기록이 새로 추가됩니다.
            </div>
          </div>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setModal("detail")}>
              취소
            </button>
            <button
              className="primary"
              disabled={!isAdmin || !canRollback(current, requests)}
              onClick={() => rollback(current)}
            >
              <Icon name="undo" size={17} />
              복원 요청 만들기
            </button>
          </div>
        </Modal>
      )}
      {modal === "detail" && !current && (
        <Modal title="요청을 찾을 수 없어요" close={() => setModal(null)}>
          <div className="modal-body">
            <p>
              이 브라우저에 저장되지 않은 요청이거나 초기화된 테스트 요청입니다.
            </p>
          </div>
          <div className="modal-actions">
            <button className="primary" onClick={() => setModal(null)}>
              목록으로 돌아가기
            </button>
          </div>
        </Modal>
      )}
      {modal === "detail" && current && (
        <Modal title={current.title} close={() => setModal(null)} wide>
          <div className="modal-body">
            <div className="detail-meta">
              <span>#{current.id}</span>
              <span className="page-tag">{pageLabel(current.page)}</span>
              <span>
                {date(current.date)} · {current.author}
              </span>
              <Badge status={current.status} />
            </div>
            <div className="progress-steps">
              {["요청 접수", "자동 작업", "변경 확인", "홈페이지 반영"].map(
                (label, i) => (
                  <div
                    key={label}
                    className={
                      STATUS[current.status].step >= i ? "reached" : ""
                    }
                  >
                    <span>
                      {STATUS[current.status].step > i ? (
                        <Icon name="check" size={13} />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <small>{label}</small>
                  </div>
                ),
              )}
            </div>
            {current.kind === "restore" && (
              <div className="restore-summary">
                <strong>
                  홈페이지 전체 복원 · 요청 #{current.sourceId} 반영 직후
                </strong>
                <p>
                  현재 홈페이지에서 제거되는 변경{" "}
                  {(current.removedRequestIds || []).length}건
                </p>
                <ul className="impact-list">
                  {(current.removedRequestIds || []).map((id) => (
                    <li key={id}>
                      #{id}{" "}
                      {requests.find((r) => r.id === id)?.title || "이전 요청"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <h3 className="detail-label">요청 내용</h3>
            <p className="request-description">{current.description}</p>
            {current.status === "failed" && (
              <div className="error-note">
                <strong>작업을 완료하지 못했어요</strong>
                <p>{current.error}</p>
              </div>
            )}
            {current.status === "cancelled" && (
              <div className="inline-note">
                <Icon name="info" size={17} />
                취소된 요청이에요. 홈페이지는 변경되지 않았습니다.
              </div>
            )}
            {["review", "deploying", "done"].includes(current.status) && (
              <>
                <div className="diff-heading">
                  <h3 className="detail-label">변경 미리보기</h3>
                  <span>예시 텍스트 비교</span>
                </div>
                <div className="diff-grid">
                  <div className="before">
                    <label>변경 전</label>
                    <p>{current.before || "기존 내용"}</p>
                  </div>
                  <div className="after">
                    <label>변경 후</label>
                    <p>{current.after || current.description}</p>
                  </div>
                </div>
                <div className="verification">
                  <Icon name="check" size={16} />
                  <span>데모 검사 통과</span>
                  <small>실제 빌드 검증은 GitHub 연동 후 제공됩니다.</small>
                </div>
              </>
            )}
            {["queued", "working", "deploying"].includes(current.status) && (
              <div className="working-note">
                <span className="spinner" />
                <span>
                  {current.status === "deploying"
                    ? "홈페이지 반영을 시뮬레이션하고 있어요."
                    : "자동 수정 흐름을 시뮬레이션하고 있어요."}
                </span>
              </div>
            )}
            {!isAdmin && ["review", "done"].includes(current.status) && (
              <div className="inline-note">
                <Icon name="shield" size={17} />
                최종 반영과 되돌리기는 관리자만 할 수 있어요.
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setModal(null)}>
              닫기
            </button>
            <div className="action-group">
              {isAdmin &&
                ["queued", "working", "review", "failed"].includes(
                  current.status,
                ) && (
                  <button
                    className="text-button danger"
                    onClick={() => {
                      changeStatus(current.id, "cancelled");
                      setNotice("테스트 요청을 취소했어요.");
                    }}
                  >
                    요청 취소
                  </button>
                )}
              {current.status === "failed" && current.kind !== "restore" && (
                <button
                  className="primary"
                  onClick={() => changeStatus(current.id, "queued")}
                >
                  다시 시도
                </button>
              )}
              {current.status === "review" && isAdmin && (
                <button
                  className="primary"
                  onClick={() => {
                    changeStatus(current.id, "deploying");
                    setNotice(
                      "테스트 반영을 시작했어요. 실제 홈페이지는 바뀌지 않습니다.",
                    );
                  }}
                >
                  <Icon name="check" size={18} />
                  확인하고 반영하기
                </button>
              )}
              {isAdmin && canRollback(current, requests) && (
                <button
                  className="secondary"
                  onClick={() => setModal("rollback")}
                >
                  <Icon name="undo" size={17} />이 시점으로 복원
                </button>
              )}
              {current.status === "done" && !canRollback(current, requests) && (
                <span className="fine-print">
                  {currentRevision?.id === current.id
                    ? "현재 반영된 시점이에요"
                    : "같은 상태이거나 진행 중인 복원 요청이 있어요"}
                </span>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
function RequestForm({ submit, cancel }) {
  const [page, setPage] = useState("홈");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  function send(e) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("요청 제목과 수정할 내용을 입력해주세요.");
      return;
    }
    submit({
      page,
      title: title.trim(),
      description: description.trim(),
      before: "기존 홈페이지 내용 (예시)",
      after: description.trim(),
    });
  }
  return (
    <form onSubmit={send}>
      <div className="modal-body request-form">
        <p className="form-intro">
          어려운 용어 없이, 바꾸고 싶은 내용을 편하게 적어주세요.
        </p>
        <label>
          어느 페이지인가요?
          <select value={page} onChange={(e) => setPage(e.target.value)}>
            {PAGES.map((p) => (
              <option key={p} value={p}>
                {pageLabel(p)}
              </option>
            ))}
          </select>
        </label>
        <label>
          요청 제목
          <input
            autoFocus
            maxLength={100}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 구성원 소개의 이메일을 변경해주세요"
          />
        </label>
        <label>
          어떻게 바꾸면 될까요?
          <textarea
            required
            maxLength={5000}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              "현재 내용과 바꿀 내용을 함께 적으면 더 정확해요.\n예: 김민수 연구원의 이메일을 새 주소로 변경해주세요."
            }
          />
        </label>
        <div className="inline-note">
          <Icon name="info" size={17} />
          화면 체험용입니다. 실제 개인정보나 인증정보는 입력하지 마세요.
        </div>
        {error && (
          <p role="alert" className="error-note">
            {error}
          </p>
        )}
      </div>
      <div className="modal-actions">
        <button type="button" className="secondary" onClick={cancel}>
          취소
        </button>
        <button className="primary" type="submit">
          <Icon name="plus" size={17} />
          테스트 요청 보내기
        </button>
      </div>
    </form>
  );
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthGate>{(user) => <App authenticatedUser={user} />}</AuthGate>
    </BrowserRouter>
  </React.StrictMode>,
);

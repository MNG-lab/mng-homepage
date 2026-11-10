import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const url = "http://127.0.0.1:4192";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--config",
    "admin/vite.config.js",
    "--port",
    "4192",
  ],
  { stdio: "pipe" },
);
let browser;
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(url)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* Wait for the owned preview server. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, "Preview server did not start");
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForURL("**/dashboard");
  await page
    .getByRole("button", { name: /^수정 요청/ })
    .first()
    .click();
  await page.waitForURL("**/requests");
  await page.getByRole("button", { name: "변경 이력", exact: true }).click();
  await page.waitForURL("**/history");
  await page.goBack();
  await page.waitForURL("**/requests");
  await page.goForward();
  await page.waitForURL("**/history");
  await page.reload();
  await page.getByRole("heading", { name: "변경 이력", exact: true }).waitFor();
  await page.getByRole("button", { name: "대시보드", exact: true }).click();
  await page.getByRole("button", { name: "변경 확인하기" }).click();
  await page.waitForURL("**/requests/104");
  await page.goBack();
  await page.waitForURL("**/dashboard");
  assert.equal(await page.locator("dialog").count(), 0);
  await page.goForward();
  await page.waitForURL("**/requests/104");
  await page.reload();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "창 닫기" }).click();
  await page.waitForURL("**/dashboard");
  await page.goto(`${url}/requests/99999`);
  await page.getByRole("heading", { name: "요청을 찾을 수 없어요" }).waitFor();
  await page.getByRole("button", { name: "목록으로 돌아가기" }).click();
  await page.waitForURL("**/requests");
  await page.getByRole("button", { name: "대시보드", exact: true }).click();
  console.log(
    "PASS: page URLs, back/forward, refresh, detail links and unknown requests",
  );
  await page.getByRole("button", { name: "새 수정 요청", exact: true }).click();
  await page.getByLabel("어느 페이지인가요?").waitFor();
  assert.deepEqual(
    await page
      .getByLabel("어느 페이지인가요?")
      .locator("option")
      .allTextContents(),
    [
      "Home",
      "Research",
      "Professor",
      "Members",
      "Publications",
      "Gallery",
      "Contact",
    ],
  );
  await page
    .getByLabel("어느 페이지인가요?")
    .selectOption({ label: "Members" });
  await page
    .getByLabel("요청 제목", { exact: true })
    .fill("테스트 이메일 변경");
  await page
    .getByLabel("어떻게 바꾸면 될까요?")
    .fill("기존 주소를 example@example.com으로 변경");
  await page.getByRole("button", { name: "테스트 요청 보내기" }).click();
  await page
    .getByRole("button", { name: "확인하고 반영하기" })
    .waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "확인하고 반영하기" }).click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("mng-admin-demo-v1"))[0].status ===
      "done",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "이 시점으로 복원", exact: true })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "창 닫기" }).click();
  await page
    .locator(".request-link")
    .filter({ hasText: "홈 화면의 연구실 소식을 업데이트해주세요" })
    .click();
  await page
    .getByRole("button", { name: "이 시점으로 복원", exact: true })
    .click();
  await page.getByText("현재 홈페이지에서 제거될 변경 · 1건").waitFor();
  await page
    .getByRole("button", { name: "복원 요청 만들기", exact: true })
    .click();
  await page
    .getByRole("button", { name: "확인하고 반영하기" })
    .waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "확인하고 반영하기" }).click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("mng-admin-demo-v1"))[0].status ===
      "done",
  );
  await page.getByRole("button", { name: "창 닫기" }).click();
  assert.equal(
    await page
      .locator(".request-link")
      .filter({ hasText: "시점 복원: #103 반영 직후" })
      .count(),
    1,
  );
  const snapshot = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mng-admin-demo-v1")),
  );
  assert.deepEqual(snapshot[0].snapshotIds, [102, 103]);
  assert(
    snapshot.some(
      (r) => r.title === "테스트 이메일 변경" && r.status === "done",
    ),
  );
  console.log(
    "PASS: restore entire snapshot, remove later change, retain all history",
  );
  await page.reload();
  assert.equal(
    await page
      .locator(".request-link")
      .filter({ hasText: "시점 복원: #103 반영 직후" })
      .count(),
    1,
  );
  console.log("PASS: demo persistence after reload");
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await page.getByLabel("테스트 역할").selectOption("editor");
  await page.getByRole("button", { name: "대시보드", exact: true }).click();
  await page.getByRole("button", { name: "변경 확인하기" }).click();
  assert.equal(
    await page.getByRole("button", { name: "확인하고 반영하기" }).count(),
    0,
  );
  await page.getByRole("button", { name: "창 닫기" }).click();
  console.log("PASS: editor cannot see approval controls");
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await page.getByRole("button", { name: "초기화", exact: true }).click();
  await page.getByRole("button", { name: "초기화하기", exact: true }).click();
  await page.getByLabel("테스트 역할").selectOption("admin");
  await page.getByRole("button", { name: "대시보드", exact: true }).click();
  await page
    .getByRole("button", { name: /^연구실 단체 사진을 교체해주세요/ })
    .first()
    .click();
  await page.getByRole("button", { name: "다시 시도" }).click();
  await page
    .getByRole("button", { name: "확인하고 반영하기" })
    .waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "요청 취소", exact: true }).click();
  assert.equal(
    await page
      .getByText("취소된 요청이에요. 홈페이지는 변경되지 않았습니다.")
      .count(),
    1,
  );
  await page.keyboard.press("Escape");
  console.log("PASS: retry, cancellation and dialog Escape");
  await page
    .getByRole("button", { name: /^수정 요청/ })
    .first()
    .click();
  await page.getByLabel("요청 검색").fill("없는검색어");
  await page.getByText("표시할 요청이 없어요").waitFor();
  await page.getByRole("button", { name: "대시보드", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await page.getByRole("button", { name: "새 수정 요청", exact: true }).click();
  assert(
    await page
      .locator("dialog")
      .evaluate((el) => el.getBoundingClientRect().right <= window.innerWidth),
  );
  console.log("PASS: search empty state, mobile layout and dialog");
  assert.deepEqual(errors, []);
  console.log("PASS: no browser runtime errors");
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}

# MNG Lab 페이지 사용 가이드

이 저장소는 `mng-lab-demo.jsx` 단일 React 컴포넌트로 구성된 데모 페이지입니다.  
바로 실행되는 프로젝트 구조가 아니므로, 아래 절차로 React 앱에 연결해 사용하세요.

## 1) 사전 준비

- Node.js 18 이상 권장
- npm(또는 yarn/pnpm)

버전 확인:

```bash
node -v
npm -v
```

## 2) 실행 방법

### macOS

1. 작업 폴더로 이동
```bash
cd /Users/user/Desktop/mng-homepage
```
2. Vite React 프로젝트 생성
```bash
npm create vite@latest mng-lab-app -- --template react
```
3. 생성된 프로젝트로 이동 후 의존성 설치
```bash
cd mng-lab-app
npm install
```
4. 데모 컴포넌트 복사
```bash
cp ../mng-lab-demo.jsx ./src/MNGLab.jsx
```
5. `src/App.jsx`를 아래처럼 수정
```jsx
import MNGLab from "./MNGLab";

export default function App() {
  return <MNGLab />;
}
```
6. 개발 서버 실행
```bash
npm run dev
```
7. 터미널에 표시되는 로컬 주소(예: `http://localhost:5173`) 접속

### Windows (PowerShell)

1. 작업 폴더로 이동
```powershell
cd C:\Users\user\Desktop\mng-homepage
```
2. Vite React 프로젝트 생성
```powershell
npm create vite@latest mng-lab-app -- --template react
```
3. 생성된 프로젝트로 이동 후 의존성 설치
```powershell
cd .\mng-lab-app
npm install
```
4. 데모 컴포넌트 복사
```powershell
Copy-Item ..\mng-lab-demo.jsx .\src\MNGLab.jsx
```
5. `src\App.jsx`를 아래처럼 수정
```jsx
import MNGLab from "./MNGLab";

export default function App() {
  return <MNGLab />;
}
```
6. 개발 서버 실행
```powershell
npm run dev
```
7. 터미널에 표시되는 로컬 주소(예: `http://localhost:5173`) 접속

## 3) 페이지 사용법

- 상단 네비게이션: 각 섹션 이름 클릭으로 탐색
- Hero 섹션: 5초마다 자동 슬라이드 전환, 하단 버튼으로 수동 전환 가능
- Research/Structure 섹션: 카드/탭 상호작용으로 상세 내용 확인
- 외부 링크:
  - Google Scholar: 새 탭 이동
  - Email(Contact): 메일 앱 실행

## 4) 주요 파일

- `mng-lab-demo.jsx`: 전체 페이지 UI/로직이 포함된 메인 컴포넌트

## 5) 커스터마이징 포인트

- 색상 변경: `const C = { ... }`
- 폰트/타이포그래피: `font()` 함수
- 섹션별 데이터:
  - Hero: `slides`
  - Research: `areas`
  - News: `news`
  - Structure 비교표: `pages`

## 6) 문제 해결

- `npm` 명령이 없으면: Node.js 설치/재설치 후 터미널 재시작
- 포트 충돌 시:
```bash
npm run dev -- --port 5174
```
- 폰트가 느리게 로드되면: 네트워크 상태 확인(구글 폰트 CDN 사용)

## 7) GitHub Pages 배포(자동)

이 저장소에는 GitHub Actions 배포 파일이 포함되어 있습니다.

- 워크플로 파일: `.github/workflows/deploy-pages.yml`
- `main` 브랜치에 push하면 자동으로 빌드 후 Pages에 배포됩니다.

최초 1회 설정:

1. GitHub 저장소 접속
2. `Settings > Pages`
3. `Build and deployment`의 `Source`를 `GitHub Actions`로 선택
4. 변경사항을 `main`에 push
5. `Actions` 탭에서 `Deploy to GitHub Pages` 성공 확인
6. 배포 URL 접속  
   예: `https://MNG-lab.github.io/mng-homepage/`

import React,{useState} from 'react';
const guides={
 mac:{label:'Mac',path:'~/.codex/auth.json',open:'파일 선택 창에서 ⌘ + Shift + G를 누르고 아래 경로를 붙여넣으세요.',terminal:'Spotlight(⌘ + Space)에서 터미널을 검색해 여세요.'},
 windows:{label:'Windows',path:'%USERPROFILE%\\.codex\\auth.json',open:'파일 선택 창의 파일 이름 칸에 아래 경로를 붙여넣고 열기를 누르세요.',terminal:'시작 메뉴에서 PowerShell을 검색해 여세요.'}
};
const loginCommand=`npx --yes @openai/codex -c 'cli_auth_credentials_store="file"' login`;
export default function CodexGuide(){
 const [os,setOs]=useState('mac'),[message,setMessage]=useState('');const guide=guides[os];
 async function copy(value){try{await navigator.clipboard.writeText(value);setMessage('복사했습니다. 안내된 창에 붙여넣으세요.');}catch{setMessage('복사하지 못했습니다. 아래 내용을 직접 선택해서 복사해 주세요.');}}
 return <div className="credential-guide"><h3>인증 파일 준비하기</h3><p>로그인한 Codex의 인증 파일을 선택하면 됩니다. 파일 내용을 복사하거나 채팅에 보내지 않아도 됩니다.</p>
 <div className="os-options" role="group" aria-label="사용하는 컴퓨터">{Object.entries(guides).map(([key,g])=><button type="button" className="secondary" aria-pressed={os===key} key={key} onClick={()=>{setOs(key);setMessage('');}}>{g.label}</button>)}</div>
 <ol className="guide-steps"><li>이 컴퓨터의 Codex에 사용할 ChatGPT 계정으로 로그인하세요.</li><li>아래 <strong>인증 파일 선택</strong>을 누르세요. {guide.open}<div className="copy-box"><code>{guide.path}</code><button type="button" className="secondary" onClick={()=>copy(guide.path)}>파일 경로 복사</button></div></li><li><strong>테스트 인증 갱신</strong>을 누르고 확인하면 다음 작업부터 사용합니다.</li></ol>
 <details><summary>파일이 없거나 다시 로그인해야 하나요?</summary><div className="guide-help"><p>{guide.terminal} 아래 명령을 복사해 붙여넣고 Enter를 누른 뒤, 열린 브라우저에서 로그인하세요.</p><div className="copy-box"><code>{loginCommand}</code><button type="button" className="secondary" onClick={()=>copy(loginCommand)}>로그인 명령 복사</button></div><p>공식 Codex CLI를 내려받아 로그인하고 인증 파일을 저장합니다. 완료되면 위의 파일 선택 단계로 돌아오세요. 홈페이지 수정 작업은 실행하지 않습니다.</p><p>처음 사용하는 컴퓨터에는 <a href="https://nodejs.org/en/download" target="_blank" rel="noreferrer">Node.js LTS</a>가 필요합니다. npx를 찾을 수 없다면 설치 후 터미널을 다시 여세요. 회사의 저장 정책 때문에 파일을 만들 수 없거나 Codex 저장 위치를 따로 설정했다면 개발 담당자에게 확인하세요.</p><a className="text-button" href="https://developers.openai.com/codex/auth/" target="_blank" rel="noreferrer">공식 로그인 안내 ↗</a></div></details>
 {message&&<p role="status">{message}</p>}<p className="progress-note">인증 파일에는 로그인 정보가 들어 있습니다. 이 어드민의 파일 선택으로만 등록하고 메신저·이슈·저장소에 올리지 마세요.</p></div>;
}

export const pages = ['Home','Research','Professor','Members','Publications','Gallery','Contact','Multiple'];
export const requestTypes = ['텍스트/문구 수정','링크 수정','이미지 교체/추가','레이아웃/스타일 수정','콘텐츠 신규 추가','버그 수정','기타'];
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const websiteURL = page => 'https://dglab.yonsei.ac.kr/' + (page === 'Home' ? '' : page.toLowerCase());
export const fieldLabels = {requestType:'수정 유형',targetUrls:'대상 페이지 URL',currentState:'현재 상태 (문제)',description:'원하는 상태 (수정 결과)',sourceLinks:'기준 자료/근거 링크',imageLinks:'첨부 이미지 URL (선택)',exactText:'정확한 문구 (있으면 필수)',outOfScope:'하지 말아야 할 것 (선택)',notes:'추가 메모 (선택)'};

export function normalizeRequest(input) {
  const fail = message => {throw Object.assign(new Error(message),{status:400});};
  const text = (key,max=5000,required=false) => {
    const value=input[key]??'';
    if(typeof value!=='string'||value.length>max||value.includes('\0')||(required&&!value.trim()))fail('요청 항목과 글자 수를 확인해 주세요.');
    return value.trim();
  };
  if(!UUID.test(input.requestId||''))fail('요청 식별자를 확인해 주세요.');
  const result={requestId:input.requestId,kind:input.kind||'change',title:text('title',100,true)};
  if(result.kind==='rollback') {
    result.rollbackType=text('rollbackType',10,true);
    result.rollbackTarget=text('rollbackTarget',40);
    result.reason=text('reason',5000,true);result.expectedResult=text('expectedResult',5000,true);
    if(!['latest','pr','commit'].includes(result.rollbackType))fail('취소할 변경을 선택해 주세요.');
    if(result.rollbackType==='pr'&&!/^#?[1-9]\d{0,9}$/.test(result.rollbackTarget))fail('PR 번호를 확인해 주세요.');
    if(result.rollbackType==='commit'&&!/^[a-f\d]{7,40}$/i.test(result.rollbackTarget))fail('커밋 번호는 7~40자리 영문·숫자 SHA로 입력해 주세요.');
    if(result.rollbackType==='latest')result.rollbackTarget='';
    if(result.rollbackType==='commit')result.rollbackTarget=result.rollbackTarget.toLowerCase();
    if(input.attachments?.length)fail('사진은 홈페이지 수정 요청에 첨부해 주세요.');
  } else if(result.kind==='change') {
    result.page=text('page',30,true);result.requestType=text('requestType',40)||'기타';
    if(!pages.includes(result.page)||!requestTypes.includes(result.requestType))fail('페이지와 수정 유형을 확인해 주세요.');
    for(const key of Object.keys(fieldLabels).filter(key=>key!=='requestType'))result[key]=text(key,key==='description'?10000:5000,key==='description');
    if(!result.targetUrls&&result.page!=='Multiple')result.targetUrls=websiteURL(result.page);
    const targets=result.targetUrls.split(/\s+/).filter(Boolean);
    if(!targets.length||targets.length>20||targets.some(value=>{try{return !['http:','https:'].includes(new URL(value).protocol);}catch{return true;}}))fail('대상 페이지 주소를 한 줄에 하나씩 입력해 주세요.');
    result.attachments=input.attachments??[];
    if(!Array.isArray(result.attachments)||result.attachments.length>8||new Set(result.attachments.map(a=>a?.id)).size!==result.attachments.length)fail('사진은 최대 8개까지 첨부할 수 있습니다.');
    result.attachments=result.attachments.map(a=>{if(!UUID.test(a?.id||'')||typeof(a.caption??'')!=='string'||(a.caption??'').length>200)fail('첨부 사진 정보를 확인해 주세요.');return {id:a.id,caption:(a.caption||'').trim()};});
  } else fail('요청 유형을 확인해 주세요.');
  if(JSON.stringify(result).length>42000)fail('요청이 너무 깁니다. 내용을 나누어 작성해 주세요.');
  return result;
}

const section=(heading,value)=>`### ${heading}\n\n${value||'_No response_'}\n\n`;
const alt=value=>value.replace(/[\\\[\]<>\r\n]/g,' ');
export function requestBody(input,config,attachments=[]) {
  const prefix=`${config.marker}\n<!-- request-id:${input.requestId} -->\n\n`;
  if(input.kind==='rollback')return prefix+(input.rollbackType==='latest'?'':section('롤백 유형',input.rollbackType)+section('롤백 대상',input.rollbackTarget))+section('롤백 사유',input.reason)+section('기대 결과',input.expectedResult);
  const images=attachments.map(a=>`![${alt(a.caption||a.name)}](${a.url})`).join('\n\n');
  return prefix+section('작업 대상',config.base)+section('페이지',input.page==='Multiple'?'여러 페이지 / 직접 입력':input.page)+Object.entries(fieldLabels).map(([key,label])=>section(label,key==='imageLinks'?[input.imageLinks,images].filter(Boolean).join('\n\n'):input[key])).join('')+section('언어 반영','별도 요청이 없으면 국문·영문에 함께 반영합니다.')+(config.mode==='production'?'관리자 승인 후 운영 홈페이지에 반영됩니다.':'운영 홈페이지에 반영되지 않는 테스트 요청입니다.');
}

export function requestSections(body='') {
  const clean=String(body||'').replace(/<!--[\s\S]*?-->/g,'').trim();
  const allowed=new Set([...Object.values(fieldLabels),'롤백 유형','롤백 대상','롤백 사유','기대 결과','언어 반영','취소 대상 커밋']);
  const headings=[...clean.matchAll(/^### (.+)\r?\n/gm)].filter(m=>allowed.has(m[1].trim()));
  return headings.map((m,index)=>({label:m[1].trim(),text:clean.slice(m.index+m[0].length,headings[index+1]?.index).trim().replace(/\n\n(?:관리자 승인 후|운영 홈페이지에 반영되지)[\s\S]*$/,'')})).filter(s=>s.text&&s.text!=='_No response_');
}

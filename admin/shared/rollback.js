export function parseRollback(issue) {
  const labels=new Set((issue.labels||[]).map(value=>typeof value==='string'?value:value.name));
  const section=heading=>{
    const lines=(issue.body||'').split(/\r?\n/),start=lines.indexOf('### '+heading);
    if(start<0)return '';
    const rest=lines.slice(start+1),end=rest.findIndex(line=>line.startsWith('### '));
    const value=rest.slice(0,end<0?undefined:end).join('\n').trim();
    return value==='_No response_'?'':value;
  };
  const simple=labels.has('rollback-simple-request');
  if(!simple&&!labels.has('rollback-request'))throw Error('변경 취소 요청 라벨이 없습니다.');
  const raw=section('취소할 대상')||section('롤백 유형');
  const type=simple?'latest':({'PR 번호':'pr','커밋 번호':'commit'}[raw]||raw.toLowerCase()),target=simple?'':section('대상 번호')||section('롤백 대상');
  if(!['latest','pr','commit'].includes(type))throw Error('취소할 대상 유형을 확인해 주세요.');
  if(type==='pr'&&!/^#?[1-9]\d{0,9}$/.test(target))throw Error('PR 번호를 확인해 주세요.');
  if(type==='commit'&&!/^[a-f\d]{7,40}$/i.test(target))throw Error('커밋 번호를 확인해 주세요.');
  return {type,target:type==='commit'?target.toLowerCase():target,reason:section('취소하려는 이유')||section('롤백 사유')||'사유 미입력',expected:section('취소 후 확인할 내용')||section('기대 결과')||'지정한 변경을 취소하고 이후의 다른 변경은 유지합니다. 충돌하면 검토를 위해 중단합니다.'};
}

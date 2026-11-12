export function parseRollback(issue) {
  const labels=new Set((issue.labels||[]).map(value=>typeof value==='string'?value:value.name));
  const section=heading=>{
    const lines=(issue.body||'').split(/\r?\n/),start=lines.indexOf('### '+heading);
    if(start<0)return '';
    const rest=lines.slice(start+1),end=rest.findIndex(line=>line.startsWith('### '));
    return rest.slice(0,end<0?undefined:end).join('\n').trim();
  };
  const simple=labels.has('rollback-simple-request');
  if(!simple&&!labels.has('rollback-request'))throw Error('변경 취소 요청 라벨이 없습니다.');
  const type=simple?'latest':section('롤백 유형').toLowerCase(),target=simple?'':section('롤백 대상');
  if(!['latest','pr','commit'].includes(type))throw Error('취소할 대상 유형을 확인해 주세요.');
  if(type==='pr'&&!/^#?[1-9]\d{0,9}$/.test(target))throw Error('PR 번호를 확인해 주세요.');
  if(type==='commit'&&!/^[a-f\d]{7,40}$/i.test(target))throw Error('커밋 번호를 확인해 주세요.');
  return {type,target:type==='commit'?target.toLowerCase():target,reason:section('롤백 사유')||'사유 미입력',expected:section('기대 결과')};
}

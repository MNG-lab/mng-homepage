// Only verified runner results classify a conflict. Missing results stay unknown.
export const rollbackFailureCodes=['rollback_conflict','rollback_no_changes'];
export function requestFailure(code){
 return {
  rollback_conflict:{label:'자동 취소 불가',title:'이 변경만 자동으로 취소할 수 없어요',description:'이후 작업에서 같은 내용을 수정해, 어떤 내용을 남길지 확인이 필요합니다.',next:'새 수정 요청에 남길 내용과 바꿀 내용을 적어 주세요. 직접 판단하기 어렵다면 개발 담당자에게 이 요청을 전달해 주세요.',unchanged:true},
  rollback_no_changes:{label:'취소할 변경 없음',title:'이미 취소되었거나, 취소할 내용이 없어요',description:'현재 홈페이지에 취소할 변경이 남아 있지 않습니다.',next:'홈페이지가 원하는 상태인지 확인해 주세요. 추가로 바꿀 내용이 있으면 새 수정 요청을 작성하세요.',unchanged:true},
  rollback_unverified:{label:'원인 확인 필요',title:'작업이 멈춘 원인을 확인하지 못했어요',description:'실패 원인이 아직 확인되지 않아 바로 다시 실행할 수 없습니다.',next:'잠시 후에도 이 안내가 보이면 개발 담당자에게 이 요청과 실행 기록을 전달해 주세요.'}
 }[code]||null;
}

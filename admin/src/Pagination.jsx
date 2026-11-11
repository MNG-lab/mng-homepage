import React from 'react';
export default function Pagination({value,onChange,loading=false,label='요청 목록 페이지'}){
 if(!value)return null;
 const {page,pages,total,pageSize}=value;
 return <nav className="request-pagination" aria-label={label}><p role="status">{total?`${total}건 중 ${(page-1)*pageSize+1}–${Math.min(page*pageSize,total)}건`:'0건'} <span>· 한 페이지에 {pageSize}개</span></p><div><button className="secondary" disabled={loading||page<=1} onClick={()=>onChange(page-1)}>이전</button><span aria-live="polite">{page} / {pages} 페이지</span><button className="secondary" disabled={loading||page>=pages} onClick={()=>onChange(page+1)}>다음</button></div></nav>;
}

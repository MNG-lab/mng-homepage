import React from 'react';

const range=(start,end)=>Array.from({length:end-start+1},(_,i)=>start+i);

export default function Pagination({value,onChange,loading=false,label='요청 목록 페이지'}) {
 if(!value)return null;
 const {page,pages}=value;
 const numbers=pages<=7?range(1,pages):page<=4?[...range(1,5),'end',pages]:page>=pages-3?[1,'start',...range(pages-4,pages)]:[1,'start',page-1,page,page+1,'end',pages];
 return <nav className="request-pagination" aria-label={label}>
  <button type="button" className="secondary page-previous" disabled={loading||page<=1} onClick={()=>onChange(page-1)}>이전</button>
  <div className="page-numbers">{numbers.map(number=>typeof number==='number'?<button type="button" key={number} className="secondary page-number" aria-label={`${number}페이지`} aria-current={number===page?'page':undefined} disabled={loading||number===page} onClick={()=>onChange(number)}>{number}</button>:<span className="page-ellipsis" key={number} aria-hidden="true">…</span>)}</div>
  <button type="button" className="secondary page-next" disabled={loading||page>=pages} onClick={()=>onChange(page+1)}>다음</button>
 </nav>;
}

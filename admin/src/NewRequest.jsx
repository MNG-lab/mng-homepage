import React,{useEffect,useRef,useState} from 'react';
import {api} from './api.js';
import ActionButton from './ActionButton.jsx';
import {pages,websiteURL,normalizeRequest,suggestRequestTitle} from '../shared/request-form.js';
import {MAX_IMAGE_BYTES,MAX_IMAGES,MAX_REQUEST_IMAGE_BYTES} from '../shared/images.js';
const draftKey='mng-request-draft-v3';
const empty=()=>({requestId:crypto.randomUUID(),kind:'change',title:'',page:'',targetUrls:'',description:'',sourceLinks:'',exactText:'',outOfScope:''});
function initial(){try{
  const old=JSON.parse(sessionStorage.getItem(draftKey)||sessionStorage.getItem('mng-request-draft-v2')||'{}');
  if(old.kind==='rollback')return empty();
  return {...empty(),...old,kind:'change',requestType:'',description:[old.currentState&&`현재 상태: ${old.currentState}`,old.description,old.notes&&`추가 메모: ${old.notes}`].filter(Boolean).join('\n\n'),sourceLinks:[old.sourceLinks,old.imageLinks].filter(Boolean).join('\n'),currentState:'',notes:'',imageLinks:''};
}catch{return empty();}}
const bytesLabel=bytes=>bytes>=1024*1024?`${(bytes/1024/1024).toFixed(1)} MB`:`${Math.ceil(bytes/1024)} KB`;
function FieldLabel({children,required=false}) {return <span className="request-field-label">{children}{required&&<span className="request-required-mark" aria-hidden="true">*</span>}</span>;}
export default function NewRequest({onSubmitted,onCancel}) {
  const [draft,setDraft]=useState(initial),[files,setFiles]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[phase,setPhase]=useState('접수 중…'),[dragging,setDragging]=useState(false);
  const urls=useRef([]),fileInput=useRef(null),submitting=useRef(false);
  useEffect(()=>{sessionStorage.setItem(draftKey,JSON.stringify(draft));},[draft]);
  const [editTitle,setEditTitle]=useState(!!draft.title),[customUrls,setCustomUrls]=useState(draft.page==='Multiple'||!!(draft.targetUrls&&draft.targetUrls!==websiteURL(draft.page)));
  const suggestedTitle=suggestRequestTitle(draft);
  useEffect(()=>()=>urls.current.forEach(url=>URL.revokeObjectURL(url)),[]);
  function change(key,value){setDraft(previous=>({...previous,[key]:value}));}
  function changePage(page){setCustomUrls(page==='Multiple');setDraft(previous=>({...previous,page,targetUrls:page&&page!=='Multiple'?websiteURL(page):''}));}
  function addFiles(incoming) {
    if(busy)return;
    const selected=Array.from(incoming);
    if(!selected.length)return;
    if(files.length+selected.length>MAX_IMAGES){setError('사진은 최대 8개까지 첨부할 수 있습니다.');return;}
    if(selected.some(file=>!/^image\/(png|jpeg|gif|webp)$/.test(file.type))){setError('JPG, PNG, GIF, WebP 사진을 선택해 주세요. 다른 형식은 PNG 또는 JPG로 저장해 첨부할 수 있습니다.');return;}
    if(selected.some(file=>file.size>MAX_IMAGE_BYTES)){setError('사진은 파일당 10MB까지 첨부할 수 있습니다.');return;}
    if([...files.map(item=>item.file),...selected].reduce((sum,file)=>sum+file.size,0)>MAX_REQUEST_IMAGE_BYTES){setError('한 요청에 첨부하는 사진의 전체 용량은 40MB 이하여야 합니다.');return;}
    setError('');setFiles(previous=>[...previous,...selected.map(file=>{const url=URL.createObjectURL(file);urls.current.push(url);return {file,url,id:crypto.randomUUID(),caption:'',status:'ready'};})]);
  }
  async function remove(item){if(busy)return;setError('');try{if(item.attempted)await api(`/api/attachments/${item.id}/remove`,{});setFiles(previous=>previous.filter(f=>f.id!==item.id));}catch(e){setError(e.message);}}
  async function upload(item) {
    if(item.uploaded)return item.uploaded;
    setFiles(previous=>previous.map(f=>f.id===item.id?{...f,status:'uploading',attempted:true}:f));
    let response;
    try{response=await fetch(`/api/attachments/${item.id}`,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Request-Id':draft.requestId,'X-File-Name':encodeURIComponent(item.file.name)},body:item.file,credentials:'same-origin',signal:AbortSignal.timeout(90000)});}catch{throw Error('사진 업로드 응답을 확인하지 못했습니다. 다시 보내기를 누르면 같은 사진부터 확인합니다.');}
    if(response.status===401)throw Error('로그인이 만료됐습니다. 다른 탭에서 어드민에 로그인한 뒤 이 화면에서 다시 보내 주세요.');
    let value;try{value=await response.json();}catch{throw Error('사진 업로드 응답을 확인하지 못했습니다. 잠시 후 다시 보내 주세요.');}if(!response.ok)throw Error(value.error||'사진을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.');
    setFiles(previous=>previous.map(f=>f.id===item.id?{...f,status:'uploaded',uploaded:value}:f));return value;
  }
  async function submit(event) {
    event.preventDefault();if(submitting.current)return;
    setError('');let input;
    try{input=normalizeRequest({...draft,attachments:draft.kind==='change'?files.map(f=>({id:f.id,caption:f.caption})):[]});}catch(e){setError(e.message);return;}
    submitting.current=true;setBusy(true);
    try {
      if(input.kind==='change')for(let i=0;i<files.length;i++){setPhase(`사진 업로드 ${i+1}/${files.length}…`);await upload(files[i]);}
      setPhase('요청 접수 중…');const result=await api('/api/requests',input);
      sessionStorage.removeItem(draftKey);sessionStorage.removeItem('mng-request-draft-v2');sessionStorage.removeItem('mng-request-id');onSubmitted(result);
    }catch(e){setError(e.message);setFiles(previous=>previous.map(f=>f.status==='uploading'?{...f,status:'failed'}:f));}
    finally{submitting.current=false;setBusy(false);}
  }
  const field=(key,label,{required=false,rows=3,placeholder='',maxLength=5000}={})=><label className="request-field" key={key}><FieldLabel required={required}>{label}</FieldLabel><textarea aria-label={label} required={required} rows={rows} maxLength={maxLength} value={draft[key]} onChange={e=>change(key,e.target.value)} placeholder={placeholder}/></label>;
  return <form className="request-compose" onSubmit={submit} onPaste={event=>{if(event.clipboardData.files.length){event.preventDefault();addFiles(event.clipboardData.files);}}}>
    <fieldset disabled={busy} className="request-fieldset">
      <section className="panel connected-panel connected-form request-section">
        <div className="request-section-heading"><div><h2>수정할 내용</h2><p>바꿀 부분과 원하는 결과를 편하게 적어 주세요.</p></div><p className="request-required-note"><span className="request-required-mark" aria-hidden="true">*</span> 필수 입력</p></div>
        <div className="request-page-picker"><label className="request-field"><FieldLabel required>어느 페이지인가요?</FieldLabel><select required aria-label="어느 페이지인가요?" value={draft.page} onChange={e=>changePage(e.target.value)}><option value="" disabled>페이지를 선택해 주세요</option>{pages.map(page=><option key={page} value={page}>{page==='Multiple'?'여러 페이지 / 직접 입력':page}</option>)}</select></label>{draft.page&&draft.page!=='Multiple'&&<button type="button" className="text-button" aria-expanded={customUrls} onClick={()=>{setCustomUrls(value=>!value);if(customUrls)change('targetUrls',websiteURL(draft.page));}}>{customUrls?'기본 주소 사용':'다른 주소 지정'}</button>}</div>
        {customUrls&&field('targetUrls','다른 페이지 주소',{rows:2,placeholder:'주소가 있으면 한 줄에 하나씩 입력하세요. 없으면 수정 내용에 페이지 이름을 적어 주세요.'})}
        {field('description','어떻게 바꾸면 될까요?',{required:true,rows:6,maxLength:10000,placeholder:'예: Members의 홍길동 연구원 소개를 아래 문구로 바꾸고, 프로필 사진은 첨부한 사진으로 교체해 주세요.'})}
        <p className="request-help">별도 요청이 없으면 국문·영문 페이지에 함께 반영합니다.</p>
      </section>
      <section className="panel connected-panel request-section" aria-labelledby="attachments-heading"><div><h2 id="attachments-heading">사진·참고 자료</h2><p>사용할 사진이나 참고할 화면·링크가 있으면 함께 알려 주세요.</p></div>
        <div className={`attachment-dropzone ${dragging?'dragging':''}`} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);addFiles(e.dataTransfer.files);}}>
          <input ref={fileInput} className="request-file-input" type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp" aria-label="첨부할 사진 선택" onChange={e=>{addFiles(e.target.files);e.target.value='';}}/>
          <button type="button" className="secondary" onClick={()=>fileInput.current.click()}>사진 선택</button><p>여기에 끌어 놓거나 복사한 사진을 붙여넣으세요.</p><small>JPG · PNG · GIF · WebP / 파일당 10MB · 최대 8개 · 전체 40MB</small>
        </div>
        {!!files.length&&<ul className="attachment-grid">{files.map((item,index)=><li key={item.id}><a href={item.url} target="_blank" rel="noreferrer"><img src={item.url} alt={`첨부 사진 ${index+1}: ${item.file.name}`}/></a><div><strong>{item.file.name}</strong><small>{bytesLabel(item.file.size)} · {item.status==='uploading'?'업로드 중…':item.status==='uploaded'?'업로드 완료':item.status==='failed'?'업로드 재시도 필요':'전송 대기'}</small><label>사진 설명<input maxLength={200} value={item.caption} placeholder="예: 교체할 프로필 사진" onChange={e=>setFiles(previous=>previous.map(f=>f.id===item.id?{...f,caption:e.target.value}:f))}/></label><button type="button" className="text-button" aria-label={`${item.file.name} 첨부 제거`} onClick={()=>remove(item)}>첨부 제거</button></div></li>)}</ul>}
        {field('sourceLinks','참고 링크',{rows:2,placeholder:'이미지 주소, 참고 사이트, 문서 링크 등을 붙여넣으세요.'})}
      </section>
      <details className="panel connected-panel request-extra"><summary><span><strong>추가로 전달할 내용</strong><small>정확히 넣을 문구 · 변경하지 않을 부분</small></span></summary><div className="request-section">
        {field('exactText','정확히 넣을 문구',{rows:4,placeholder:'국문: …\n영문: …'})}
        {field('outOfScope','변경하지 않을 부분',{placeholder:'예: 다른 페이지의 디자인과 구성원 순서는 유지해 주세요.'})}
      </div></details>
      <section className="request-title-preview" aria-label="요청 제목"><div><span className="request-help">요청 제목</span><strong aria-live="polite">{draft.title.trim()||suggestedTitle||'내용을 입력하면 제목이 자동으로 만들어집니다.'}</strong></div><button type="button" className="text-button" aria-expanded={editTitle} onClick={()=>setEditTitle(value=>!value)}>제목 수정</button>{editTitle&&<label className="request-field"><FieldLabel>요청 제목</FieldLabel><input aria-label="요청 제목" maxLength={100} value={draft.title} onChange={e=>change('title',e.target.value)} placeholder={suggestedTitle||'비워 두면 내용에서 자동으로 만듭니다.'}/><small className="request-help">비워 두면 위 제목을 사용합니다.</small></label>}</section>
    </fieldset>
    {error&&<p className="error-note" role="alert">{error}</p>}
    <div className="request-submit-panel"><p>내용과 첨부 사진은 공개 GitHub 저장소에 등록됩니다. 비밀번호·개인정보·비공개 자료는 넣지 마세요.</p><div className="action-row"><button type="button" className="secondary" disabled={busy} onClick={onCancel}>취소</button><ActionButton type="submit" busy={busy} busyLabel={phase}>수정 요청 보내기</ActionButton></div></div>
  </form>;
}

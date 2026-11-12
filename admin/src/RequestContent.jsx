import React from 'react';
import {requestSections} from '../shared/request-form.js';
import {extractImages} from '../shared/images.js';
import {description} from '../shared/requests.js';
function Text({value}) {
  return <p className="request-content-text">{value.split(/(https?:\/\/[^\s<>"']+)/g).map((part,index)=>/^https?:\/\//.test(part)?<a key={index} href={part} target="_blank" rel="noopener noreferrer">{part}</a>:part)}</p>;
}
export default function RequestContent({body=''}) {
  const sections=requestSections(body),images=extractImages(body);
  return <div className="request-content">
    {sections.length?sections.map(section=><section key={section.label}><h3>{section.label.replace(/ \(선택\)| \(있으면 필수\)/g,'')}</h3><Text value={section.text.replace(/!\[[^\]\n]*\]\(https:\/\/[^\s)]+\)|<img\b[^>]*>/gi,'').trim()||'아래 첨부 사진을 확인해 주세요.'}/></section>):<Text value={description(body)}/>}
    {!!images.length&&<section aria-label="첨부 사진"><h3>첨부 사진</h3><ul className="request-image-gallery">{images.map((image,index)=><li key={image.url}><a href={image.url} target="_blank" rel="noopener noreferrer"><img src={image.url} alt={image.name} loading="lazy" referrerPolicy="no-referrer"/><span>사진 {index+1} · 원본 보기 ↗</span></a></li>)}</ul></section>}
  </div>;
}

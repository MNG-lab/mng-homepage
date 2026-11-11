import React from 'react';

export default function LoadingIndicator({label='불러오는 중',fullPage=false}) {
 return <div className={`content-loading${fullPage?' content-loading-page':''}`} role="status"><span className="spinner" aria-hidden="true"/><span className="sr-only">{label}</span></div>;
}

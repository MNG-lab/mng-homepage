import React from 'react';

export default function ActionButton({busy=false,busyLabel='처리 중…',disabled=false,children,className='primary',type='button',...props}) {
 return <button {...props} type={type} className={`${className} action-button`} disabled={busy||disabled} aria-busy={busy}>{busy?<><span className="spinner" aria-hidden="true"/>{busyLabel}</>:children}</button>;
}

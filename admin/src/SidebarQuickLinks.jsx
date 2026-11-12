import React from 'react';

const links = [
  { id: 'lab', title: 'dglab', description: '랩실 홈페이지', href: 'https://dglab.yonsei.ac.kr' },
  { id: 'github', title: 'GitHub', description: '프로젝트 저장소', href: 'https://github.com/MNG-lab/mng-homepage' },
];

function DestinationIcon({ id }) {
  return id === 'lab' ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18M5 6.5c4.5 2 9.5 2 14 0M5 17.5c4.5-2 9.5-2 14 0" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.09c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.64 1.22 3.28.93.1-.73.39-1.22.71-1.5-2.5-.29-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.43.11-2.98 0 0 .95-.3 3.09 1.15a10.76 10.76 0 0 1 5.63 0c2.15-1.45 3.09-1.15 3.09-1.15.61 1.55.23 2.69.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.64 5.27-5.15 5.55.4.35.76 1.03.76 2.08v3.1c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />
    </svg>
  );
}

export default function SidebarQuickLinks() {
  return (
    <section className="sidebar-quick-links" aria-labelledby="quick-links-heading">
      <h2 id="quick-links-heading">바로가기</h2>
      <nav className="quick-links-nav" aria-label="외부 사이트 바로가기">
        {links.map(link => (
          <a key={link.id} className="quick-link" href={link.href} target="_blank" rel="noopener noreferrer"
            aria-label={`${link.title} · ${link.description} (새 탭에서 열기)`}>
            <span className={`quick-link-icon ${link.id}`}><DestinationIcon id={link.id} /></span>
            <span className="quick-link-label"><strong>{link.title}</strong><small>{link.description}</small></span>
            <svg className="quick-link-external" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 14 14 6M6 6h8v8" />
            </svg>
          </a>
        ))}
      </nav>
    </section>
  );
}

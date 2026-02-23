import { useState, useEffect } from "react";

const C = {
  navy: "#0B1D3A",
  deep: "#162B4D",
  accent: "#3B82C4",
  gold: "#D4A853",
  warm: "#FAFAF7",
  off: "#F0EDE6",
  lgray: "#E8E5DE",
  mgray: "#9CA3AF",
  dark: "#1A1A1A",
  body: "#3D3D3D",
  cilia: "#3B82C4",
  metab: "#6B8E5A",
  aging: "#9B6B9E",
};

const font = (size, weight = 400, family = "dm") => ({
  fontFamily: family === "serif" ? "'Cormorant Garamond', Georgia, serif" : "'DM Sans', sans-serif",
  fontSize: size,
  fontWeight: weight,
});

// ── HEADER ──
function Header({ activeSection, onNav }) {
  const items = ["Home", "Research", "Members", "Publications", "News", "Gallery", "Join Us"];
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      background: C.navy, borderBottom: "1px solid rgba(255,255,255,0.08)",
    }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto", padding: "0 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: 56,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", ...font(13, 700, "serif"),
          }}>M</div>
          <div>
            <span style={{ color: "white", ...font(15, 600, "serif") }}>MNG Lab</span>
            <span style={{ color: "rgba(255,255,255,0.35)", ...font(10), marginLeft: 8 }}>Yonsei University</span>
          </div>
        </div>
        <nav style={{ display: "flex", gap: 22, alignItems: "center" }}>
          {items.map(item => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s/g, "-")}`}
              onClick={e => { e.preventDefault(); onNav?.(item); }}
              style={{
                color: item === "Join Us" ? C.gold : activeSection === item ? "white" : "rgba(255,255,255,0.6)",
                ...font(12, item === "Join Us" ? 500 : 400), textDecoration: "none",
                transition: "color 0.2s", cursor: "pointer",
              }}
              onMouseEnter={e => e.target.style.color = "white"}
              onMouseLeave={e => e.target.style.color = item === "Join Us" ? C.gold : activeSection === item ? "white" : "rgba(255,255,255,0.6)"}
            >{item}</a>
          ))}
        </nav>
      </div>
    </header>
  );
}

// ── HERO ──
function Hero() {
  const [active, setActive] = useState(0);
  const [vis, setVis] = useState(false);
  useEffect(() => { setVis(true); const t = setInterval(() => setActive(p => (p + 1) % 3), 5000); return () => clearInterval(t); }, []);

  const slides = [
    { title: "Rare Diseases & Ciliopathies", sub: "Unraveling the molecular basis of genetic disorders",
      desc: "We investigate how primary cilia structure and function contribute to rare genetic conditions including Carpenter syndrome and craniosynostosis, identifying novel regulators of BMP signaling and ciliogenesis.",
      grad: "linear-gradient(135deg, #0B1D3A 0%, #1a3a5c 50%, #2d5a7b 100%)", icon: "🧬", label: "Rare Diseases" },
    { title: "Obesity & Metabolic Disorders", sub: "Discovering new therapeutic targets for metabolic diseases",
      desc: "Our research explores how ciliary proteins such as CEP89 and NCS1 regulate mitophagy and ER-mitochondria contact sites, revealing novel mechanisms underlying obesity and metabolic homeostasis.",
      grad: "linear-gradient(135deg, #1a3a5c 0%, #0B1D3A 50%, #2a1a4a 100%)", icon: "⚕️", label: "Metabolic Disease" },
    { title: "Liver Fibrosis & Aging", sub: "Targeting cilia metabolism for anti-aging strategies",
      desc: "We develop anti-aging technologies through primary cilia metabolism and investigate the mechanisms of hepatic fibrosis progression, with a focus on intestinal development and villus morphogenesis.",
      grad: "linear-gradient(135deg, #2a1a4a 0%, #1a3a5c 50%, #0B1D3A 100%)", icon: "🔬", label: "Fibrosis & Aging" },
  ];

  return (
    <div style={{ position: "relative", minHeight: 480, overflow: "hidden", background: slides[active].grad, transition: "background 1.2s ease" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.05,
        backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
        backgroundSize: "60px 60px, 80px 80px" }} />
      <svg style={{ position: "absolute", right: 0, top: 0, height: "100%", width: 280, opacity: 0.07 }} viewBox="0 0 280 480">
        <path d="M140,0 Q240,60 140,120 Q40,180 140,240 Q240,300 140,360 Q40,420 140,480" fill="none" stroke="white" strokeWidth="2" />
        <path d="M140,0 Q40,60 140,120 Q240,180 140,240 Q40,300 140,360 Q240,420 140,480" fill="none" stroke="white" strokeWidth="2" />
      </svg>
      <div style={{
        position: "relative", zIndex: 2, maxWidth: 880, margin: "0 auto", padding: "72px 28px 52px",
        opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(24px)", transition: "all 0.8s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 2, background: C.gold }} />
          <span style={{ color: C.gold, ...font(12, 400, "serif"), letterSpacing: 3, textTransform: "uppercase" }}>
            Molecular NeuroGenetics Lab
          </span>
        </div>
        <div key={active} style={{ animation: "fadeUp 0.7s ease forwards" }}>
          <h1 style={{ ...font("clamp(30px,5vw,48px)", 300, "serif"), color: "white", lineHeight: 1.15, marginBottom: 10 }}>
            {slides[active].title}
          </h1>
          <p style={{ ...font(17, 400), color: "rgba(255,255,255,0.85)", fontStyle: "italic", marginBottom: 14 }}>
            {slides[active].sub}
          </p>
          <p style={{ ...font(14, 300), color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 600 }}>
            {slides[active].desc}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 36 }}>
          {slides.map((s, i) => (
            <button key={i} onClick={() => setActive(i)} style={{
              display: "flex", alignItems: "center", gap: 7,
              background: i === active ? "rgba(255,255,255,0.15)" : "transparent",
              border: `1px solid ${i === active ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 20, padding: "7px 14px", cursor: "pointer", transition: "all 0.3s",
              color: i === active ? "white" : "rgba(255,255,255,0.5)", ...font(12),
            }}>
              <span>{s.icon}</span><span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

// ── STATS ──
function Stats() {
  return (
    <div style={{ background: C.navy, padding: "40px 28px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, textAlign: "center" }}>
        {[["2010", "Lab Established"], ["15+", "Years of Research"], ["50+", "Publications"], ["3", "Research Areas"]].map(([n, l], i) => (
          <div key={i}>
            <div style={{ ...font(32, 300, "serif"), color: C.gold }}>{n}</div>
            <div style={{ ...font(10), color: "rgba(255,255,255,0.45)", letterSpacing: 1, textTransform: "uppercase" }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ABOUT ──
function About() {
  return (
    <div style={{ background: "white", padding: "72px 28px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <SectionLabel text="About Our Lab" />
        <h2 style={{ ...font("clamp(26px,4vw,36px)", 400, "serif"), color: C.navy, marginBottom: 28 }}>Welcome to MNG Lab</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36 }}>
          <div>
            <p style={{ ...font(14), color: C.body, lineHeight: 1.85, marginBottom: 18 }}>
              The Molecular NeuroGenetics Laboratory at Yonsei University focuses on understanding the biology and functions of primary cilia — organelles essential for development, signaling, and metabolic regulation.
            </p>
            <p style={{ ...font(14), color: C.body, lineHeight: 1.85 }}>
              Our research spans from fundamental cilia biology to translational studies on rare genetic disorders and metabolic diseases, utilizing advanced molecular, genetic, and imaging techniques to uncover disease mechanisms and explore therapeutic strategies.
            </p>
          </div>
          <div style={{ background: C.off, borderRadius: 10, padding: 24, borderLeft: `3px solid ${C.gold}` }}>
            <h4 style={{ ...font(16, 600, "serif"), color: C.navy, marginBottom: 14 }}>Principal Investigator</h4>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.accent}, ${C.navy})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", ...font(16, 600, "serif"),
              }}>HK</div>
              <div>
                <div style={{ ...font(16, 600, "serif"), color: C.dark }}>Hyuk Wan Ko, Ph.D.</div>
                <div style={{ ...font(12), color: C.mgray }}>Professor, Dept. of Biochemistry</div>
              </div>
            </div>
            <p style={{ ...font(12), color: C.body, lineHeight: 1.7 }}>
              Ph.D. in Neuroscience from Rutgers University. Postdoctoral training at Princeton University with expertise in cilia biology and developmental genetics.
            </p>
            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <a href="https://scholar.google.com/citations?user=vZtD7W0AAAAJ" target="_blank"
                style={{ ...font(11), color: C.accent, textDecoration: "none", padding: "3px 10px", borderRadius: 10, border: `1px solid ${C.accent}30`, background: `${C.accent}08` }}>
                Google Scholar ↗
              </a>
              <a href="mailto:kohw@yonsei.ac.kr"
                style={{ ...font(11), color: C.body, textDecoration: "none", padding: "3px 10px", borderRadius: 10, border: "1px solid #e0e0e0" }}>
                Contact ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── RESEARCH ──
function Research() {
  const [hov, setHov] = useState(null);
  const areas = [
    { num: "01", title: "Cilia Biology & Rare Genetic Diseases",
      desc: "Investigating the roles of centriole appendage proteins (SCLT1, CEP128, CEP170) in ciliogenesis using mouse models, and elucidating how MEGF8 and RAB23 cause craniosynostosis through distinct BMP signaling mechanisms in Carpenter syndrome.",
      tags: ["Primary Cilia", "Ciliogenesis", "Craniosynostosis", "BMP Signaling"], color: C.cilia },
    { num: "02", title: "Obesity & Metabolic Regulation",
      desc: "Uncovering how CEP89 deficiency drives obesity through impaired mitophagy via NCS1 at ER-mitochondria contact sites, revealing new therapeutic targets for metabolic diseases.",
      tags: ["Mitophagy", "ER-Mito Contact Sites", "Metabolic Homeostasis"], color: C.metab },
    { num: "03", title: "Liver Fibrosis & Anti-aging",
      desc: "Developing anti-aging technologies through primary cilia metabolism and investigating the role of Cilk1 in intestinal development and villus morphogenesis.",
      tags: ["Hepatic Fibrosis", "Aging", "Intestinal Development"], color: C.aging },
  ];

  return (
    <div style={{ background: C.warm, padding: "72px 28px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <SectionLabel text="What We Study" />
        <h2 style={{ ...font("clamp(26px,4vw,36px)", 400, "serif"), color: C.navy, marginBottom: 40 }}>Research Areas</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {areas.map((a, i) => (
            <div key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
              style={{
                background: "white", borderRadius: 10, padding: "28px 24px",
                transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
                transform: hov === i ? "translateY(-4px)" : "none",
                boxShadow: hov === i ? "0 12px 40px rgba(11,29,58,0.1)" : "0 1px 3px rgba(0,0,0,0.04)",
                borderLeft: `3px solid ${a.color}`,
              }}>
              <span style={{ ...font(32, 300, "serif"), color: C.lgray, display: "block", marginBottom: 10 }}>{a.num}</span>
              <h3 style={{ ...font(17, 600, "serif"), color: C.navy, marginBottom: 12, lineHeight: 1.3 }}>{a.title}</h3>
              <p style={{ ...font(12.5), color: C.body, lineHeight: 1.75, marginBottom: 16 }}>{a.desc}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {a.tags.map((t, j) => (
                  <span key={j} style={{
                    ...font(10), color: a.color, background: `${a.color}12`, padding: "2px 8px",
                    borderRadius: 10, border: `1px solid ${a.color}25`,
                  }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── NEWS ──
function News() {
  const tc = { Publication: C.accent, Funding: C.metab, Conference: C.aging };
  const news = [
    { date: "2025", type: "Publication", title: "Cilk1 in Intestinal Villus Morphogenesis",
      desc: "Song J. et al. — Cilk1 is essential for mesenchymal cilia maintenance and epithelial-mesenchymal crosstalk in intestinal villus morphogenesis. Cell Mol Gastroenterol Hepatol (IF: 7.4)" },
    { date: "2025", type: "Publication", title: "Cilk1 in Tooth Patterning via Hedgehog Signaling",
      desc: "Kyeong M. et al. — Progressive tooth pattern changes in Cilk1-deficient mice depending on Hedgehog signaling. Int J Oral Sci (IF: 12.2)" },
    { date: "2025", type: "Publication", title: "MEGF8 in Craniosynostosis",
      desc: "New findings on MEGF8 as a regulator of BMP signaling in Carpenter syndrome published in Cell Death and Differentiation." },
    { date: "2024", type: "Funding", title: "NRF Anti-aging Research Grant",
      desc: "Awarded National Research Foundation grant for developing anti-aging technologies through primary cilia metabolism." },
    { date: "2024", type: "Conference", title: "Korea-UK Collaborative Workshop",
      desc: "Invited talk on ciliary distal appendage proteins in ciliogenesis at the University of London." },
  ];

  return (
    <div style={{ background: C.off, padding: "72px 28px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <SectionLabel text="Latest Updates" />
        <h2 style={{ ...font("clamp(26px,4vw,36px)", 400, "serif"), color: C.navy, marginBottom: 36 }}>Lab News</h2>
        {news.map((n, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "52px 90px 1fr", gap: 16, padding: "20px 0", borderBottom: `1px solid ${C.lgray}`, alignItems: "start" }}>
            <span style={{ ...font(14, 400, "serif"), color: C.mgray }}>{n.date}</span>
            <span style={{
              ...font(10, 500), color: tc[n.type], background: `${tc[n.type]}10`, padding: "3px 8px",
              borderRadius: 8, textAlign: "center", border: `1px solid ${tc[n.type]}20`,
            }}>{n.type}</span>
            <div>
              <h4 style={{ ...font(14, 600), color: C.dark, marginBottom: 3 }}>{n.title}</h4>
              <p style={{ ...font(12), color: C.body, lineHeight: 1.6 }}>{n.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── JOIN US ──
function JoinUs() {
  return (
    <div style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.deep})`, padding: "56px 28px", textAlign: "center" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h2 style={{ ...font("clamp(24px,4vw,32px)", 400, "serif"), color: "white", marginBottom: 14 }}>Join Our Lab</h2>
        <p style={{ ...font(14), color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 24 }}>
          We are always looking for motivated graduate students and postdoctoral researchers passionate about cilia biology, developmental genetics, and metabolic disease research.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <span style={{ ...font(12), color: "white", background: C.accent, padding: "9px 22px", borderRadius: 20, cursor: "pointer" }}>Open Positions →</span>
          <span style={{ ...font(12), color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", padding: "9px 22px", borderRadius: 20, cursor: "pointer" }}>Contact Us</span>
        </div>
      </div>
    </div>
  );
}

// ── STRUCTURE PROPOSAL ──
function Structure() {
  const [tab, setTab] = useState(0);
  const pages = [
    { name: "Home", icon: "🏠",
      current: "Slideshow with lab photos + Welcome text + 3 research summaries (Cilia / Respiratory / Metabolism)",
      proposed: "Interactive hero with 3 research theme slides (auto-rotating) + 3 research area cards + Lab News timeline + Quick Stats bar + Join Us CTA",
      reason: "Visitors immediately grasp the lab's core research strengths and current focus areas." },
    { name: "Research", icon: "🔬",
      current: "3 sub-pages: Ciliogenesis / Ciliopathies / Hedgehog signaling — no mention of obesity or liver fibrosis",
      proposed: "3 restructured sub-pages: Cilia Biology & Rare Genetic Diseases / Obesity & Metabolic Regulation / Liver Fibrosis & Anti-aging",
      reason: "Merging cilia biology with rare diseases reflects how ciliopathies arise from ciliary dysfunction. Adds missing research areas." },
    { name: "Members", icon: "👥",
      current: "Separate Professor and Members pages with basic information",
      proposed: "Unified Members page: PI profile + current members by role (Postdocs, Ph.D., M.S., Undergrads) + Alumni with career outcomes",
      reason: "A unified page gives a complete picture of the lab and demonstrates mentorship success." },
    { name: "Publications", icon: "📄",
      current: "Single list page of publications",
      proposed: "Filterable list (by year, theme, journal) + Featured papers section + Google Scholar integration",
      reason: "Allows visitors to quickly find publications relevant to their interests." },
    { name: "News & Gallery", icon: "📰",
      current: "Gallery only — organized by year with photos",
      proposed: "Dedicated News page (grants, publications, conferences) + Enhanced Gallery with categories in masonry layout",
      reason: "A news section keeps the site dynamic and is critical for recruitment." },
    { name: "Join Us (NEW)", icon: "🎯",
      current: "No recruitment page — only a Contact page with address",
      proposed: "Dedicated page: research environment, open positions, qualifications, application process, FAQ",
      reason: "Essential for attracting top talent. Most competitive labs prominently feature recruitment info." },
  ];

  return (
    <div style={{ background: "white", padding: "72px 28px", borderTop: `4px solid ${C.gold}` }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span style={{ ...font(12, 400, "serif"), color: C.gold, letterSpacing: 3, textTransform: "uppercase" }}>Redesign Proposal</span>
          <h2 style={{ ...font("clamp(26px,4vw,34px)", 400, "serif"), color: C.navy, marginTop: 6, marginBottom: 6 }}>Site Structure Comparison</h2>
          <p style={{ ...font(13), color: C.mgray }}>Click each page to compare current vs. proposed</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 28, justifyContent: "center" }}>
          {pages.map((p, i) => (
            <button key={i} onClick={() => setTab(i)} style={{
              ...font(12, tab === i ? 600 : 400), padding: "7px 14px", borderRadius: 18,
              border: tab === i ? `2px solid ${C.accent}` : "2px solid #e0e0e0",
              background: tab === i ? `${C.accent}10` : "white",
              color: tab === i ? C.accent : C.body, cursor: "pointer", transition: "all 0.2s",
            }}>{p.icon} {p.name}</button>
          ))}
        </div>
        <div key={tab} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, animation: "fadeUp 0.4s ease" }}>
          <div style={{ padding: 24, background: "#FFF5F5", borderRadius: 10, border: "1px solid #FFE0E0" }}>
            <div style={{ ...font(10, 600), color: "#CC6666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Current</div>
            <p style={{ ...font(13), color: C.body, lineHeight: 1.8 }}>{pages[tab].current}</p>
          </div>
          <div style={{ padding: 24, background: "#F0F8FF", borderRadius: 10, border: "1px solid #D0E8FF" }}>
            <div style={{ ...font(10, 600), color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Proposed</div>
            <p style={{ ...font(13), color: C.body, lineHeight: 1.8 }}>{pages[tab].proposed}</p>
          </div>
          <div style={{ gridColumn: "1/-1", padding: "16px 24px", background: C.off, borderRadius: 10, borderLeft: `3px solid ${C.gold}` }}>
            <div style={{ ...font(10, 600), color: C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Rationale</div>
            <p style={{ ...font(13), color: C.body, lineHeight: 1.7 }}>{pages[tab].reason}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FOOTER ──
function Footer() {
  return (
    <footer style={{ background: C.navy, padding: "44px 28px 28px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 36 }}>
        <div>
          <div style={{ ...font(16, 400, "serif"), color: "white", marginBottom: 10 }}>Molecular NeuroGenetics Lab</div>
          <p style={{ ...font(11), color: "rgba(255,255,255,0.35)", lineHeight: 1.8 }}>
            Department of Biochemistry<br/>College of Life Science & Biotechnology<br/>Yonsei University<br/>50 Yonsei-ro, Seodaemun-gu, Seoul 03722, Korea
          </p>
        </div>
        <div>
          <div style={{ ...font(10), color: "rgba(255,255,255,0.5)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Quick Links</div>
          {["Research", "Publications", "Members", "Join Us", "Gallery"].map(l => (
            <a key={l} href="#" style={{ display: "block", ...font(12), color: "rgba(255,255,255,0.35)", textDecoration: "none", marginBottom: 7 }}>{l}</a>
          ))}
        </div>
        <div>
          <div style={{ ...font(10), color: "rgba(255,255,255,0.5)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Contact</div>
          <p style={{ ...font(12), color: "rgba(255,255,255,0.35)", lineHeight: 2 }}>TEL: +82-2-2123-2699<br/>kohw@yonsei.ac.kr</p>
          <a href="https://scholar.google.com/citations?user=vZtD7W0AAAAJ" target="_blank"
            style={{ ...font(11), color: C.accent, textDecoration: "none", display: "inline-block", marginTop: 6 }}>Google Scholar ↗</a>
        </div>
      </div>
      <div style={{ maxWidth: 880, margin: "28px auto 0", paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center", ...font(10), color: "rgba(255,255,255,0.2)" }}>
        © 2025 Molecular NeuroGenetics Lab, Yonsei University. All rights reserved.
      </div>
    </footer>
  );
}

// ── HELPERS ──
function SectionLabel({ text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <div style={{ width: 28, height: 2, background: C.gold }} />
      <span style={{ ...font(11, 400, "serif"), color: C.mgray, letterSpacing: 3, textTransform: "uppercase" }}>{text}</span>
    </div>
  );
}

// ── MAIN ──
export default function MNGLab() {
  return (
    <div style={{ ...font(14), background: C.warm, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
      <div style={{ background: C.gold, padding: 7, textAlign: "center", ...font(11, 600), color: C.navy, letterSpacing: 0.5 }}>
        🎨 MNG Lab Website Redesign — Interactive Demo
      </div>
      <Header />
      <Hero />
      <Stats />
      <About />
      <Research />
      <News />
      <JoinUs />
      <div style={{ textAlign: "center", padding: "52px 28px 0", background: "white" }}>
        <div style={{ width: 50, height: 2, background: C.gold, margin: "0 auto 12px" }} />
        <span style={{ ...font(18, 400, "serif"), color: C.mgray, fontStyle: "italic" }}>Current vs. Proposed Structure</span>
      </div>
      <Structure />
      <Footer />
    </div>
  );
}

import Link from "next/link";
import Topbar from "./components/Topbar";

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero__glow" />
        <div className="container hero__content">
          <Topbar ctaLabel="Sign in" ctaHref="/login" />

          <div className="hero__grid">
            <div className="hero__copy">
              <div className="pill reveal delay-1">
                <span className="pulse" />
                Security Intelligence Platform
              </div>
              <h1 className="hero__title reveal delay-2">
                Security intelligence for everyday browsing.
                <span>Know who you trust before you click.</span>
              </h1>
              <p className="hero__subtitle reveal delay-3">
                ClearTerms analyzes privacy policies, company history, and phishing signals to surface a clear risk verdict in seconds. Focus on browsing smoothly while we secure your data.
              </p>
              <div className="hero__actions reveal delay-4">
                <Link className="btn btn--primary" href="/login">Get started &rarr;</Link>
                <Link className="btn btn--glass" href="/dashboard">View your dashboard</Link>
              </div>
              <div className="stats-grid reveal delay-5">
                {[
                  { label: "Sites analyzed", value: "120k+" },
                  { label: "Threats blocked", value: "8.4k" },
                  { label: "Users protected", value: "34k" },
                  { label: "Average verdict time", value: "2.4s" },
                ].map((s, i) => (
                  <div key={i} className="stat-card glass" title={`${s.value} ${s.label}`}>
                    <div className="stat-card__value">{s.value}</div>
                    <div className="stat-card__label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hero__panel reveal delay-3">
              <div className="scan-card glass">
                <div className="scan-card__header">
                  <div>
                    <div className="eyebrow flex items-center gap-2">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      Instant URL check
                    </div>
                    <h3 style={{ marginTop: "4px" }}>Assess risk before opening a site</h3>
                  </div>
                  <div className="chip chip--accent">Live scan</div>
                </div>
                <div className="scan-card__input">
                  <input placeholder="e.g. questionable-site.com" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                  <button className="btn btn--glass" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>Check</button>
                </div>
                <div className="scan-card__result" style={{ marginTop: "24px", padding: "12px", background: "rgba(255, 209, 102, 0.08)", borderRadius: "12px", border: "1px solid rgba(255, 209, 102, 0.2)"}}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--warning)" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <div>
                    <div className="scan-card__label" style={{ color: "var(--warning)", fontWeight: 600 }}>Action Required</div>
                    <Link href="/login" className="scan-card__url" style={{ textDecoration: 'underline', color: 'var(--text)', fontSize: '13px' }}>
                      Sign in to unlock interactive scans
                    </Link>
                  </div>
                </div>
              </div>

              <div className="glass panel-note">
                <div className="eyebrow flex items-center gap-2">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  Comprehensive Coverage
                </div>
                <p style={{ marginTop: "8px" }}>
                  Understand policy extraction, uncover company history, flag phishing heuristics, and track data leaks automatically.
                </p>
                <div className="panel-note__tags">
                  <span className="chip--glass">Policy AI</span>
                  <span className="chip--glass">Phishing shield</span>
                  <span className="chip--glass">Data Leak monitor</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__header reveal" style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto 48px" }}>
            <div className="eyebrow" style={{ justifyContent: "center" }}>What you get</div>
            <h2>Production-ready security signals</h2>
            <p>Everything you need to protect users, families, and teams inside a single, intuitive platform.</p>
          </div>
          <div className="section-grid">
            {[
              { title: "Risk verdicts", desc: "Clear safe, suspicious, or phishing outcomes backed by hard evidence.", icon: <svg width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
              { title: "Policy insights", desc: "Instantly readable summaries explaining what data is collected and how it's shared.", icon: <svg width="20" height="20" fill="none" stroke="var(--accent-2)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg> },
              { title: "Company audits", desc: "Timeline of incidents, breaches, and regulatory actions giving context to the company.", icon: <svg width="20" height="20" fill="none" stroke="var(--warning)" strokeWidth="2"><path d="M3 21v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8"/><path d="M8 21v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"/><path d="M12 7v4"/><path d="M8 7h8"/></svg> },
              { title: "Leak monitor", desc: "Constant visibility into exactly which of your submitted data types might be at risk.", icon: <svg width="20" height="20" fill="none" stroke="var(--danger)" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
              { title: "Group controls", desc: "Granular roles, shared dashboards, and parental oversight for family or enterprise accounts.", icon: <svg width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
              { title: "Actionable Alerts", desc: "Real-time, actionable notifications delivered to you precisely when high-risk events occur.", icon: <svg width="20" height="20" fill="none" stroke="var(--accent-2)" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
            ].map((item, i) => (
              <div key={i} className="glass card hover:-translate-y-1 transition-transform duration-200">
                <div className="card__header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {item.icon}
                    <h3>{item.title}</h3>
                  </div>
                </div>
                <div className="card__body">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__header reveal" style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto 48px" }}>
            <div className="eyebrow" style={{ justifyContent: "center" }}>How it works</div>
            <h2>Four steps to trusted browsing</h2>
            <p>We designed the flow to be fast, highly explainable, and seamlessly integrated into your routine.</p>
          </div>
          <div className="section-grid">
            {[
              { title: "Scan", desc: "Automatically capture the URL context either from the browser extension or manual dashboard lookup." },
              { title: "Analyze", desc: "Our engine parses legal policies, cross-references company databases, and calculates phishing likelihood." },
              { title: "Decide", desc: "Receive a clear, color-coded verdict instantly identifying red flags and guidance on what to do next." },
              { title: "Protect", desc: "We continue tracking your exposure to past scans and notify you if safety conditions change." },
            ].map((step, i) => (
              <div key={i} className="glass card" style={{ position: "relative", overflow: "hidden" }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '100px', fontWeight: 800, color: 'rgba(255,255,255,0.02)', pointerEvents: 'none', lineHeight: 1 }}>{i + 1}</div>
                <div className="card__header" style={{ position: 'relative', zIndex: 1 }}>
                  <span className="chip" style={{ fontSize: "12px", color: "var(--text)" }}>Step 0{i + 1} &mdash; <strong>{step.title}</strong></span>
                </div>
                <div className="card__body" style={{ position: 'relative', zIndex: 1, marginTop: "8px" }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta__card glass" style={{ textAlign: "center", padding: "64px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
            <div>
              <div className="eyebrow" style={{ justifyContent: "center" }}>Get started today</div>
              <h2 style={{ fontSize: "2.4rem", margin: "0 0 12px" }}>Launch your security workspace</h2>
              <p style={{ maxWidth: "500px", margin: "0 auto" }}>Sign in to connect your account and begin safely analyzing your everyday web traffic with ClearTerms.</p>
            </div>
            <div className="cta__actions" style={{ justifyContent: "center", display: "flex", gap: "16px" }}>
              <Link className="btn btn--primary" href="/login">Create free account</Link>
              <Link className="btn btn--glass" href="/login">Sign in</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

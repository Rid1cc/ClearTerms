import Link from "next/link";
import Topbar from "./components/Topbar";
import InstantUrlCheck from "./components/InstantUrlCheck";

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
              <InstantUrlCheck />

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

      <section className="section" id="pricing">
        <div className="container">
          <div className="section__header reveal" style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto 48px" }}>
            <div className="eyebrow" style={{ justifyContent: "center" }}>Pricing</div>
            <h2>Simple SaaS Subscriptions</h2>
            <p>We designed three unique plans tailored perfectly to the needs of our customers.</p>
          </div>
          <div className="section-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", alignItems: "stretch" }}>
            {/* Free Plan */}
            <div className="glass card hover:-translate-y-1 transition-transform duration-200" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="card__header">
                <h3>Free</h3>
                <div style={{ fontSize: "2.4rem", fontWeight: "700", marginTop: "8px", fontFamily: "var(--font-mono)" }}>$0<span style={{ fontSize: "1rem", fontWeight: "400", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>/mo</span></div>
              </div>
              <div className="card__body" style={{ flex: 1 }}>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                  <li style={{ display: "flex", gap: "8px", alignItems: "start" }}><svg width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> Limited scanning of new pages</li>
                  <li style={{ display: "flex", gap: "8px", alignItems: "start" }}><svg width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> Restricted AI reports</li>
                  <li style={{ display: "flex", gap: "8px", alignItems: "start" }}><svg width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> Access to known public data only</li>
                </ul>
              </div>
              <div style={{ marginTop: "auto", paddingTop: "24px" }}>
                <Link className="btn btn--glass" style={{ width: "100%", justifyContent: "center" }} href="/login">Get Started</Link>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="glass card hover:-translate-y-1 transition-transform duration-200" style={{ display: "flex", flexDirection: "column", gap: "16px", borderColor: "rgba(110, 247, 199, 0.4)", position: "relative" }}>
              <div className="chip--glass" style={{ position: "absolute", top: "24px", right: "24px", fontSize: "12px", color: "var(--accent)" }}>Popular</div>
              <div className="card__header">
                <h3>Pro</h3>
                <div style={{ fontSize: "2.4rem", fontWeight: "700", marginTop: "8px", fontFamily: "var(--font-mono)" }}>$9<span style={{ fontSize: "1rem", fontWeight: "400", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>/mo</span></div>
              </div>
              <div className="card__body" style={{ flex: 1 }}>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                  <li style={{ display: "flex", gap: "8px", alignItems: "start" }}><svg width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> Unlimited access to AI analysis</li>
                  <li style={{ display: "flex", gap: "8px", alignItems: "start" }}><svg width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> Access to advanced analytics dashboard</li>
                  <li style={{ display: "flex", gap: "8px", alignItems: "start" }}><svg width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> Real-time data leak monitoring & alerts</li>
                </ul>
              </div>
              <div style={{ marginTop: "auto", paddingTop: "24px" }}>
                <Link className="btn btn--primary" style={{ width: "100%", justifyContent: "center" }} href="/login">Upgrade to Pro</Link>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="glass card hover:-translate-y-1 transition-transform duration-200" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="card__header">
                <h3>Enterprise / Schools</h3>
                <div style={{ fontSize: "2.4rem", fontWeight: "700", marginTop: "8px", fontFamily: "var(--font-mono)" }}>Custom</div>
              </div>
              <div className="card__body" style={{ flex: 1 }}>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                  <li style={{ display: "flex", gap: "8px", alignItems: "start" }}><svg width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> Flexible options for custom agreements</li>
                  <li style={{ display: "flex", gap: "8px", alignItems: "start" }}><svg width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> Personalized Terms of Service</li>
                  <li style={{ display: "flex", gap: "8px", alignItems: "start" }}><svg width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> Enterprise-grade priority support</li>
                </ul>
              </div>
              <div style={{ marginTop: "auto", paddingTop: "24px" }}>
                <Link className="btn btn--glass" style={{ width: "100%", justifyContent: "center" }} href="/login">Contact Us</Link>
              </div>
            </div>
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

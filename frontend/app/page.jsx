import Link from "next/link";
import Topbar from "./components/Topbar";

export default function HomePage() {
  return (
    <div className="page">
      <div className="ambient">
        <div className="orb orb--a" />
        <div className="orb orb--b" />
        <div className="orb orb--c" />
      </div>

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
                ClearTerms analyzes privacy policies, company history, and phishing signals to surface a clear risk verdict in seconds.
              </p>
              <div className="hero__actions reveal delay-4">
                <Link className="btn btn--primary" href="/login">Start secure browsing</Link>
                <Link className="btn btn--glass" href="/dashboard">Open dashboard</Link>
              </div>
              <div className="stats-grid reveal delay-5">
                {[
                  { label: "Sites analyzed", value: "120k+" },
                  { label: "Threats blocked", value: "8.4k" },
                  { label: "Users protected", value: "34k" },
                  { label: "Average verdict time", value: "2.4s" },
                ].map((s, i) => (
                  <div key={i} className="stat-card glass">
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
                    <div className="eyebrow">Instant URL check</div>
                    <h3>Assess risk before opening a site</h3>
                  </div>
                  <div className="chip">Live scan</div>
                </div>
                <div className="scan-card__input">
                  <input placeholder="Enter a domain" disabled />
                  <button className="btn btn--primary" disabled>Check</button>
                </div>
                <div className="scan-card__result">
                  <div>
                    <div className="scan-card__label">Sign in to enable live scans</div>
                    <div className="scan-card__url">Connect your account to run checks.</div>
                  </div>
                </div>
              </div>

              <div className="glass panel-note">
                <div className="eyebrow">Coverage</div>
                <p>
                  Policy extraction, company history, phishing heuristics, and leak exposure tracking in one view.
                </p>
                <div className="panel-note__tags">
                  <span>Policy AI</span>
                  <span>Phishing shield</span>
                  <span>Leak monitor</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__header reveal">
            <div className="eyebrow">What you get</div>
            <h2>Production-ready security signals</h2>
            <p>Everything you need to protect users, families, and teams in one platform.</p>
          </div>
          <div className="section-grid">
            {[
              { title: "Risk verdicts", desc: "Clear safe/suspicious/phishing outcomes with evidence." },
              { title: "Policy insights", desc: "Summaries of data collection, sharing, and retention." },
              { title: "Company audits", desc: "Incidents, breaches, and regulatory actions in context." },
              { title: "Leak monitor", desc: "Visibility into submitted data on risky domains." },
              { title: "Group controls", desc: "Roles and parental oversight for shared accounts." },
              { title: "Alerts", desc: "Real-time notifications for high-risk events." },
            ].map((item, i) => (
              <div key={i} className="glass card">
                <div className="card__header">
                  <h3>{item.title}</h3>
                </div>
                <div className="card__body">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__header reveal">
            <div className="eyebrow">How it works</div>
            <h2>Four steps to trusted browsing</h2>
            <p>Designed to stay fast, explainable, and cost-effective.</p>
          </div>
          <div className="section-grid">
            {[
              { title: "Scan", desc: "Capture URL context from the extension or dashboard." },
              { title: "Analyze", desc: "Parse policies, research the company, and score risk." },
              { title: "Decide", desc: "Deliver a verdict with clear red flags and guidance." },
              { title: "Protect", desc: "Track exposure and alert admins in real time." },
            ].map((step, i) => (
              <div key={i} className="glass card">
                <div className="card__header">
                  <h3>{`0${i + 1}`}</h3>
                  <span className="chip">{step.title}</span>
                </div>
                <div className="card__body">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta__card glass">
            <div>
              <div className="eyebrow">Get started</div>
              <h2>Launch your security workspace</h2>
              <p>Sign in to connect your account and begin scanning with ClearTerms.</p>
            </div>
            <div className="cta__actions">
              <Link className="btn btn--primary" href="/login">Sign in</Link>
              <Link className="btn btn--ghost" href="/dashboard">View dashboard</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

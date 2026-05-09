"use client";
import { useState, useEffect } from "react";

// --- Data hooks (wire to backend) ------------------------------------------
function useSiteData() {
  const [state, setState] = useState({ status: "idle", data: null, error: null });

  useEffect(() => {
    // Replace with: fetch('/api/sites').then(r => r.json()).then(data => setState({ status: 'ready', data, error: null }))
    setState({
      status: "error",
      data: null,
      error: "No backend connection. Wire /api/sites and /api/dashboard.",
    });
  }, []);

  return state;
}

// --- Components -------------------------------------------------------------
function ScoreRing({ score }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const fill = (score / 100) * c;
  const color = score >= 80 ? "#6ef7c7" : score >= 50 ? "#ffd166" : "#ff7b7b";
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="score-ring">
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--glass-border)" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={`${fill} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        className="score-ring__value"
      />
      <text x="36" y="41" textAnchor="middle" fill={color} fontSize="15" fontWeight="700" fontFamily="var(--font-mono)">{score}</text>
    </svg>
  );
}

function RiskBadge({ risk }) {
  const label = risk === "medium" ? "Caution" : risk === "critical" ? "Unsafe" : "Safe";
  return <span className={`risk-badge risk-badge--${risk || "low"}`}>{label}</span>;
}

function SeverityDot({ severity }) {
  const c = severity === "critical" ? "#ff7b7b" : severity === "high" ? "#ffd166" : "#a78bfa";
  return <span className="severity-dot" style={{ "--dot": c }} />;
}

// --- Sections ---------------------------------------------------------------
function HeroSection({ stats }) {
  const [checked, setChecked] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const handleCheck = () => {
    if (!checked.trim()) return;
    setChecking(true);
    setResult(null);
    // Replace with: fetch('/api/check-url', { method: 'GET', body: JSON.stringify({ url: checked }) })
    setChecking(false);
    setResult({ error: "No response from /api/check-url. Backend is not wired." });
  };

  return (
    <section className="hero">
      <div className="hero__glow" />
      <div className="container hero__content">
        <nav className="topbar glass reveal">
          <div className="brand">
            <span className="brand__icon">CT</span>
            <span className="brand__name">ClearTerms</span>
          </div>
          <div className="topbar__links">
            <button className="ghost">Dashboard</button>
            <button className="ghost">Groups</button>
            <button className="ghost">Extension</button>
            <button className="btn btn--primary">Run demo</button>
          </div>
        </nav>

        <div className="hero__grid">
          <div className="hero__copy">
            <div className="pill reveal delay-1">
              <span className="pulse" />
              Security Intelligence Platform
            </div>
            <h1 className="hero__title reveal delay-2">
              Trust on the web, measurable and verifiable.
              <span>AI analyzes, you approve.</span>
            </h1>
            <p className="hero__subtitle reveal delay-3">
              Real-time analysis of privacy policies, company history, and phishing signals. Dashboard, extension, and backend ready for rollout.
            </p>
            <div className="hero__actions reveal delay-4">
              <button className="btn btn--primary">Start analysis</button>
              <button className="btn btn--glass">View architecture</button>
            </div>
            {stats ? (
              <div className="stats-grid reveal delay-5">
                {[
                  { label: "Sites analyzed", value: stats.sitesAnalyzed.toLocaleString("en") },
                  { label: "Threats blocked", value: stats.threatsBlocked.toLocaleString("en") },
                  { label: "Users protected", value: stats.usersProtected.toLocaleString("en") },
                  { label: "Analysis accuracy", value: `${stats.accuracy}%` },
                ].map((s, i) => (
                  <div key={i} className="stat-card glass">
                    <div className="stat-card__value">{s.value}</div>
                    <div className="stat-card__label">{s.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="stats-grid reveal delay-5">
                <div className="stat-card glass">
                  <div className="stat-card__value">--</div>
                  <div className="stat-card__label">No data from /api/dashboard</div>
                </div>
              </div>
            )}
          </div>

          <div className="hero__panel reveal delay-3">
            <div className="scan-card glass">
              <div className="scan-card__header">
                <div>
                  <div className="eyebrow">Quick URL check</div>
                  <h3>Risk verification before entry</h3>
                </div>
                <div className="chip">/api/check-url</div>
              </div>
              <div className="scan-card__input">
                <input
                  value={checked}
                  onChange={e => setChecked(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCheck()}
                  placeholder="Enter a domain e.g. example.com"
                />
                <button onClick={handleCheck} disabled={checking} className="btn btn--primary">
                  {checking ? "Checking..." : "Check"}
                </button>
              </div>
              {result && !result.error && (
                <div className="scan-card__result">
                  <ScoreRing score={result.score} />
                  <div>
                    <div className="scan-card__label">Safety score</div>
                    <div className="scan-card__url">{checked}</div>
                    <RiskBadge risk={result.risk} />
                  </div>
                </div>
              )}
              {result?.error && (
                <div className="scan-card__result">
                  <div>
                    <div className="scan-card__label">Connection error</div>
                    <div className="scan-card__url">{result.error}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="glass panel-note">
              <div className="eyebrow">Backend ready</div>
              <p>
                Supabase + RLS, Zod, API routes in Next.js. 24h cache, AI analysis, and leak reporting.
              </p>
              <div className="panel-note__tags">
                <span>Supabase Auth</span>
                <span>Queue + REST</span>
                <span>Types shared</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BackendBlueprint() {
  const blocks = [
    { title: "Site analysis", desc: "POST /api/scan, lazy refresh, AI summary + verdict.", meta: "Scan + cache" },
    { title: "Phishing detection", desc: "GET /api/check-url + blocklists and heuristics.", meta: "Fast block" },
    { title: "Groups and roles", desc: "Admin, member, child with parental oversight.", meta: "RLS" },
    { title: "Leak tracking", desc: "POST /api/submitted-data, /api/leaks/me reports.", meta: "Safety" },
    { title: "AI research", desc: "Privacy/EULA analysis + company audits, async queue.", meta: "AI" },
    { title: "Dashboard", desc: "Aggregates: stats, country map, scan history.", meta: "Insights" },
  ];

  const entities = [
    "users",
    "groups",
    "group_members",
    "scanned_sites",
    "site_verdicts",
    "privacy_policy_analyses",
    "company_audits",
    "scan_history",
    "submitted_data_log",
    "phishing_reports",
    "parental_alerts",
  ];

  return (
    <section className="section">
      <div className="container">
        <div className="section__header reveal">
          <div className="eyebrow">Backend spec</div>
          <h2>Blueprint ready for implementation</h2>
          <p>Key flows, entities, and APIs mapped to Supabase + Next.js API routes.</p>
        </div>

        <div className="blueprint-grid">
          {blocks.map((b, i) => (
            <div key={i} className="glass blueprint-card reveal" style={{ "--i": i + 1 }}>
              <div className="blueprint-card__meta">{b.meta}</div>
              <h3>{b.title}</h3>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>

        <div className="data-model glass reveal">
          <div>
            <div className="eyebrow">Data model</div>
            <h3>Supabase schema + RLS</h3>
            <p>RLS on all tables. Admins see only their group, parents see only their children.</p>
          </div>
          <div className="chip-grid">
            {entities.map((e, i) => (
              <span key={i} className="chip chip--glass">{e}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteDatabase({ sites }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("score");
  const [expanded, setExpanded] = useState(null);

  const filtered = (sites || [])
    .filter(s => {
      const q = search.toLowerCase();
      const matchQ = !q || s.url.includes(q) || s.category.toLowerCase().includes(q);
      const matchF = filter === "all" || s.risk === filter;
      return matchQ && matchF;
    })
    .sort((a, b) => sort === "score" ? b.score - a.score : sort === "reports" ? b.reports - a.reports : a.url.localeCompare(b.url));

  return (
    <section className="section">
      <div className="container">
        <div className="section__header reveal">
          <div className="eyebrow">Knowledge base</div>
          <h2>Verified sites database</h2>
          <p>Scores and summaries for high-traffic domains.</p>
        </div>
        <div className="filters glass reveal">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search domain or category" />
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="low">Safe</option>
            <option value="medium">Caution</option>
            <option value="critical">Unsafe</option>
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="score">Sort: score</option>
            <option value="reports">Sort: reports</option>
            <option value="url">Sort: URL</option>
          </select>
        </div>

        <div className="list">
          {sites && filtered.map(site => (
            <div key={site.id} className={`glass list-item ${expanded === site.id ? "list-item--open" : ""}`} onClick={() => setExpanded(expanded === site.id ? null : site.id)}>
              <div className="list-item__row">
                <ScoreRing score={site.score} />
                <div className="list-item__body">
                  <div className="list-item__title">
                    <span>{site.url}</span>
                    <span className="chip">{site.category}</span>
                    <RiskBadge risk={site.risk} />
                  </div>
                  <p>{site.description}</p>
                </div>
                <div className="list-item__meta">
                  <div>{site.reports} reports</div>
                  <div className="muted">{site.lastChecked}</div>
                </div>
              </div>
              {expanded === site.id && (
                <div className="list-item__detail">
                  <p>{site.description}</p>
                  <div className="list-item__actions">
                    <button className="btn btn--glass">Report issue</button>
                    <button className="btn btn--ghost">Full report</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!sites && (
            <div className="empty">No data from /api/scan. Wire the backend and return a site list.</div>
          )}
          {sites && filtered.length === 0 && (
            <div className="empty">No results. Try a different query.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function ThreatFeed({ threats }) {
  const [selected, setSelected] = useState(null);
  const threat = threats?.find(t => t.id === selected);

  return (
    <section className="section">
      <div className="container">
        <div className="section__header reveal">
          <div className="eyebrow">Threat feed</div>
          <h2>Recent threats</h2>
          <p>Live activity feed with regional signals.</p>
        </div>
        <div className="threats-grid">
          <div className="threats-list">
            {(threats || []).map(t => (
              <button key={t.id} className={`glass threat-card ${selected === t.id ? "threat-card--active" : ""}`} onClick={() => setSelected(selected === t.id ? null : t.id)}>
                <div className="threat-card__meta">
                  <SeverityDot severity={t.severity} />
                  <span>{t.type}</span>
                  <span className="muted">{t.date}</span>
                </div>
                <div className="threat-card__title">{t.title}</div>
                <div className="muted">{t.affected.toLocaleString("en")} affected users</div>
              </button>
            ))}
            {!threats && (
              <div className="glass threat-detail__empty">No data from /api/threats.</div>
            )}
          </div>
          <div className="threat-detail">
            {threat ? (
              <div className="glass threat-detail__card">
                <div className="threat-detail__meta">
                  <SeverityDot severity={threat.severity} />
                  <span>{threat.type}</span>
                </div>
                <h3>{threat.title}</h3>
                <p>{threat.description}</p>
                <div className="tips">
                  <div className="eyebrow">How to respond</div>
                  {threat.tips.map((tip, i) => (
                    <div key={i} className="tip"><span>{i + 1}.</span>{tip}</div>
                  ))}
                </div>
                <button className="btn btn--ghost">Share advisory</button>
              </div>
            ) : (
              <div className="glass threat-detail__empty">Select a threat to see details.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function EducationSection() {
  return (
    <section className="section">
      <div className="container">
        <div className="section__header reveal">
          <div className="eyebrow">Education</div>
          <h2>Security education hub</h2>
          <p>Short, practical modules focused on real-world defense.</p>
        </div>
        <div className="module-grid">
          <div className="glass module-card reveal" style={{ "--accent": "#6ef7c7", "--i": 1 }}>
            <div className="module-card__icon">Book</div>
            <div className="module-card__meta">
              <span className="chip chip--accent">placeholder</span>
              <span className="chip">/api/education</span>
            </div>
            <h3>No education content</h3>
            <p>Wire education endpoints and return the module list.</p>
            <button className="btn btn--glass" disabled>Waiting for backend</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuizSection() {
  return (
    <section className="section">
      <div className="container">
        <div className="section__header reveal">
          <div className="eyebrow">Quiz</div>
          <h2>Test your readiness</h2>
          <p>Quick check for phishing resilience.</p>
        </div>
        <div className="quiz glass reveal">
          <div className="quiz__done">
            <div className="quiz__emoji">?</div>
            <h3>No questions from /api/quiz</h3>
            <p>Wire the backend and return quiz questions.</p>
            <button className="btn btn--primary" disabled>Waiting for backend</button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { data, error } = useSiteData();

  return (
    <div className="page">
      <div className="ambient">
        <div className="orb orb--a" />
        <div className="orb orb--b" />
        <div className="orb orb--c" />
      </div>
      <HeroSection stats={data?.stats} />
      <BackendBlueprint />
      <SiteDatabase sites={data?.sites} />
      <ThreatFeed threats={data?.threats} />
      <EducationSection />
      <QuizSection />
      {error && (
        <section className="section">
          <div className="container">
            <div className="glass" style={{ padding: "18px", borderRadius: "16px" }}>
              <div className="eyebrow">Connection error</div>
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function PricingSection() {
  const plans = [
    {
      name: "Free", price: "$0", period: "/month", color: "#475569",
      features: ["Site checks (10/day)", "Threat alerts", "Education modules (3)", "Security quiz"],
      missing: ["Unlimited checks", "Profile risk analysis", "Family reports", "Priority support"],
      cta: "Start free"
    },
    {
      name: "Family", price: "$29", period: "/month", color: "#22c55e", featured: true,
      features: ["Unlimited site checks", "All education modules", "Monitoring for 5 users", "Weekly reports", "Real-time SMS alerts", "Priority support"],
      missing: [],
      cta: "Start 14-day trial"
    },
    {
      name: "Business / School", price: "$199", period: "/month", color: "#818cf8",
      features: ["Everything in Family", "Up to 100 users", "Admin console", "Group training", "Team exposure analysis", "API and integrations", "Dedicated success"],
      missing: [],
      cta: "Contact sales"
    }
  ];

  return (
    <section style={{ padding: "60px 0" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h2 style={{ fontSize: "1.9rem", fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Choose your plan</h2>
        <p style={{ color: "#64748b", margin: 0 }}>Protect yourself, your family, or your team</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {plans.map((plan, i) => (
          <div key={i} style={{ background: "#0f172a", border: `1px solid ${plan.featured ? plan.color + "44" : "#1e293b"}`, borderRadius: 16, padding: "28px 24px", position: "relative", display: "flex", flexDirection: "column" }}>
            {plan.featured && (
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#22c55e", color: "#052e16", borderRadius: 99, padding: "4px 16px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", letterSpacing: "0.05em" }}>
                MOST POPULAR
              </div>
            )}
            <div style={{ color: plan.color, fontSize: 13, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>{plan.name}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
              <span style={{ fontSize: "2rem", fontWeight: 800, color: "#e2e8f0" }}>{plan.price}</span>
              <span style={{ fontSize: 13, color: "#475569" }}>{plan.period}</span>
            </div>
            <div style={{ flex: 1 }}>
              {plan.features.map((f, j) => (
                <div key={j} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: "#94a3b8" }}>
                  <span style={{ color: "#22c55e", flexShrink: 0, fontWeight: 700 }}>OK</span>{f}
                </div>
              ))}
              {plan.missing.map((f, j) => (
                <div key={j} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: "#334155", textDecoration: "line-through" }}>
                  <span style={{ flexShrink: 0 }}>-</span>{f}
                </div>
              ))}
            </div>
            <button style={{ marginTop: 24, width: "100%", background: plan.featured ? "#22c55e" : "transparent", color: plan.featured ? "#052e16" : plan.color, border: `1px solid ${plan.color}44`, borderRadius: 8, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

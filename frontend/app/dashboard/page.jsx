import Topbar from "../components/Topbar";

export default function DashboardPage() {
  return (
    <div className="page">
      <div className="ambient">
        <div className="orb orb--a" />
        <div className="orb orb--b" />
        <div className="orb orb--c" />
      </div>
      <section className="section">
        <div className="container">
          <Topbar ctaLabel="Sign in" ctaHref="/login" />
          <div className="section__header reveal">
            <div className="eyebrow">Dashboard</div>
            <div className="status-indicator">
              <span className="status-dot status-dot--off" />
              <span>Signed out</span>
              <span className="muted">Connect to view live data</span>
            </div>
            <h2>Security overview</h2>
            <p>Posture, recent scans, and system health at a glance.</p>
          </div>
          <div className="section-grid">
            <div className="glass card">
              <div className="card__header">
                <h3>KPIs</h3>
                <span className="chip">Summary</span>
              </div>
              <div className="card__body">No activity yet.</div>
            </div>
            <div className="glass card">
              <div className="card__header">
                <h3>Recent scans</h3>
                <span className="chip">Timeline</span>
              </div>
              <div className="card__body">Connect your account to load scans.</div>
            </div>
            <div className="glass card">
              <div className="card__header">
                <h3>Risk map</h3>
                <span className="chip">Insights</span>
              </div>
              <div className="card__body">Awaiting regional risk data.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

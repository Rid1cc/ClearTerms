import Topbar from "../components/Topbar";

export default function LeaksPage() {
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
            <div className="eyebrow">Leak monitor</div>
            <h2>Submitted data exposure</h2>
            <p>Track data shared with risky domains and take action.</p>
          </div>
          <div className="section-grid">
            <div className="glass card">
              <div className="card__header">
                <h3>Leak timeline</h3>
                <span className="chip">History</span>
              </div>
              <div className="card__body">No exposure records.</div>
            </div>
            <div className="glass card">
              <div className="card__header">
                <h3>Submitted data</h3>
                <span className="chip">Telemetry</span>
              </div>
              <div className="card__body">Awaiting extension signals.</div>
            </div>
            <div className="glass card">
              <div className="card__header">
                <h3>Guidance</h3>
                <span className="chip">Remediation</span>
              </div>
              <div className="card__body">No remediation guidance loaded.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

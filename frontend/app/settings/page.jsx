import Topbar from "../components/Topbar";

export default function SettingsPage() {
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
            <div className="eyebrow">Settings</div>
            <h2>Policies and preferences</h2>
            <p>Customize risk thresholds, privacy controls, and integrations.</p>
          </div>
          <div className="section-grid">
            <div className="glass card">
              <div className="card__header">
                <h3>Risk thresholds</h3>
                <span className="chip">Scoring</span>
              </div>
              <div className="card__body">Define safe and risky score ranges.</div>
            </div>
            <div className="glass card">
              <div className="card__header">
                <h3>Retention</h3>
                <span className="chip">Compliance</span>
              </div>
              <div className="card__body">Set data retention windows.</div>
            </div>
            <div className="glass card">
              <div className="card__header">
                <h3>Integrations</h3>
                <span className="chip">Workspace</span>
              </div>
              <div className="card__body">Connect external services and hooks.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

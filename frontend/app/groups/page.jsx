import Topbar from "../components/Topbar";

export default function GroupsPage() {
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
            <div className="eyebrow">Groups</div>
            <h2>Teams and family spaces</h2>
            <p>Manage members, roles, and shared security rules.</p>
          </div>
          <div className="section-grid">
            <div className="glass card">
              <div className="card__header">
                <h3>Group list</h3>
                <span className="chip">Overview</span>
              </div>
              <div className="card__body">No groups yet.</div>
            </div>
            <div className="glass card">
              <div className="card__header">
                <h3>Invites</h3>
                <span className="chip">Access</span>
              </div>
              <div className="card__body">Invite workflow not configured.</div>
            </div>
            <div className="glass card">
              <div className="card__header">
                <h3>Roles</h3>
                <span className="chip">Policy</span>
              </div>
              <div className="card__body">No members loaded.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import Topbar from "../components/Topbar";

export default function LoginPage() {
  return (
    <div className="page">
      <div className="ambient">
        <div className="orb orb--a" />
        <div className="orb orb--b" />
        <div className="orb orb--c" />
      </div>
      <section className="section">
        <div className="container">
          <Topbar ctaLabel="Dashboard" ctaHref="/dashboard" />
          <div className="section__header reveal">
            <div className="eyebrow">Authentication</div>
            <h2>Sign in to ClearTerms</h2>
            <p>Use your email and password to access the security workspace.</p>
          </div>
          <div className="form-card glass">
            <form className="form">
              <div className="form-field">
                <label>Email</label>
                <input className="input" type="email" placeholder="you@company.com" />
              </div>
              <div className="form-field">
                <label>Password</label>
                <input className="input" type="password" placeholder="Your password" />
              </div>
              <button className="btn btn--primary" type="button">Sign in</button>
              <div className="form-meta">
                <button className="btn btn--ghost" type="button">Reset password</button>
                <button className="btn btn--glass" type="button">Create account</button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";
import { useState } from "react";
import Topbar from "../components/Topbar";
import { apiRequest } from "../lib/api";
import { setTokens } from "../lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState({ type: "idle", message: "" });

  const handleLogin = async () => {
    setStatus({ type: "loading", message: "Signing in..." });
    try {
      const payload = await apiRequest("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setTokens({ accessToken: payload.access_token, refreshToken: payload.refresh_token });
      setStatus({ type: "success", message: "Signed in successfully." });
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Unable to sign in." });
    }
  };

  const handleRegister = async () => {
    setStatus({ type: "loading", message: "Creating account..." });
    try {
      const payload = await apiRequest("/api/auth/register", {
        method: "POST",
        body: { email, password, display_name: displayName || undefined },
      });
      if (payload?.session?.access_token) {
        setTokens({ accessToken: payload.session.access_token, refreshToken: payload.session.refresh_token });
      }
      setStatus({ type: "success", message: payload?.email_confirmation_required ? "Check your inbox to confirm the email." : "Account created." });
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Unable to register." });
    }
  };

  const handleReset = async () => {
    setStatus({ type: "loading", message: "Sending reset link..." });
    try {
      await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: { email },
      });
      setStatus({ type: "success", message: "Password reset email sent." });
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Unable to reset password." });
    }
  };

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
            <form className="form" onSubmit={e => e.preventDefault()}>
              <div className="form-field">
                <label>Email</label>
                <input className="input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="form-field">
                <label>Password</label>
                <input className="input" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="form-field">
                <label>Display name</label>
                <input className="input" type="text" placeholder="Optional" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              <button className="btn btn--primary" type="button" onClick={handleLogin}>
                Sign in
              </button>
              {status.message && (
                <div className={`status-pill status-pill--${status.type}`}>{status.message}</div>
              )}
              <div className="form-meta">
                <button className="btn btn--ghost" type="button" onClick={handleReset}>Reset password</button>
                <button className="btn btn--glass" type="button" onClick={handleRegister}>Create account</button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

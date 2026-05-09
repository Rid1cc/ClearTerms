"use client";
import { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import { apiRequest } from "../lib/api";
import { getAccessToken } from "../lib/auth";

export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError("Sign in to manage settings.");
      return;
    }

    apiRequest("/api/auth/me", { token })
      .then(data => setProfile(data?.profile || null))
      .catch(err => setError(err.message || "Unable to load profile."));
  }, []);

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
                <h3>Profile</h3>
                <span className="chip">Account</span>
              </div>
              <div className="card__body">
                {profile ? (
                  <ul className="card__list">
                    <li>{profile.display_name || "Unnamed"}</li>
                    <li>{profile.avatar_url ? "Avatar set" : "No avatar"}</li>
                  </ul>
                ) : (
                  error || "No profile data."
                )}
              </div>
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

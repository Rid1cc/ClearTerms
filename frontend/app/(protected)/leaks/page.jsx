"use client";

import { useEffect, useState } from "react";
import Topbar from "../../components/Topbar";
import { apiRequest } from "../../lib/api";
import { getAccessToken } from "../../lib/auth";

const CATEGORY_LABELS = {
  email: "Email",
  password: "Password",
  phone: "Phone",
  full_name: "Full name",
  address: "Address",
  date_of_birth: "Date of birth",
  national_id: "National ID",
  credit_card: "Credit card",
  bank_account: "Bank account",
  gps_location: "GPS location",
  ip_address: "IP address",
  device_id: "Device ID",
  biometric: "Biometric data",
  photo: "Photo",
  browsing_history: "Browsing history",
  contacts: "Contacts",
  other: "Other",
};

const SEVERITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

function formatCategories(cats) {
  if (!cats?.length) return "—";
  return cats.map((c) => CATEGORY_LABELS[c] || c).join(", ");
}

function displayHost(siteUrl) {
  try {
    return new URL(siteUrl).hostname;
  } catch {
    return siteUrl;
  }
}

export default function LeaksPage() {
  const [submissions, setSubmissions] = useState([]);
  const [leakAlerts, setLeakAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError("Sign in to view this data.");
      setLoading(false);
      return;
    }

    apiRequest("/api/leaks/me?limit=50&offset=0", { token })
      .then((data) => {
        setSubmissions(data?.submissions || []);
        setLeakAlerts(data?.leak_alerts || []);
        setError("");
      })
      .catch((err) => setError(err.message || "Failed to load data."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <Topbar ctaLabel="Sign in" ctaHref="/login" />
          <div className="section__header reveal">
            <div className="eyebrow">Leaks & telemetry</div>
            <h2>What you sent to which sites</h2>
            <p>
              We only record <strong>field categories</strong> (e.g. email, password) — never the actual values.
              Data comes from the ClearTerms extension on form submit and from the scan database.
            </p>
          </div>

          <div className="section-grid">
            <div className="glass card" style={{ gridColumn: "1 / -1" }}>
              <div className="card__header">
                <h3>Risk alerts</h3>
                <span className="chip chip--accent">Phishing / suspicious</span>
              </div>
              <div className="card__body">
                {loading ? (
                  <p className="muted">Loading…</p>
                ) : leakAlerts.length ? (
                  <ul className="card__list" style={{ listStyle: "none", padding: 0, display: "grid", gap: "12px" }}>
                    {leakAlerts.map((a) => (
                      <li
                        key={a.id}
                        style={{
                          padding: "16px",
                          borderRadius: "12px",
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,80,80,0.06)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                          <strong>{a.site_url}</strong>
                          <span className="chip" style={{ fontSize: "12px" }}>
                            {SEVERITY_LABELS[a.severity] || a.severity}
                          </span>
                        </div>
                        <p style={{ margin: "8px 0 0", fontSize: "14px", color: "var(--muted)" }}>{a.message}</p>
                        <p style={{ margin: "8px 0 0", fontSize: "13px" }}>
                          <span className="muted">Categories: </span>
                          {formatCategories(a.data_categories)}
                        </p>
                        <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--muted)" }}>
                          {new Date(a.detected_at).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No alerts — no submissions detected on phishing or suspicious sites.</p>
                )}
              </div>
            </div>

            <div className="glass card" style={{ gridColumn: "1 / -1" }}>
              <div className="card__header">
                <h3>Submitted categories — history</h3>
                <span className="chip">Forms</span>
              </div>
              <div className="card__body">
                {loading ? (
                  <p className="muted">Loading…</p>
                ) : error ? (
                  <p style={{ color: "var(--danger)" }}>{error}</p>
                ) : submissions.length ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                      <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                          <th style={{ padding: "10px 8px" }}>When</th>
                          <th style={{ padding: "10px 8px" }}>Domain</th>
                          <th style={{ padding: "10px 8px" }}>Data categories</th>
                          <th style={{ padding: "10px 8px" }}>Site verdict</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((s) => (
                          <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "12px 8px", whiteSpace: "nowrap" }}>
                              {new Date(s.submitted_at).toLocaleString()}
                            </td>
                            <td style={{ padding: "12px 8px" }}>
                              <span title={s.site_url}>{s.domain || displayHost(s.site_url)}</span>
                            </td>
                            <td style={{ padding: "12px 8px" }}>{formatCategories(s.data_categories)}</td>
                            <td style={{ padding: "12px 8px" }}>
                              {s.verdict ? (
                                <span className="chip chip--glass" style={{ fontSize: "12px" }}>
                                  {s.verdict.verdict} ({s.verdict.score})
                                </span>
                              ) : (
                                <span className="muted">No scan</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">
                    No entries yet. Install the extension, sign in to it, and submit a form on a site — then a categorised entry will appear here.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

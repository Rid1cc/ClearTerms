"use client";
import { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import { apiRequest } from "../lib/api";
import { getAccessToken } from "../lib/auth";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError("Sign in to view alerts.");
      return;
    }

    apiRequest("/api/groups", { token })
      .then(data => data?.groups?.[0])
      .then(group => {
        if (!group) {
          setError("No groups available.");
          return null;
        }
        return apiRequest(`/api/groups/${group.id}/parental-alerts?limit=10&offset=0`, { token });
      })
      .then(payload => {
        if (payload?.alerts) setAlerts(payload.alerts);
      })
      .catch(err => setError(err.message || "Unable to load alerts."));
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
            <div className="eyebrow">Alerts</div>
            <h2>Security and parental alerts</h2>
            <p>High-risk events and phishing detections in one queue.</p>
          </div>
          <div className="section-grid">
            <div className="glass card">
              <div className="card__header">
                <h3>Alert feed</h3>
                <span className="chip">Priority</span>
              </div>
              <div className="card__body">
                {alerts.length ? (
                  <ul className="card__list">
                    {alerts.map(alert => (
                      <li key={alert.id}>{alert.site_url} - {alert.event_type}</li>
                    ))}
                  </ul>
                ) : (
                  error || "No alerts available."
                )}
              </div>
            </div>
            <div className="glass card">
              <div className="card__header">
                <h3>Recent blocks</h3>
                <span className="chip">Phishing</span>
              </div>
              <div className="card__body">No blocked events.</div>
            </div>
            <div className="glass card">
              <div className="card__header">
                <h3>Notification channels</h3>
                <span className="chip">Delivery</span>
              </div>
              <div className="card__body">Email and push are not configured.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Topbar from "../../components/Topbar";
import { apiRequest } from "../../lib/api";
import { getAccessToken } from "../../lib/auth";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    const token = getAccessToken();
    if (!token) {
      setError("Sign in to view alerts.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // 1. Get all groups
      const { groups } = await apiRequest("/api/groups", { token });
      
      // 2. Filter groups where user is admin
      const adminGroups = groups.filter(g => g.role === "admin");
      if (adminGroups.length === 0) {
        setAlerts([]);
        setLoading(false);
        return;
      }

      // 3. For each admin group, get members
      let allAlerts = [];
      const userRes = await apiRequest("/api/auth/me", { token }).catch(() => null);
      const currentUserId = userRes?.user?.id;

      for (const group of adminGroups) {
        const payload = await apiRequest(`/api/groups/${group.id}/members`, { token });
        const members = payload.members || [];
        
        // 4. For each member, fetch their alerts
        for (const member of members) {
          if (member.user_id === currentUserId) continue; // Skip my own alerts, assuming alerts are for dependents
          
          try {
            const alertRes = await apiRequest(`/api/groups/${group.id}/members/${member.user_id}/parental-alerts`, { token });
            if (alertRes.alerts) {
              const enrichedAlerts = alertRes.alerts.map(a => ({
                ...a,
                group_name: group.name,
                member_name: member.profile?.display_name || member.user_id
              }));
              allAlerts = [...allAlerts, ...enrichedAlerts];
            }
          } catch (err) {
            console.error("Failed to load alerts for user", member.user_id);
          }
        }
      }

      // Sort by occurred_at descending
      allAlerts.sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
      setAlerts(allAlerts);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load alerts.");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (type) => {
    if (type === "visit_blocked") return "var(--danger)";
    if (type === "phishing_detected") return "var(--danger)";
    if (type === "policy_violation") return "var(--warning)";
    return "var(--accent)";
  };

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <Topbar />
          <div className="section__header reveal">
            <div className="eyebrow">Alerts</div>
            <h2>Member security activity</h2>
            <p>Monitor high-risk events and dangerous websites visited by people in your groups.</p>
          </div>
          <div className="section-grid">
            <div className="glass card" style={{ gridColumn: "1 / -1" }}>
              <div className="card__header">
                <h3>Global Alert Feed</h3>
                <span className="chip chip--accent">Real-time</span>
              </div>
              <div className="card__body" style={{ marginTop: "16px" }}>
                {loading ? (
                  <p>Aggregating incident data...</p>
                ) : error ? (
                  <p style={{ color: "var(--danger)" }}>{error}</p>
                ) : alerts.length ? (
                  <div style={{ display: "grid", gap: "16px" }}>
                    {alerts.map(alert => (
                      <div key={alert.id} style={{ 
                        background: "rgba(255, 255, 255, 0.02)", 
                        border: "1px solid rgba(255, 255, 255, 0.05)", 
                        borderRadius: "12px", 
                        padding: "16px",
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto",
                        gap: "16px",
                        alignItems: "center"
                      }}>
                        <div style={{ 
                          width: "48px", 
                          height: "48px", 
                          borderRadius: "12px", 
                          background: `color-mix(in srgb, ${getSeverityColor(alert.event_type)} 15%, transparent)`,
                          color: getSeverityColor(alert.event_type),
                          display: "grid",
                          placeItems: "center"
                        }}>
                          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
                            {alert.member_name} triggered an alert in {alert.group_name}
                          </div>
                          <div style={{ fontSize: "14px", color: "var(--muted)" }}>
                            <span style={{ color: getSeverityColor(alert.event_type), fontWeight: 500 }}>{alert.event_type.replace('_', ' ')}</span> &bull; Tried accessing <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: "4px" }}>{alert.site_url}</code>
                          </div>
                        </div>
                        <div style={{ fontSize: "13px", color: "var(--muted)", alignSelf: "start" }}>
                          {new Date(alert.occurred_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "48px 0" }}>
                    <svg width="48" height="48" fill="none" stroke="var(--muted)" strokeWidth="1" viewBox="0 0 24 24" style={{ margin: "0 auto 16px", opacity: 0.5 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p style={{ margin: 0, fontSize: "1.1rem", color: "var(--text)" }}>All clear.</p>
                    <p style={{ marginTop: "8px", fontSize: "0.95rem" }}>No alerts generated by members in your admin groups.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

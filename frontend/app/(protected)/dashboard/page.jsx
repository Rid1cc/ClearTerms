"use client";
import { useEffect, useState } from "react";
import Topbar from "../../components/Topbar";
import { apiRequest } from "../../lib/api";
import { getAccessToken } from "../../lib/auth";

export default function DashboardPage() {
  const [status, setStatus] = useState({ state: "signed-out", message: "Connect to view live data." });
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [threats, setThreats] = useState([]);
  const [dataMap, setDataMap] = useState(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setStatus({ state: "signed-out", message: "Sign in to load live data." });
      return;
    }

    const load = async () => {
      try {
        await apiRequest("/health");
        setStatus({ state: "connected", message: "Connected" });
      } catch (err) {
        setStatus({ state: "disconnected", message: "API unreachable." });
      }

      try {
        const [statsData, historyData, threatsData, mapData] = await Promise.all([
          apiRequest("/api/dashboard/stats?days=30", { token }),
          apiRequest("/api/dashboard/scan-history?limit=5&offset=0", { token }),
          apiRequest("/api/dashboard/top-threats?days=30&limit=5", { token }),
          apiRequest("/api/dashboard/data-map", { token }),
        ]);
        setStats(statsData);
        setHistory(historyData?.history || []);
        setThreats(threatsData?.threats || []);
        setDataMap(mapData);
      } catch (err) {
        // Keep partial data if any request fails.
      }
    };

    load();
  }, []);

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <Topbar ctaLabel="Sign in" ctaHref="/login" />
          <div className="section__header reveal">
            <div className="eyebrow">Dashboard</div>
            <div className="status-indicator">
              <span className={`status-dot ${status.state === "connected" ? "status-dot--ok" : "status-dot--off"}`} />
              <span>{status.state === "connected" ? "Signed in" : "Signed out"}</span>
              <span className="muted">{status.message}</span>
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
              <div className="card__body">
                {stats ? (
                  <div className="metric-grid">
                    <div>
                      <div className="metric-value">{stats.total_scans}</div>
                      <div className="metric-label">Total scans</div>
                    </div>
                    <div>
                      <div className="metric-value">{stats.scans_in_window}</div>
                      <div className="metric-label">Scans in window</div>
                    </div>
                    <div>
                      <div className="metric-value">{stats.threats_in_window}</div>
                      <div className="metric-label">Threats in window</div>
                    </div>
                    <div>
                      <div className="metric-value">{stats.open_leak_alerts}</div>
                      <div className="metric-label">Open leak alerts</div>
                    </div>
                  </div>
                ) : (
                  "No activity yet."
                )}
              </div>
            </div>
            <div className="glass card">
              <div className="card__header">
                <h3>Recent scans</h3>
                <span className="chip">Timeline</span>
              </div>
              <div className="card__body">
                {history.length ? (
                  <ul className="card__list">
                    {history.map(item => (
                      <li key={item.id}>{item.site?.domain || item.site?.url} - {item.verdict?.verdict}</li>
                    ))}
                  </ul>
                ) : (
                  "Connect your account to load scans."
                )}
              </div>
            </div>
            <div className="glass card">
              <div className="card__header">
                <h3>Risk map</h3>
                <span className="chip">Insights</span>
              </div>
              <div className="card__body">
                {dataMap?.countries?.length ? (
                  <ul className="card__list">
                    {dataMap.countries.slice(0, 4).map(country => (
                      <li key={country.country}>{country.country} - {country.total_submissions} submissions</li>
                    ))}
                  </ul>
                ) : (
                  "Awaiting regional risk data."
                )}
              </div>
            </div>
            <div className="glass card">
              <div className="card__header">
                <h3>Top threats</h3>
                <span className="chip">Last 30 days</span>
              </div>
              <div className="card__body">
                {threats.length ? (
                  <ul className="card__list">
                    {threats.map(threat => (
                      <li key={threat.site_id}>{threat.domain} - {threat.verdict}</li>
                    ))}
                  </ul>
                ) : (
                  "No threat data yet."
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

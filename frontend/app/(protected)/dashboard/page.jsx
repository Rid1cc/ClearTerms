"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";
import Topbar from "../../components/Topbar";
import { apiRequest } from "../../lib/api";
import { getAccessToken } from "../../lib/auth";

const VERDICT_LABEL = {
  safe: "Bezpieczne",
  suspicious: "Podejrzane",
  phishing: "Phishing",
  unknown: "Nieznane",
};

const VERDICT_COLOR = {
  safe: "#6ef7c7",
  suspicious: "#ffd166",
  phishing: "#ff7b7b",
  unknown: "#64748b",
};

const SEVERITY_LABEL = {
  critical: "Krytyczne",
  high: "Wysokie",
  medium: "Średnie",
  low: "Niskie",
};

const SEVERITY_COLOR = {
  critical: "#ff7b7b",
  high: "#ffae6e",
  medium: "#ffd166",
  low: "#6ef7c7",
};

const CATEGORY_LABEL = {
  email: "E-mail",
  password: "Hasło",
  phone: "Telefon",
  full_name: "Imię i nazwisko",
  address: "Adres",
  date_of_birth: "Data urodzenia",
  national_id: "PESEL / ID",
  credit_card: "Karta",
  other: "Inne",
};

const WINDOW_OPTIONS = [
  { label: "7 dni", value: 7 },
  { label: "30 dni", value: 30 },
  { label: "90 dni", value: 90 },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(7, 9, 15, 0.92)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 12,
        padding: "10px 12px",
        fontSize: 12,
        boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
        backdropFilter: "blur(12px)",
      }}
    >
      {label != null && (
        <div style={{ marginBottom: 6, color: "var(--muted)", fontSize: 11 }}>{label}</div>
      )}
      {payload.map((p) => (
        <div key={p.dataKey || p.name} style={{ color: p.color, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>{p.name}</span>
          <strong style={{ color: "var(--text)" }}>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ label, value, hint, accent, delay = 0 }) {
  return (
    <div
      className="glass card reveal"
      style={{
        margin: 0,
        position: "relative",
        overflow: "hidden",
        animationDelay: `${delay}s`,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 100% 0%, ${accent}26, transparent 60%)`,
          pointerEvents: "none",
        }}
      />
      <div className="card__header" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6, position: "relative" }}>
        <span className="chip chip--glass" style={{ fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase" }}>
          {hint}
        </span>
        <h3 style={{ margin: 0, fontSize: ".92rem", fontWeight: 500, color: "var(--muted)" }}>{label}</h3>
      </div>
      <div className="card__body" style={{ paddingTop: 4, position: "relative" }}>
        <div
          className="metric-value"
          style={{
            fontSize: "1.95rem",
            color: accent,
            fontFamily: "var(--font-mono)",
            letterSpacing: "-.03em",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, chip, action }) {
  return (
    <div className="card__header" style={{ marginBottom: 4 }}>
      <h3 style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {title}
        {chip ? <span className="chip chip--glass">{chip}</span> : null}
      </h3>
      {action || null}
    </div>
  );
}

export default function DashboardPage() {
  const [status, setStatus] = useState({ state: "signed-out", message: "Łączenie…" });
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [submissions, setSubmissions] = useState(null);
  const [categories, setCategories] = useState([]);
  const [history, setHistory] = useState([]);
  const [threats, setThreats] = useState([]);
  const [dataMap, setDataMap] = useState(null);
  const [leakSev, setLeakSev] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [windowDays, setWindowDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setStatus({ state: "signed-out", message: "Zaloguj się, aby zobaczyć dane." });
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        await apiRequest("/health");
        setStatus({ state: "connected", message: "Połączono z API" });
      } catch {
        setStatus({ state: "disconnected", message: "API niedostępne" });
      }

      try {
        const [me, statsData, activityData, subData, catData, historyData, threatsData, mapData, leakSevData] =
          await Promise.all([
            apiRequest("/api/auth/me", { token }).catch(() => null),
            apiRequest(`/api/dashboard/stats?days=${windowDays}`, { token }),
            apiRequest(`/api/dashboard/activity?days=${windowDays}`, { token }),
            apiRequest(`/api/dashboard/submissions-by-day?days=${windowDays}`, { token }).catch(() => ({ by_day: [] })),
            apiRequest(`/api/dashboard/data-categories?days=${windowDays}`, { token }).catch(() => ({ categories: [] })),
            apiRequest("/api/dashboard/scan-history?limit=8&offset=0", { token }),
            apiRequest(`/api/dashboard/top-threats?days=${windowDays}&limit=8`, { token }),
            apiRequest("/api/dashboard/data-map", { token }),
            apiRequest("/api/dashboard/leak-severity", { token }).catch(() => null),
          ]);
        setProfileName(me?.profile?.display_name || me?.user?.email?.split("@")[0] || "");
        setStats(statsData);
        setActivity(activityData);
        setSubmissions(subData);
        setCategories(catData?.categories || []);
        setHistory(historyData?.history || []);
        setThreats(threatsData?.threats || []);
        setDataMap(mapData);
        setLeakSev(leakSevData);
      } catch {
        // zostawiamy częściowe dane
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [windowDays]);

  const pieData = useMemo(() => {
    if (!stats?.verdict_breakdown) return [];
    return Object.entries(stats.verdict_breakdown)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: VERDICT_LABEL[key] || key,
        key,
        value,
      }));
  }, [stats]);

  const countryChartData = useMemo(() => {
    const list = dataMap?.countries || [];
    return list.slice(0, 10).map((c) => ({
      ...c,
      label: c.country.length > 12 ? c.country.slice(0, 12) + "…" : c.country,
    }));
  }, [dataMap]);

  const activityData = useMemo(() => {
    if (!activity?.by_day?.length) return [];
    return activity.by_day.map((d) => ({
      ...d,
      label: d.date.slice(5).replace("-", "/"),
    }));
  }, [activity]);

  const submissionData = useMemo(() => {
    if (!submissions?.by_day?.length) return [];
    return submissions.by_day.map((d) => ({
      ...d,
      label: d.date.slice(5).replace("-", "/"),
    }));
  }, [submissions]);

  const categoriesData = useMemo(() => {
    return (categories || []).slice(0, 8).map((c) => ({
      label: CATEGORY_LABEL[c.category] || c.category,
      key: c.category,
      count: c.count,
    }));
  }, [categories]);

  const severityData = useMemo(() => {
    if (!leakSev?.severity) return [];
    return Object.entries(leakSev.severity)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        key,
        name: SEVERITY_LABEL[key] || key,
        value,
        fill: SEVERITY_COLOR[key] || "var(--accent-2)",
      }));
  }, [leakSev]);

  const safetyScore = useMemo(() => {
    const total = stats?.scans_in_window ?? 0;
    if (!total) return null;
    const safe = stats?.verdict_breakdown?.safe ?? 0;
    return Math.round((safe / total) * 100);
  }, [stats]);

  const heroAccent = safetyScore == null
    ? "var(--accent-2)"
    : safetyScore >= 80
    ? "var(--accent)"
    : safetyScore >= 50
    ? "var(--warning)"
    : "var(--danger)";

  return (
    <div className="page">
      <section className="section" style={{ paddingTop: 64 }}>
        <div className="container">
          <Topbar ctaLabel="Zaloguj" ctaHref="/login" />

          <div className="dashboard__hero glass reveal">
            <div className="dashboard__hero-glow" aria-hidden style={{ background: `radial-gradient(circle at 80% 20%, ${heroAccent}33, transparent 60%)` }} />
            <div className="dashboard__hero-content">
              <div className="eyebrow">Dashboard</div>
              <h2 style={{ margin: "0 0 6px" }}>{profileName ? `Cześć, ${profileName}` : "Przegląd bezpieczeństwa"}</h2>
              <p className="muted" style={{ margin: 0 }}>
                Skany, werdykty i ryzyko w jednym miejscu — okno {windowDays} dni.
              </p>
              <div className="status-indicator" style={{ marginTop: 14 }}>
                <span
                  className={`status-dot ${
                    status.state === "connected" ? "status-dot--ok" : "status-dot--off"
                  }`}
                />
                <span>{status.state === "connected" ? "Aktywna sesja" : "Status"}</span>
                <span className="muted">{status.message}</span>
              </div>
            </div>

            <div className="dashboard__hero-aside">
              <div className="dashboard__score-ring">
                <svg viewBox="0 0 120 120" width="140" height="140">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={heroAccent}
                    strokeWidth="10"
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    strokeDasharray={`${(safetyScore ?? 0) * 3.14} 314`}
                    style={{ transition: "stroke-dasharray 0.8s ease, stroke 0.4s ease" }}
                  />
                  <text
                    x="60"
                    y="62"
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                    fontSize="22"
                    fill="var(--text)"
                  >
                    {safetyScore == null ? "—" : `${safetyScore}`}
                  </text>
                  <text x="60" y="80" textAnchor="middle" fontSize="9" fill="var(--muted)" letterSpacing="0.2em">
                    SAFE %
                  </text>
                </svg>
              </div>

              <div className="dashboard__windows" role="tablist" aria-label="Zakres czasu">
                {WINDOW_OPTIONS.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    role="tab"
                    aria-selected={windowDays === w.value}
                    className={`dashboard__window ${windowDays === w.value ? "is-active" : ""}`}
                    onClick={() => setWindowDays(w.value)}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="dashboard__layout">
          <div
            className="section-grid"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}
          >
            <KpiCard
              label="Skany łącznie"
              value={loading ? "…" : stats?.total_scans ?? "—"}
              hint="All time"
              accent="#67b7ff"
              delay={0.05}
            />
            <KpiCard
              label={`Skany (${windowDays} dni)`}
              value={loading ? "…" : stats?.scans_in_window ?? "—"}
              hint="Okno"
              accent="#6ef7c7"
              delay={0.1}
            />
            <KpiCard
              label="Zagrożenia w oknie"
              value={loading ? "…" : stats?.threats_in_window ?? "—"}
              hint="Phish / suspicious"
              accent="#ff7b7b"
              delay={0.15}
            />
            <KpiCard
              label="Otwarte alerty wycieków"
              value={loading ? "…" : stats?.open_leak_alerts ?? "—"}
              hint="Leaks"
              accent="#ffae6e"
              delay={0.2}
            />
            <KpiCard
              label="Grupy"
              value={loading ? "…" : stats?.groups_count ?? "—"}
              hint="Workspace"
              accent="#67b7ff"
              delay={0.25}
            />
            <KpiCard
              label="Wysłane formularze"
              value={loading ? "…" : stats?.submissions_in_window ?? "—"}
              hint="Kategorie danych"
              accent="#ffd166"
              delay={0.3}
            />
          </div>

          <div className="section-grid" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16 }}>
            <div className="glass card reveal" style={{ minHeight: 340, animationDelay: "0.05s" }}>
              <SectionTitle title="Aktywność skanów" chip="Dziennie" />
              <div className="card__body" style={{ height: 280, marginTop: 4 }}>
                {activityData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillScans" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#67b7ff" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#67b7ff" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="fillThreats" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff7b7b" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#ff7b7b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} labelFormatter={(_, p) => p?.[0]?.payload?.date} />
                      <Area
                        type="monotone"
                        dataKey="scans"
                        name="Skany"
                        stroke="#67b7ff"
                        fill="url(#fillScans)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="threats"
                        name="Wysokie ryzyko"
                        stroke="#ff7b7b"
                        fill="url(#fillThreats)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart text="Brak skanów w wybranym oknie — użyj wtyczki lub uruchom seed." />
                )}
              </div>
            </div>

            <div className="glass card reveal" style={{ minHeight: 340, animationDelay: "0.1s" }}>
              <SectionTitle title="Werdykty" chip={`${windowDays} dni`} />
              <div className="card__body" style={{ marginTop: 4 }}>
                {pieData.length ? (
                  <>
                    <div style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={86}
                            paddingAngle={3}
                            stroke="rgba(7,9,15,0.85)"
                            strokeWidth={2}
                          >
                            {pieData.map((entry) => (
                              <Cell key={entry.key} fill={VERDICT_COLOR[entry.key] || "#64748b"} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="dashboard__legend">
                      {pieData.map((p) => (
                        <li key={p.key}>
                          <span style={{ background: VERDICT_COLOR[p.key] }} />
                          <span>{p.name}</span>
                          <strong>{p.value}</strong>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <EmptyChart text="Brak werdyktów w wybranym oknie." />
                )}
              </div>
            </div>
          </div>

          <div className="section-grid" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16 }}>
            <div className="glass card reveal" style={{ minHeight: 320, animationDelay: "0.15s" }}>
              <SectionTitle title="Wysłane dane — trend" chip="Formularze / dzień" />
              <div className="card__body" style={{ height: 260, marginTop: 4 }}>
                {submissionData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={submissionData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barSubmissions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#67b7ff" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#67b7ff" stopOpacity={0.45} />
                        </linearGradient>
                        <linearGradient id="barRisky" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff7b7b" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#ff7b7b" stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} labelFormatter={(_, p) => p?.[0]?.payload?.date} />
                      <Bar dataKey="submissions" name="Formularze" fill="url(#barSubmissions)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="risky" name="Ryzykowne" fill="url(#barRisky)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart text="Brak zgłoszeń formularzy w tym oknie." />
                )}
              </div>
            </div>

            <div className="glass card reveal" style={{ minHeight: 320, animationDelay: "0.2s" }}>
              <SectionTitle title="Najczęstsze kategorie danych" chip={`${windowDays} dni`} />
              <div className="card__body" style={{ marginTop: 4 }}>
                {categoriesData.length ? (
                  <ul className="dashboard__bars">
                    {categoriesData.map((c) => {
                      const max = Math.max(...categoriesData.map((d) => d.count));
                      const pct = max ? Math.round((c.count / max) * 100) : 0;
                      return (
                        <li key={c.key}>
                          <div className="dashboard__bars-row">
                            <span className="dashboard__bars-label">{c.label}</span>
                            <span className="dashboard__bars-value">{c.count}</span>
                          </div>
                          <div className="dashboard__bars-track">
                            <div className="dashboard__bars-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyChart text="Brak danych kategorii — pojawi się po zgłoszeniach." />
                )}
              </div>
            </div>
          </div>

          <div className="section-grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}>
            <div className="glass card reveal" style={{ animationDelay: "0.25s" }}>
              <SectionTitle title="Ostatnie skany" chip="Oś czasu" />
              <div className="card__body">
                {history.length ? (
                  <ul className="dashboard__history">
                    {history.map((item) => {
                      const v = item.verdict?.verdict || "unknown";
                      const score = item.verdict?.score ?? null;
                      return (
                        <li key={item.id}>
                          <div className="dashboard__history-main">
                            <span className="dashboard__history-domain">
                              {item.site?.domain || item.site?.url || "—"}
                            </span>
                            <span className="dashboard__history-date">
                              {new Date(item.scanned_at).toLocaleString()}
                            </span>
                          </div>
                          <span
                            className="dashboard__history-pill"
                            style={{
                              borderColor: VERDICT_COLOR[v],
                              color: VERDICT_COLOR[v],
                              background: `${VERDICT_COLOR[v]}1f`,
                            }}
                          >
                            {VERDICT_LABEL[v] || v}
                            {score != null && <strong> · {score}</strong>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="muted" style={{ margin: 0 }}>Brak historii skanów.</p>
                )}
              </div>
            </div>

            <div className="glass card reveal" style={{ animationDelay: "0.3s", minHeight: 300 }}>
              <SectionTitle title="Najgorsze strony" chip="Wynik" />
              <div className="card__body" style={{ height: 270 }}>
                {threats.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={threats} margin={{ left: 4, right: 16, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="domain"
                        width={110}
                        tick={{ fill: "#e2e8f0", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload }) =>
                          active && payload?.[0] ? (
                            <div
                              style={{
                                background: "rgba(7,9,15,0.92)",
                                border: "1px solid rgba(255,255,255,0.14)",
                                borderRadius: 12,
                                padding: "8px 12px",
                                fontSize: 12,
                              }}
                            >
                              <div>{payload[0].payload.domain}</div>
                              <div style={{ color: VERDICT_COLOR[payload[0].payload.verdict] }}>
                                {VERDICT_LABEL[payload[0].payload.verdict]} — {payload[0].value}/100
                              </div>
                            </div>
                          ) : null
                        }
                      />
                      <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                        {threats.map((t, i) => (
                          <Cell key={i} fill={VERDICT_COLOR[t.verdict] || "#67b7ff"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart text="Brak stron z podwyższonym ryzykiem." />
                )}
              </div>
            </div>

            <div className="glass card reveal" style={{ animationDelay: "0.35s", minHeight: 300 }}>
              <SectionTitle
                title="Wycieki — severity"
                chip={leakSev?.total != null ? `${leakSev.total} alertów` : "Leak alerts"}
              />
              <div className="card__body" style={{ marginTop: 4 }}>
                {severityData.length ? (
                  <>
                    <div style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                          innerRadius="35%"
                          outerRadius="100%"
                          data={severityData}
                          startAngle={90}
                          endAngle={-270}
                        >
                          <RadialBar
                            background={{ fill: "rgba(255,255,255,0.06)" }}
                            dataKey="value"
                            cornerRadius={10}
                          />
                          <Tooltip content={<ChartTooltip />} />
                          <Legend
                            iconType="circle"
                            verticalAlign="bottom"
                            wrapperStyle={{ fontSize: 11, color: "var(--muted)" }}
                          />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="dashboard__sev-meta">
                      <div>
                        <span className="muted">Otwarte</span>
                        <strong style={{ color: "var(--danger)" }}>{leakSev?.open ?? 0}</strong>
                      </div>
                      <div>
                        <span className="muted">Potwierdzone</span>
                        <strong style={{ color: "var(--accent)" }}>{leakSev?.acknowledged ?? 0}</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyChart text="Brak alertów wycieków — wszystko czyste." />
                )}
              </div>
            </div>
          </div>

          <div className="glass card reveal" style={{ animationDelay: "0.4s" }}>
            <SectionTitle title="Przetwarzanie danych — kraje (z werdyktów)" chip="90 dni" />
            <div className="card__body" style={{ height: 280 }}>
              {countryChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countryChartData} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
                    <defs>
                      <linearGradient id="barCountries" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6ef7c7" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#6ef7c7" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="total_submissions" name="Wystąpień w skanach" fill="url(#barCountries)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart text="Brak krajów w werdyktach — pojawi się po pełnych skanach." />
              )}
            </div>
          </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyChart({ text }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 8,
        color: "var(--muted)",
        fontSize: 13,
        padding: 16,
      }}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3-9 4 18 3-9h4" />
      </svg>
      <span>{text}</span>
    </div>
  );
}

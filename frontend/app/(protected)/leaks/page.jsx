"use client";

import { useEffect, useState } from "react";
import Topbar from "../../components/Topbar";
import { apiRequest } from "../../lib/api";
import { getAccessToken } from "../../lib/auth";

const CATEGORY_LABELS = {
  email: "E-mail",
  password: "Hasło",
  phone: "Telefon",
  full_name: "Imię i nazwisko",
  address: "Adres",
  date_of_birth: "Data urodzenia",
  national_id: "Numer identyfikacyjny",
  credit_card: "Karta płatnicza",
  bank_account: "Konto bankowe",
  gps_location: "Lokalizacja GPS",
  ip_address: "Adres IP",
  device_id: "Identyfikator urządzenia",
  biometric: "Dane biometryczne",
  photo: "Zdjęcie",
  browsing_history: "Historia przeglądania",
  contacts: "Kontakty",
  other: "Inne",
};

const SEVERITY_LABELS = {
  low: "Niskie",
  medium: "Średnie",
  high: "Wysokie",
  critical: "Krytyczne",
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
      setError("Zaloguj się, aby zobaczyć dane.");
      setLoading(false);
      return;
    }

    apiRequest("/api/leaks/me?limit=50&offset=0", { token })
      .then((data) => {
        setSubmissions(data?.submissions || []);
        setLeakAlerts(data?.leak_alerts || []);
        setError("");
      })
      .catch((err) => setError(err.message || "Nie udało się wczytać danych."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <Topbar ctaLabel="Zaloguj" ctaHref="/login" />
          <div className="section__header reveal">
            <div className="eyebrow">Wycieki i telemetria</div>
            <h2>Co wysłałeś na strony</h2>
            <p>
              Rejestrujemy tylko <strong>kategorie</strong> pól formularzy (np. e-mail, hasło), nigdy treść wpisów.
              Dane pochodzą z rozszerzenia ClearTerms po wysłaniu formularza oraz z bazy skanów.
            </p>
          </div>

          <div className="section-grid">
            <div className="glass card" style={{ gridColumn: "1 / -1" }}>
              <div className="card__header">
                <h3>Alerty ryzyka</h3>
                <span className="chip chip--accent">Phishing / podejrzane</span>
              </div>
              <div className="card__body">
                {loading ? (
                  <p className="muted">Wczytywanie…</p>
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
                          <span className="muted">Kategorie: </span>
                          {formatCategories(a.data_categories)}
                        </p>
                        <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--muted)" }}>
                          {new Date(a.detected_at).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Brak alertów — nie wykryto przesłania danych na strony ocenione jako phishing lub podejrzane.</p>
                )}
              </div>
            </div>

            <div className="glass card" style={{ gridColumn: "1 / -1" }}>
              <div className="card__header">
                <h3>Historia przesłanych kategorii</h3>
                <span className="chip">Formularze</span>
              </div>
              <div className="card__body">
                {loading ? (
                  <p className="muted">Wczytywanie…</p>
                ) : error ? (
                  <p style={{ color: "var(--danger)" }}>{error}</p>
                ) : submissions.length ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                      <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                          <th style={{ padding: "10px 8px" }}>Kiedy</th>
                          <th style={{ padding: "10px 8px" }}>Domena</th>
                          <th style={{ padding: "10px 8px" }}>Kategorie danych</th>
                          <th style={{ padding: "10px 8px" }}>Werdykt strony</th>
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
                                <span className="muted">Brak skanu</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">
                    Brak wpisów. Zainstaluj rozszerzenie, zaloguj się w nim i wyślij formularz na stronie — wtedy pojawi się wpis z kategoriami pól.
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

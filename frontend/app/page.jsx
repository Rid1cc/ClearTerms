"use client";
import { useState, useEffect, useRef } from "react";

// ─── Mock API hooks (replace with real fetch calls) ───────────────────────────
function useSiteData() {
  const [data, setData] = useState(null);
  useEffect(() => {
    // Replace with: fetch('/api/sites').then(r => r.json()).then(setData)
    setData({
      sites: [
        { id: 1, url: "facebook.com", score: 94, category: "Social Media", risk: "low", description: "Duża platforma społecznościowa. Uważaj na fałszywe profile i quizy wyłudzające dane.", lastChecked: "2025-01-09", reports: 12 },
        { id: 2, url: "allegro.pl", score: 88, category: "E-commerce", risk: "low", description: "Polska platforma zakupowa. Weryfikuj sprzedawców przed zakupem.", lastChecked: "2025-01-09", reports: 4 },
        { id: 3, url: "onet.pl", score: 91, category: "News", risk: "low", description: "Portal informacyjny. Sprawdzaj źródła newsów – dezinformacja jest powszechna.", lastChecked: "2025-01-08", reports: 2 },
        { id: 4, url: "allegro-sklep24.net", score: 12, category: "Phishing", risk: "critical", description: "UWAGA! Strona podszywa się pod Allegro. Nie podawaj danych karty!", lastChecked: "2025-01-09", reports: 387 },
        { id: 5, url: "pk.edu.pl", score: 97, category: "Education", risk: "low", description: "Oficjalna strona Politechniki Krakowskiej. Zaufane środowisko akademickie.", lastChecked: "2025-01-08", reports: 0 },
        { id: 6, url: "bank-promo2025.com", score: 8, category: "Scam", risk: "critical", description: "Fałszywa strona bankowa! Wyłudza dane logowania do kont bankowych.", lastChecked: "2025-01-09", reports: 512 },
        { id: 7, url: "olx.pl", score: 82, category: "Marketplace", risk: "medium", description: "Popularne ogłoszenia. Uwaga na fałszywe ogłoszenia i prośby o płatność z góry.", lastChecked: "2025-01-09", reports: 89 },
        { id: 8, url: "pko.pl", score: 99, category: "Banking", risk: "low", description: "Oficjalna strona PKO BP. Zawsze sprawdzaj adres URL i certyfikat SSL.", lastChecked: "2025-01-09", reports: 1 },
      ],
      threats: [
        { id: 1, type: "Phishing", title: "Fałszywy e-mail od PKO BP", date: "2025-01-08", severity: "high", affected: 2340, description: "Masowa kampania phishingowa podszywająca się pod PKO BP. E-maile zawierają link do fałszywej strony logowania.", tips: ["Sprawdź adres nadawcy", "Bank nigdy nie pyta o hasło mailowo", "Wejdź na stronę banku bezpośrednio przez przeglądarkę"] },
        { id: 2, type: "Smishing", title: "SMS o paczce InPost", date: "2025-01-07", severity: "high", affected: 5100, description: "Fałszywe SMS-y informujące o zatrzymanej paczce wymagają dopłaty 1 zł. To pułapka na dane karty.", tips: ["Nie klikaj linków w SMS-ach od nieznanych", "Sprawdź status paczki bezpośrednio na inpost.pl", "InPost nigdy nie pobiera dopłat przez SMS"] },
        { id: 3, type: "Vishing", title: "Telefon od fałszywego policjanta", date: "2025-01-06", severity: "critical", affected: 890, description: "Oszuści dzwonią udając policjantów lub prokuratorów i żądają przekazania pieniędzy dla 'ochrony środków'.", tips: ["Rozłącz się i zadzwoń na 112", "Policja nigdy nie prosi o pieniądze przez telefon", "Poinformuj rodzinę o tym schemacie"] },
        { id: 4, type: "Ransomware", title: "Złośliwe załączniki w mailach", date: "2025-01-05", severity: "medium", affected: 430, description: "E-maile z załącznikami .zip lub .docx instalują oprogramowanie szyfrujące pliki na komputerze.", tips: ["Nie otwieraj nieznanych załączników", "Używaj aktualnego antywirusa", "Rób kopie zapasowe ważnych plików"] },
        { id: 5, type: "Fake Shop", title: "Sklep z elektroniką na Facebooku", date: "2025-01-04", severity: "medium", affected: 1200, description: "Reklamy na Facebooku prowadzą do fałszywego sklepu z elektroniką oferującego iPhone'y w cenach 80% poniżej rynku.", tips: ["Sprawdź opinie o sklepie w Google", "Płać kartą lub PayPalem dla ochrony", "Ceny zbyt atrakcyjne = czerwona flaga"] },
      ],
      stats: { sitesAnalyzed: 142890, threatsBlocked: 8420, usersProtected: 34200, accuracy: 99.2 }
    });
  }, []);
  return data;
}

// ─── Components ───────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 28, c = 2 * Math.PI * r;
  const fill = (score / 100) * c;
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${fill} ${c}`} strokeLinecap="round"
        transform="rotate(-90 36 36)" style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x="36" y="41" textAnchor="middle" fill={color} fontSize="15" fontWeight="700" fontFamily="monospace">{score}</text>
    </svg>
  );
}

function RiskBadge({ risk }) {
  const cfg = {
    low: { label: "Bezpieczna", bg: "#052e16", color: "#4ade80", border: "#166534" },
    medium: { label: "Uwaga", bg: "#422006", color: "#fbbf24", border: "#92400e" },
    critical: { label: "Niebezpieczna", bg: "#2d0000", color: "#f87171", border: "#7f1d1d" },
  };
  const s = cfg[risk] || cfg.low;
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
      {s.label}
    </span>
  );
}

function SeverityDot({ severity }) {
  const c = severity === "critical" ? "#f87171" : severity === "high" ? "#fbbf24" : "#a78bfa";
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, marginRight: 6, flexShrink: 0, boxShadow: `0 0 6px ${c}` }} />;
}

// ─── Sections ─────────────────────────────────────────────────────────────────
function HeroSection({ stats }) {
  const [checked, setChecked] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const handleCheck = () => {
    if (!checked.trim()) return;
    setChecking(true);
    setResult(null);
    // Replace with: fetch('/api/check-url', { method: 'POST', body: JSON.stringify({ url: checked }) })
    setTimeout(() => {
      setChecking(false);
      setResult({ score: Math.floor(Math.random() * 100), risk: Math.random() > 0.6 ? "low" : Math.random() > 0.4 ? "medium" : "critical" });
    }, 1800);
  };

  return (
    <section style={{ padding: "80px 0 60px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(34,197,94,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", position: "relative" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 99, padding: "6px 16px", marginBottom: 28 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 13, color: "#4ade80", fontWeight: 600, letterSpacing: "0.05em" }}>AKTYWNA OCHRONA</span>
        </div>
        <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 20px", letterSpacing: "-0.03em" }}>
          Twój cyfrowy{" "}
          <span style={{ background: "linear-gradient(135deg, #22c55e, #4ade80)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>strażnik</span>
          {" "}w sieci
        </h1>
        <p style={{ fontSize: "1.15rem", color: "#94a3b8", lineHeight: 1.7, margin: "0 0 40px", maxWidth: 580, marginLeft: "auto", marginRight: "auto" }}>
          Sprawdzamy bezpieczeństwo stron internetowych i edukujemy jak chronić siebie i bliskich przed cyberzagrożeniami. Proste. Zrozumiałe. Skuteczne.
        </p>
        <div style={{ display: "flex", gap: 0, maxWidth: 560, margin: "0 auto 16px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden" }}>
          <input value={checked} onChange={e => setChecked(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCheck()}
            placeholder="Wpisz adres strony np. allegro.pl…"
            style={{ flex: 1, background: "transparent", border: "none", padding: "14px 20px", fontSize: 15, color: "#e2e8f0", outline: "none", fontFamily: "inherit" }} />
          <button onClick={handleCheck} disabled={checking}
            style={{ background: "#22c55e", color: "#052e16", border: "none", padding: "14px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s", whiteSpace: "nowrap" }}>
            {checking ? "Sprawdzam…" : "Sprawdź stronę"}
          </button>
        </div>
        {result && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "12px 20px", marginBottom: 8 }}>
            <ScoreRing score={result.score} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Wynik bezpieczeństwa dla <strong style={{ color: "#e2e8f0" }}>{checked}</strong></div>
              <RiskBadge risk={result.risk} />
            </div>
          </div>
        )}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, marginTop: 56, background: "#1e293b", borderRadius: 12, overflow: "hidden" }}>
            {[
              { label: "Sprawdzonych stron", value: stats.sitesAnalyzed.toLocaleString("pl") },
              { label: "Zablokowanych zagrożeń", value: stats.threatsBlocked.toLocaleString("pl") },
              { label: "Chronionych użytkowników", value: stats.usersProtected.toLocaleString("pl") },
              { label: "Dokładność analizy", value: `${stats.accuracy}%` },
            ].map((s, i) => (
              <div key={i} style={{ background: "#0f172a", padding: "20px 16px", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#22c55e", fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SiteDatabase({ sites }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("score");
  const [expanded, setExpanded] = useState(null);

  const filtered = (sites || [])
    .filter(s => {
      const q = search.toLowerCase();
      const matchQ = !q || s.url.includes(q) || s.category.toLowerCase().includes(q);
      const matchF = filter === "all" || s.risk === filter;
      return matchQ && matchF;
    })
    .sort((a, b) => sort === "score" ? b.score - a.score : sort === "reports" ? b.reports - a.reports : a.url.localeCompare(b.url));

  return (
    <section style={{ padding: "60px 0" }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: "1.9rem", fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Baza sprawdzonych stron</h2>
        <p style={{ color: "#64748b", margin: 0 }}>Oceny i informacje o popularnych stronach w Polsce</p>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Szukaj strony lub kategorii…"
          style={{ flex: 1, minWidth: 220, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 16px", fontSize: 14, color: "#e2e8f0", outline: "none", fontFamily: "inherit" }} />
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#94a3b8", fontFamily: "inherit", cursor: "pointer" }}>
          <option value="all">Wszystkie</option>
          <option value="low">Bezpieczne</option>
          <option value="medium">Uwaga</option>
          <option value="critical">Niebezpieczne</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)}
          style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#94a3b8", fontFamily: "inherit", cursor: "pointer" }}>
          <option value="score">Sortuj: wynik</option>
          <option value="reports">Sortuj: zgłoszenia</option>
          <option value="url">Sortuj: URL</option>
        </select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(site => (
          <div key={site.id} onClick={() => setExpanded(expanded === site.id ? null : site.id)}
            style={{ background: "#0f172a", border: `1px solid ${expanded === site.id ? "#22c55e33" : "#1e293b"}`, borderRadius: 10, padding: "16px 20px", cursor: "pointer", transition: "all 0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ScoreRing score={site.score} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0" }}>{site.url}</span>
                  <span style={{ fontSize: 12, color: "#475569", background: "#1e293b", borderRadius: 4, padding: "2px 8px" }}>{site.category}</span>
                  <RiskBadge risk={site.risk} />
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: expanded === site.id ? "normal" : "nowrap" }}>{site.description}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: "#475569" }}>{site.reports} zgłoszeń</div>
                <div style={{ fontSize: 11, color: "#334155", marginTop: 2 }}>{site.lastChecked}</div>
              </div>
            </div>
            {expanded === site.id && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #1e293b" }}>
                <p style={{ margin: "0 0 12px", fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>{site.description}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={{ background: "#22c55e15", border: "1px solid #166534", color: "#4ade80", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                    Zgłoś problem
                  </button>
                  <button style={{ background: "transparent", border: "1px solid #1e293b", color: "#64748b", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                    Pełny raport →
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#334155" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p style={{ margin: 0 }}>Nie znaleziono wyników. Spróbuj wyszukać inną frazę.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function ThreatFeed({ threats }) {
  const [selected, setSelected] = useState(null);
  const threat = threats?.find(t => t.id === selected);

  return (
    <section style={{ padding: "60px 0" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f87171", boxShadow: "0 0 10px #f87171", animation: "pulse 1.5s infinite" }} />
          <h2 style={{ fontSize: "1.9rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Ostatnie zagrożenia</h2>
        </div>
        <p style={{ color: "#64748b", margin: 0 }}>Aktualne ataki w Polsce — bądź o krok do przodu</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(threats || []).map(t => (
            <div key={t.id} onClick={() => setSelected(selected === t.id ? null : t.id)}
              style={{ background: selected === t.id ? "#0f172a" : "#080f1a", border: `1px solid ${selected === t.id ? "#ef444433" : "#1e293b"}`, borderLeft: `3px solid ${t.severity === "critical" ? "#f87171" : t.severity === "high" ? "#fbbf24" : "#a78bfa"}`, borderRadius: 8, padding: "14px 16px", cursor: "pointer", transition: "all 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <SeverityDot severity={t.severity} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em" }}>{t.type}</span>
                <span style={{ fontSize: 11, color: "#334155", marginLeft: "auto" }}>{t.date}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0", marginBottom: 4 }}>{t.title}</div>
              <div style={{ fontSize: 12, color: "#475569" }}>{t.affected.toLocaleString("pl")} osób zagrożonych</div>
            </div>
          ))}
        </div>
        <div style={{ position: "sticky", top: 20 }}>
          {threat ? (
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <SeverityDot severity={threat.severity} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em" }}>{threat.type}</span>
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0 0 12px", color: "#e2e8f0" }}>{threat.title}</h3>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, margin: "0 0 20px" }}>{threat.description}</p>
              <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 8, padding: "16px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4ade80", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>✓ Jak się chronić</div>
                {threat.tips.map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: "#86efac" }}>
                    <span style={{ flexShrink: 0, fontWeight: 700 }}>{i + 1}.</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
              <button style={{ marginTop: 16, width: "100%", background: "transparent", border: "1px solid #1e293b", color: "#64748b", borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Udostępnij ostrzeżenie
              </button>
            </div>
          ) : (
            <div style={{ background: "#080f1a", border: "1px dashed #1e293b", borderRadius: 10, padding: "60px 24px", textAlign: "center", color: "#334155" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👈</div>
              <p style={{ margin: 0, fontSize: 14 }}>Kliknij na zagrożenie,<br />aby zobaczyć szczegóły i porady</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function EducationSection() {
  const modules = [
    { icon: "🎣", title: "Phishing", level: "Podstawowy", duration: "5 min", color: "#fbbf24", desc: "Naucz się rozpoznawać fałszywe e-maile i linki zanim dasz się złapać." },
    { icon: "💳", title: "Bezpieczne zakupy online", level: "Podstawowy", duration: "7 min", color: "#4ade80", desc: "Jak bezpiecznie kupować w internecie i co zrobić gdy coś pójdzie nie tak." },
    { icon: "🔐", title: "Silne hasła", level: "Podstawowy", duration: "4 min", color: "#818cf8", desc: "Dlaczego 'Ala123' to złe hasło i jak stworzyć hasło którego nie zapomnisz." },
    { icon: "📱", title: "Bezpieczeństwo smartfona", level: "Średni", duration: "8 min", color: "#38bdf8", desc: "Uprawnienia aplikacji, fałszywe SMS-y i jak chronić swój telefon." },
    { icon: "🌐", title: "Bezpieczny Wi-Fi", level: "Średni", duration: "6 min", color: "#f472b6", desc: "Dlaczego publiczne Wi-Fi może być niebezpieczne i jak się chronić." },
    { icon: "👴", title: "Ochrona seniorów", level: "Specjalny", duration: "10 min", color: "#fb923c", desc: "Najpopularniejsze oszustwa wymierzone w seniorów — rozpoznaj je i chroń bliskich." },
  ];

  return (
    <section style={{ padding: "60px 0" }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: "1.9rem", fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Centrum edukacji</h2>
        <p style={{ color: "#64748b", margin: 0 }}>Krótkie, praktyczne lekcje które realnie chronią</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {modules.map((m, i) => (
          <div key={i} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "20px", cursor: "pointer", transition: "border-color 0.2s", position: "relative", overflow: "hidden" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = m.color + "44"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#1e293b"}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: m.color + "08", borderRadius: "0 12px 0 80px" }} />
            <div style={{ fontSize: 32, marginBottom: 12 }}>{m.icon}</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 600, background: m.color + "15", color: m.color, borderRadius: 4, padding: "2px 8px" }}>{m.level}</span>
              <span style={{ fontSize: 11, color: "#475569", background: "#1e293b", borderRadius: 4, padding: "2px 8px" }}>⏱ {m.duration}</span>
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 8px", color: "#e2e8f0" }}>{m.title}</h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px", lineHeight: 1.6 }}>{m.desc}</p>
            <button style={{ background: "transparent", border: `1px solid ${m.color}44`, color: m.color, borderRadius: 6, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
              Zacznij lekcję →
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuizSection() {
  const questions = [
    { q: "Dostałeś/-aś e-mail od banku z prośbą o kliknięcie linku i zalogowanie. Co robisz?", opts: ["Klikam link i loguję się", "Ignoruję i usuwam e-mail", "Dzwonię na infolinię banku podaną na odwrocie karty", "Przekazuję do rodziny"], correct: 2, explain: "Bank nigdy nie prosi o logowanie przez e-mail. Zawsze kontaktuj się przez numer z karty bankowej lub ze strony banku wpisanej ręcznie." },
    { q: "Znajomy na Facebooku prosi Cię o pożyczkę przez wiadomość. Co sprawdzasz?", opts: ["Od razu wysyłam pieniądze, to znajomy", "Dzwonię do tej osoby bezpośrednio", "Proszę o więcej szczegółów przez Messenger", "Sprawdzam kiedy ostatnio był aktywny"], correct: 1, explain: "Konta na mediach społecznościowych są przejmowane przez hakerów. Zawsze zadzwoń lub spotkaj się osobiście zanim wyślesz pieniądze." },
    { q: "Która z tych stron wygląda wiarygodnie?", opts: ["al1egro-pl.net/kup", "allegro.pl", "allegro-sklep-okazje.com", "alllegro.pl"], correct: 1, explain: "Oficjalna domena to allegro.pl. Inne adresy z literówkami, myślnikami lub innymi domenami to phishing." },
  ];

  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const q = questions[qi];

  const pick = (i) => {
    if (selected !== null) return;
    setSelected(i);
    if (i === q.correct) setScore(s => s + 1);
  };

  const next = () => {
    if (qi < questions.length - 1) { setQi(q => q + 1); setSelected(null); }
    else setDone(true);
  };

  const restart = () => { setQi(0); setSelected(null); setScore(0); setDone(false); };

  return (
    <section style={{ padding: "60px 0" }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: "1.9rem", fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Sprawdź swoją wiedzę</h2>
        <p style={{ color: "#64748b", margin: 0 }}>Szybki quiz — czy dasz się złapać?</p>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "32px" }}>
        {!done ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <span style={{ fontSize: 13, color: "#475569" }}>Pytanie {qi + 1} z {questions.length}</span>
              <span style={{ fontSize: 13, color: "#22c55e", fontWeight: 700 }}>Wynik: {score}</span>
            </div>
            <div style={{ background: "#080f1a", borderRadius: 8, height: 4, marginBottom: 28, overflow: "hidden" }}>
              <div style={{ width: `${((qi) / questions.length) * 100}%`, height: "100%", background: "#22c55e", transition: "width 0.4s" }} />
            </div>
            <p style={{ fontSize: "1.05rem", fontWeight: 600, color: "#e2e8f0", lineHeight: 1.5, margin: "0 0 24px" }}>{q.q}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {q.opts.map((opt, i) => {
                let bg = "#080f1a", border = "#1e293b", color = "#94a3b8";
                if (selected !== null) {
                  if (i === q.correct) { bg = "#052e16"; border = "#166534"; color = "#4ade80"; }
                  else if (i === selected) { bg = "#2d0000"; border = "#7f1d1d"; color = "#f87171"; }
                }
                return (
                  <button key={i} onClick={() => pick(i)}
                    style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "12px 16px", textAlign: "left", color, fontSize: 14, cursor: selected !== null ? "default" : "pointer", fontFamily: "inherit", transition: "all 0.2s", lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700, marginRight: 8, opacity: 0.5 }}>{String.fromCharCode(65 + i)}.</span>{opt}
                  </button>
                );
              })}
            </div>
            {selected !== null && (
              <>
                <div style={{ background: "#0c1a2e", border: "1px solid #1e3a5f", borderRadius: 8, padding: "14px 16px", marginTop: 16, fontSize: 13, color: "#93c5fd", lineHeight: 1.6 }}>
                  💡 {q.explain}
                </div>
                <button onClick={next} style={{ marginTop: 16, width: "100%", background: "#22c55e", color: "#052e16", border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                  {qi < questions.length - 1 ? "Następne pytanie →" : "Zobacz wynik →"}
                </button>
              </>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>{score === 3 ? "🏆" : score === 2 ? "👍" : "📚"}</div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 8px" }}>{score}/{questions.length} poprawnych odpowiedzi</h3>
            <p style={{ color: "#64748b", margin: "0 0 24px" }}>{score === 3 ? "Doskonale! Jesteś świetnie chroniony/-a." : score === 2 ? "Dobrze, ale warto powtórzyć lekcje." : "Koniecznie sprawdź nasze lekcje edukacyjne!"}</p>
            <button onClick={restart} style={{ background: "#22c55e", color: "#052e16", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
              Spróbuj jeszcze raz
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function PricingSection() {
  const plans = [
    {
      name: "Darmowy", price: "0 zł", period: "/miesiąc", color: "#475569",
      features: ["Sprawdzanie stron (10/dzień)", "Ostrzeżenia o zagrożeniach", "Lekcje edukacyjne (3)", "Quiz bezpieczeństwa"],
      missing: ["Nieograniczone sprawdzanie", "Analiza ryzyka profilu", "Raport dla rodziny", "Priorytetowe wsparcie"],
      cta: "Zacznij za darmo"
    },
    {
      name: "Rodzinny", price: "29 zł", period: "/miesiąc", color: "#22c55e", featured: true,
      features: ["Nieograniczone sprawdzanie stron", "Wszystkie lekcje edukacyjne", "Monitoring dla 5 osób", "Cotygodniowe raporty", "Alerty SMS w czasie rzeczywistym", "Priorytetowe wsparcie"],
      missing: [],
      cta: "Zacznij 14 dni za darmo"
    },
    {
      name: "Firma / Szkoła", price: "199 zł", period: "/miesiąc", color: "#818cf8",
      features: ["Wszystko z Rodzinnego", "Do 100 użytkowników", "Panel administracyjny", "Szkolenia grupowe", "Analiza podatności zespołu", "API i integracje", "Dedykowany opiekun"],
      missing: [],
      cta: "Skontaktuj się z nami"
    }
  ];

  return (
    <section style={{ padding: "60px 0" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h2 style={{ fontSize: "1.9rem", fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Wybierz swój plan</h2>
        <p style={{ color: "#64748b", margin: 0 }}>Chroń siebie, rodzinę lub cały zespół</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {plans.map((plan, i) => (
          <div key={i} style={{ background: "#0f172a", border: `1px solid ${plan.featured ? plan.color + "44" : "#1e293b"}`, borderRadius: 16, padding: "28px 24px", position: "relative", display: "flex", flexDirection: "column" }}>
            {plan.featured && (
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#22c55e", color: "#052e16", borderRadius: 99, padding: "4px 16px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", letterSpacing: "0.05em" }}>
                NAJPOPULARNIEJSZY
              </div>
            )}
            <div style={{ color: plan.color, fontSize: 13, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>{plan.name}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
              <span style={{ fontSize: "2rem", fontWeight: 800, color: "#e2e8f0" }}>{plan.price}</span>
              <span style={{ fontSize: 13, color: "#475569" }}>{plan.period}</span>
            </div>
            <div style={{ flex: 1 }}>
              {plan.features.map((f, j) => (
                <div key={j} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: "#94a3b8" }}>
                  <span style={{ color: "#22c55e", flexShrink: 0, fontWeight: 700 }}>✓</span>{f}
                </div>
              ))}
              {plan.missing.map((f, j) => (
                <div key={j} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: "#334155", textDecoration: "line-through" }}>
                  <span style={{ flexShrink: 0 }}>–</span>{f}
                </div>
              ))}
            </div>
            <button style={{ marginTop: 24, width: "100%", background: plan.featured ? "#22c55e" : "transparent", color: plan.featured ? "#052e16" : plan.color, border: `1px solid ${plan.color}44`, borderRadius: 8, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const data = useSiteData();
  const [activeNav, setActiveNav] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = [
    { id: "home", label: "Start" },
    { id: "sites", label: "Baza stron" },
    { id: "threats", label: "Zagrożenia" },
    { id: "learn", label: "Edukacja" },
    { id: "quiz", label: "Quiz" },
    { id: "pricing", label: "Cennik" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#e2e8f0", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        * { box-sizing: border-box; }
        ::selection { background: #22c55e33; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #020817; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        input::placeholder { color: #475569; }
      `}</style>

      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "#020817cc", backdropFilter: "blur(12px)", borderBottom: "1px solid #1e293b" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: 60, gap: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: "auto" }}>
            <div style={{ width: 28, height: 28, background: "#22c55e", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🛡</div>
            <span style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.02em" }}>ClearTerms</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {navItems.map(n => (
              <button key={n.id} onClick={() => setActiveNav(n.id)}
                style={{ background: activeNav === n.id ? "#22c55e15" : "transparent", color: activeNav === n.id ? "#4ade80" : "#64748b", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: activeNav === n.id ? 700 : 400, transition: "all 0.2s" }}>
                {n.label}
              </button>
            ))}
          </div>
          <button style={{ background: "#22c55e", color: "#052e16", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Zaloguj się
          </button>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
        {activeNav === "home" && <HeroSection stats={data?.stats} />}
        {activeNav === "sites" && <SiteDatabase sites={data?.sites} />}
        {activeNav === "threats" && <ThreatFeed threats={data?.threats} />}
        {activeNav === "learn" && <EducationSection />}
        {activeNav === "quiz" && <QuizSection />}
        {activeNav === "pricing" && <PricingSection />}

        {/* Always show on home */}
        {activeNav === "home" && data && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 4px" }}>Ostatnie zagrożenia</h2>
                  <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>Kliknij aby zobaczyć pełną listę →</p>
                </div>
                {data.threats.slice(0, 3).map(t => (
                  <div key={t.id} onClick={() => setActiveNav("threats")}
                    style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12, cursor: "pointer", padding: "12px", background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b" }}>
                    <SeverityDot severity={t.severity} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#e2e8f0", marginBottom: 2 }}>{t.title}</div>
                      <div style={{ fontSize: 12, color: "#475569" }}>{t.type} · {t.affected.toLocaleString("pl")} osób</div>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 4px" }}>Niebezpieczne strony</h2>
                  <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>Ostrzeżenie dla Twojej rodziny →</p>
                </div>
                {data.sites.filter(s => s.risk === "critical").slice(0, 3).map(s => (
                  <div key={s.id} onClick={() => setActiveNav("sites")}
                    style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, cursor: "pointer", padding: "12px", background: "#0f172a", borderRadius: 8, border: "1px solid #2d000044", borderLeft: "3px solid #f87171" }}>
                    <ScoreRing score={s.score} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#e2e8f0", marginBottom: 2 }}>{s.url}</div>
                      <div style={{ fontSize: 12, color: "#f87171" }}>⚠ {s.reports} zgłoszeń oszustwa</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 40, background: "linear-gradient(135deg, #052e16, #0f172a)", border: "1px solid #166534", borderRadius: 16, padding: "40px", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: 12 }}>🧑‍🎓</div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 8px" }}>Sprawdź swoją wiedzę o cyberbezpieczeństwie</h2>
              <p style={{ color: "#4ade80", margin: "0 0 20px", fontSize: 14 }}>3 pytania · 2 minuty · Może uratować Ci oszczędności życia</p>
              <button onClick={() => setActiveNav("quiz")} style={{ background: "#22c55e", color: "#052e16", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                Zacznij quiz →
              </button>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #0f172a", padding: "24px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>
          🛡 ClearTerms · Chroń siebie i bliskich · <a href="#" style={{ color: "#22c55e", textDecoration: "none" }}>Polityka prywatności</a> · <a href="#" style={{ color: "#475569", textDecoration: "none" }}>Kontakt</a>
        </p>
      </footer>
    </div>
  );
}

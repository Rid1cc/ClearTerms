"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Mock heuristics — purely client-side, no backend.
// Goal: feel like a real classifier so demos look credible.

const PHISHING_KEYWORDS = [
  "login",
  "verify",
  "secure",
  "account",
  "update",
  "urgent",
  "reauth",
  "confirm",
  "wallet",
  "gift",
  "prize",
  "winner",
  "redirect",
  "validate",
  "unlock",
  "support-team",
];

const TRACKER_TERMS = [
  "tracker",
  "ad-",
  "pixel",
  "analytics-",
  "shady",
  "click",
  "promo",
  "sponsored",
];

const SUSPECT_TLDS = [".ru", ".cn", ".tk", ".gq", ".ml", ".cf", ".ga", ".top", ".xyz", ".click", ".zip"];
const SAFE_TLDS = [".gov", ".edu", ".int"];
const SAFE_DOMAINS = [
  "google.com",
  "github.com",
  "wikipedia.org",
  "mozilla.org",
  "cloudflare.com",
  "microsoft.com",
  "apple.com",
  "anthropic.com",
];

const VERDICT_LABEL = {
  safe: "Safe",
  suspicious: "Suspicious",
  phishing: "Phishing",
};
const VERDICT_COLOR = {
  safe: "#6ef7c7",
  suspicious: "#ffd166",
  phishing: "#ff7b7b",
};
const VERDICT_DESC = {
  safe: "This site looks trustworthy. No major risk signals detected.",
  suspicious: "Elevated-risk indicators found — be careful with forms and credentials.",
  phishing: "High phishing risk. Don't enter data or download anything from this site.",
};

function normalizeUrl(input) {
  let s = (input || "").trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (!u.hostname || !/[a-z0-9]/i.test(u.hostname)) return null;
    return { href: u.href, host: u.hostname.toLowerCase() };
  } catch {
    return null;
  }
}

function analyze(host) {
  const flags = [];
  const lower = host.toLowerCase();
  const numDashes = (lower.match(/-/g) || []).length;
  const numDots = (lower.match(/\./g) || []).length;
  const isIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(lower);
  const phishingHits = PHISHING_KEYWORDS.filter((k) => lower.includes(k));
  const trackerHits = TRACKER_TERMS.filter((k) => lower.includes(k));
  const susTld = SUSPECT_TLDS.find((t) => lower.endsWith(t));
  const safeTld = SAFE_TLDS.find((t) => lower.endsWith(t));
  const isKnownSafe = SAFE_DOMAINS.some((d) => lower === d || lower.endsWith("." + d));

  let verdict = "safe";
  let score = 80;

  if (isKnownSafe) {
    verdict = "safe";
    score = 96;
  } else if (phishingHits.length >= 2) {
    verdict = "phishing";
    score = 6 + (lower.length % 8);
    flags.push(`Phishing keywords in URL: ${phishingHits.slice(0, 3).join(", ")}`);
    flags.push("Deceptive URL pattern");
    flags.push("No verifiable owner identity");
  } else if (phishingHits.length === 1 && (susTld || numDashes >= 3 || isIP)) {
    verdict = "phishing";
    score = 10 + (lower.length % 10);
    flags.push(`Phishing keyword "${phishingHits[0]}" in domain`);
    if (susTld) flags.push(`Suspect TLD: ${susTld}`);
    if (numDashes >= 3) flags.push("Unusually segmented host");
    if (isIP) flags.push("Raw IP address instead of a domain");
  } else if (phishingHits.length === 1) {
    verdict = "suspicious";
    score = 38 + (lower.length % 14);
    flags.push(`Keyword "${phishingHits[0]}" in domain`);
    flags.push("Verify before submitting any data");
  } else if (susTld) {
    verdict = "suspicious";
    score = 30 + (lower.length % 18);
    flags.push(`Suspect TLD: ${susTld}`);
    flags.push("Low-reputation domain zone");
  } else if (trackerHits.length >= 2) {
    verdict = "suspicious";
    score = 44 + (lower.length % 12);
    flags.push("Aggressive tracking patterns");
    flags.push(`Detected: ${trackerHits.slice(0, 2).join(", ")}`);
  } else if (isIP) {
    verdict = "suspicious";
    score = 28;
    flags.push("Raw IP address instead of a domain name");
  } else if (numDashes >= 4) {
    verdict = "suspicious";
    score = 48 + numDashes * 2;
    flags.push("Unusually long, hyphen-segmented URL");
  } else if (safeTld) {
    verdict = "safe";
    score = 92 + (lower.length % 6);
  } else {
    verdict = "safe";
    score = 70 + (lower.length % 22);
    if (trackerHits.length === 1) {
      flags.push(`Marketing tracker detected: ${trackerHits[0]}`);
      score = Math.max(60, score - 10);
    }
    if (numDots >= 4) {
      flags.push("Many subdomains — verify the context");
      score -= 4;
    }
  }

  // Mock data-processing countries based on TLD/host.
  const countries = new Set();
  if (lower.endsWith(".ru")) countries.add("RU");
  else if (lower.endsWith(".cn")) countries.add("CN");
  else if (lower.endsWith(".de")) countries.add("DE");
  else if (lower.endsWith(".fr")) countries.add("FR");
  else if (lower.endsWith(".uk") || lower.endsWith(".co.uk")) countries.add("GB");
  else if (lower.endsWith(".pl")) countries.add("PL");
  else if (lower.endsWith(".jp")) countries.add("JP");
  else if (lower.endsWith(".in")) countries.add("IN");
  else countries.add("US");
  if (verdict !== "safe") countries.add("US"); // shared infra
  if (susTld === ".cn") countries.add("RU");

  score = Math.max(3, Math.min(99, Math.round(score)));

  return {
    verdict,
    score,
    flags,
    countries: [...countries],
    summary: VERDICT_DESC[verdict],
  };
}

const SAMPLES = [
  "google.com",
  "free-movies-hd-now.ru",
  "company-login-update-urgent.com",
  "192.168.1.10",
  "github.com",
];

function ScoreRing({ score, color }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        strokeDasharray={`${dash} ${c}`}
        style={{ transition: "stroke-dasharray 0.7s ease, stroke 0.4s ease" }}
      />
      <text
        x="50"
        y="55"
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="22"
        fontWeight="700"
        fill="var(--text)"
      >
        {score}
      </text>
      <text x="50" y="72" textAnchor="middle" fontSize="9" fill="var(--muted)" letterSpacing="0.18em">
        SCORE
      </text>
    </svg>
  );
}

export default function InstantUrlCheck() {
  const [input, setInput] = useState("");
  const [host, setHost] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!scanning) return;
    const id = setInterval(() => setTick((t) => (t + 1) % 4), 250);
    return () => clearInterval(id);
  }, [scanning]);

  const runScan = async (raw) => {
    setError("");
    setResult(null);
    const parsed = normalizeUrl(raw);
    if (!parsed) {
      setError("Invalid URL — try something like example.com");
      return;
    }
    setHost(parsed.host);
    setScanning(true);
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 800));
    setResult(analyze(parsed.host));
    setScanning(false);
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    runScan(input);
  };

  const handleSample = (sample) => {
    setInput(sample);
    runScan(sample);
  };

  const verdict = result?.verdict;
  const verdictColor = verdict ? VERDICT_COLOR[verdict] : "var(--accent-2)";

  return (
    <div className="scan-card glass instant-check">
      <div className="scan-card__header">
        <div>
          <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Instant URL check
          </div>
          <h3 style={{ marginTop: 4 }}>Assess risk before you click</h3>
        </div>
        <div className="chip chip--accent">No login required</div>
      </div>

      <form className="scan-card__input" onSubmit={handleSubmit}>
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. example.com or https://questionable-site.ru"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={scanning}
        />
        <button type="submit" className="btn btn--primary" disabled={scanning || !input.trim()}>
          {scanning ? "Scanning" + ".".repeat(tick + 1) : "Check"}
        </button>
      </form>

      {!scanning && !result && (
        <div className="instant-check__samples">
          {SAMPLES.map((s) => (
            <button
              key={s}
              type="button"
              className="instant-check__sample"
              onClick={() => handleSample(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="instant-check__error">{error}</div>
      )}

      {scanning && (
        <div className="instant-check__loader" aria-live="polite">
          <div className="instant-check__bar"><span /></div>
          <div className="muted" style={{ fontSize: 12 }}>
            Analyzing {host} — domain, TLD and phishing pattern heuristics…
          </div>
        </div>
      )}

      {result && !scanning && (
        <div className="instant-check__result" style={{ borderColor: `${verdictColor}66` }}>
          <div className="instant-check__top">
            <ScoreRing score={result.score} color={verdictColor} />
            <div className="instant-check__main">
              <div className="instant-check__host">{host}</div>
              <span
                className="instant-check__verdict"
                style={{
                  color: verdictColor,
                  borderColor: `${verdictColor}80`,
                  background: `${verdictColor}1a`,
                }}
              >
                {VERDICT_LABEL[verdict]}
              </span>
              <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
                {result.summary}
              </p>
            </div>
          </div>

          {result.flags.length > 0 && (
            <ul className="instant-check__flags">
              {result.flags.map((f, i) => (
                <li key={i}>
                  <span style={{ color: verdictColor }}>•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="instant-check__meta">
            <div>
              <span className="muted">Data processing</span>
              <strong>{result.countries.join(", ") || "—"}</strong>
            </div>
            <div>
              <span className="muted">Score</span>
              <strong>{result.score}/100</strong>
            </div>
          </div>

          <div className="instant-check__cta">
            <button
              type="button"
              className="btn btn--glass"
              onClick={() => {
                setResult(null);
                setHost("");
                setInput("");
              }}
            >
              Check another
            </button>
            <Link className="btn btn--primary" href="/login">
              Sign in to save history →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

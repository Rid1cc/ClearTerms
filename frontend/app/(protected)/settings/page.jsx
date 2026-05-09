"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Topbar from "../../components/Topbar";
import { apiRequest } from "../../lib/api";
import { clearTokens, getAccessToken } from "../../lib/auth";

const LANGUAGES = [
  { value: "pl", label: "Polski" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
];

const THEMES = [
  { value: "auto", label: "Auto (system)" },
  { value: "dark", label: "Ciemny" },
  { value: "light", label: "Jasny" },
];

const SCAN_LEVELS = [
  { value: "minimal", label: "Minimalny", hint: "Tylko phishing" },
  { value: "balanced", label: "Zbalansowany", hint: "Phishing + podejrzane (zalecane)" },
  { value: "strict", label: "Surowy", hint: "Wszystko poniżej 80 pkt" },
];

const DEFAULT_PREFS = {
  notifications: true,
  email_alerts: true,
  weekly_digest: false,
  language: "pl",
  theme: "auto",
  scan_level: "balanced",
  block_phishing: true,
  share_telemetry: false,
};

function Toast({ kind, children, onClose }) {
  if (!children) return null;
  return (
    <div
      role="status"
      className="settings__toast"
      data-kind={kind || "info"}
      onAnimationEnd={onClose}
    >
      {children}
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange, disabled }) {
  return (
    <label className={`settings__toggle ${disabled ? "is-disabled" : ""}`}>
      <div className="settings__toggle-text">
        <span className="settings__toggle-label">{label}</span>
        {hint ? <span className="settings__toggle-hint">{hint}</span> : null}
      </div>
      <span className="settings__switch" data-on={checked ? "1" : "0"}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="settings__switch-track" aria-hidden />
        <span className="settings__switch-thumb" aria-hidden />
      </span>
    </label>
  );
}

function SectionCard({ title, chip, children, footer, accent, fullWidth, icon }) {
  return (
    <div className={`glass card settings__card ${fullWidth ? "settings__card--full" : ""}`}>
      <div
        aria-hidden
        className="settings__card-glow"
        style={{ background: `radial-gradient(circle at 100% 0%, ${accent || "rgba(103,183,255,0.18)"}, transparent 60%)` }}
      />
      <div className="settings__card-header">
        <div className="settings__card-title">
          {icon ? <span className="settings__card-icon" aria-hidden>{icon}</span> : null}
          <h3>{title}</h3>
        </div>
        {chip ? <span className="chip chip--glass">{chip}</span> : null}
      </div>
      <div className="settings__card-body">{children}</div>
      {footer ? <div className="settings__card-footer">{footer}</div> : null}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [toast, setToast] = useState(null);

  const flash = (kind, message) => setToast({ kind, message, key: Date.now() });

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    apiRequest("/api/auth/me", { token })
      .then((data) => {
        setMe(data);
        setDisplayName(data?.profile?.display_name || "");
        setPrefs({ ...DEFAULT_PREFS, ...(data?.profile?.preferences || {}) });
      })
      .catch((err) => flash("error", err.message || "Nie udało się pobrać profilu."))
      .finally(() => setLoading(false));
  }, [router]);

  const saveProfile = async (e) => {
    e?.preventDefault?.();
    const token = getAccessToken();
    if (!token) return;
    setSavingProfile(true);
    try {
      const updated = await apiRequest("/api/auth/me", {
        method: "PATCH",
        token,
        body: { display_name: displayName.trim() || me?.user?.email?.split("@")[0] || "User" },
      });
      setMe((prev) => ({ ...(prev || {}), profile: updated }));
      flash("success", "Profil zapisany.");
    } catch (err) {
      flash("error", err.message || "Nie udało się zapisać profilu.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePrefs = async (next) => {
    const token = getAccessToken();
    if (!token) return;
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    setSavingPrefs(true);
    try {
      const updated = await apiRequest("/api/auth/me", {
        method: "PATCH",
        token,
        body: { preferences: merged },
      });
      setMe((prev) => ({ ...(prev || {}), profile: updated }));
    } catch (err) {
      flash("error", err.message || "Nie udało się zapisać preferencji.");
    } finally {
      setSavingPrefs(false);
    }
  };

  const sendPasswordReset = async () => {
    const email = me?.user?.email;
    if (!email) return;
    setResetSending(true);
    try {
      await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: { email },
      });
      flash("success", `Wysłano link resetu na ${email}.`);
    } catch (err) {
      flash("error", err.message || "Nie udało się wysłać linku.");
    } finally {
      setResetSending(false);
    }
  };

  const signOut = async () => {
    const token = getAccessToken();
    setSigningOut(true);
    try {
      if (token) await apiRequest("/api/auth/logout", { method: "POST", token });
    } catch {
      // ignore — clear tokens anyway
    } finally {
      clearTokens();
      router.replace("/login");
    }
  };

  const initial =
    (me?.profile?.display_name || me?.user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="page">
      <section className="section" style={{ paddingTop: 64 }}>
        <div className="container">
          <Topbar ctaLabel="Zaloguj" ctaHref="/login" />

          <div className="dashboard__hero glass reveal">
            <div
              className="dashboard__hero-glow"
              aria-hidden
              style={{ background: "radial-gradient(circle at 80% 20%, rgba(103,183,255,0.25), transparent 60%)" }}
            />
            <div className="dashboard__hero-content">
              <div className="eyebrow">Ustawienia</div>
              <h2 style={{ margin: "0 0 6px" }}>Konto i preferencje</h2>
              <p className="muted" style={{ margin: 0 }}>
                Zarządzaj profilem, powiadomieniami, polityką skanowania i bezpieczeństwem.
              </p>
            </div>
            <div className="dashboard__hero-aside">
              <div className="settings__avatar" aria-hidden>
                {initial}
              </div>
            </div>
          </div>

          <Toast kind={toast?.kind} key={toast?.key} onClose={() => setToast(null)}>
            {toast?.message}
          </Toast>

          <div className="settings__grid">
            {/* Profile — full-width row above the masonry */}
            <SectionCard
              title="Profil"
              chip="Konto"
              accent="rgba(110,247,199,0.18)"
              fullWidth
              icon="◐"
              footer={
                <div className="settings__actions">
                  <button
                    type="submit"
                    form="settings-profile"
                    className="btn btn--primary"
                    disabled={savingProfile || loading}
                  >
                    {savingProfile ? "Zapisuję…" : "Zapisz profil"}
                  </button>
                </div>
              }
            >
              <form id="settings-profile" onSubmit={saveProfile} className="form" style={{ marginTop: 4 }}>
                <div className="form-field">
                  <label htmlFor="email">E-mail</label>
                  <input
                    id="email"
                    className="input"
                    value={me?.user?.email || ""}
                    disabled
                    readOnly
                  />
                  <span className="settings__hint">E-mail jest powiązany z kontem auth — zmiana wymaga supportu.</span>
                </div>
                <div className="form-field">
                  <label htmlFor="display_name">Nazwa wyświetlana</label>
                  <input
                    id="display_name"
                    className="input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="np. Karol R."
                    maxLength={100}
                    disabled={loading}
                  />
                </div>
                <div className="form-field">
                  <label>ID użytkownika</label>
                  <input className="input" value={me?.user?.id || ""} disabled readOnly />
                </div>
              </form>
            </SectionCard>

          </div>

          <div className="settings__masonry">
            {/* Preferences: notifications */}
            <SectionCard title="Powiadomienia" chip="Alerty" accent="rgba(103,183,255,0.18)" icon="◉">
              <ToggleRow
                label="Powiadomienia w aplikacji"
                hint="Pokazuj alerty bezpieczeństwa w panelu i w wtyczce."
                checked={!!prefs.notifications}
                onChange={(v) => savePrefs({ notifications: v })}
                disabled={loading || savingPrefs}
              />
              <ToggleRow
                label="Alerty mailowe"
                hint="Wysyłaj e-mail przy wykryciu phishingu lub krytycznego wycieku."
                checked={!!prefs.email_alerts}
                onChange={(v) => savePrefs({ email_alerts: v })}
                disabled={loading || savingPrefs}
              />
              <ToggleRow
                label="Tygodniowe podsumowanie"
                hint="Co poniedziałek zbiorczy raport ze skanów."
                checked={!!prefs.weekly_digest}
                onChange={(v) => savePrefs({ weekly_digest: v })}
                disabled={loading || savingPrefs}
              />
            </SectionCard>

            {/* Preferences: scanning */}
            <SectionCard title="Polityka skanowania" chip="Wtyczka" accent="rgba(255,209,102,0.18)" icon="⚐">
              <div className="form-field" style={{ marginBottom: 14 }}>
                <label>Poziom czujności</label>
                <div className="settings__segments" role="radiogroup">
                  {SCAN_LEVELS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      role="radio"
                      aria-checked={prefs.scan_level === s.value}
                      className={`settings__segment ${prefs.scan_level === s.value ? "is-active" : ""}`}
                      onClick={() => savePrefs({ scan_level: s.value })}
                      disabled={loading || savingPrefs}
                    >
                      <strong>{s.label}</strong>
                      <span>{s.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              <ToggleRow
                label="Automatyczne blokowanie phishingu"
                hint="Wtyczka przerwie ładowanie strony, jeśli werdykt to phishing."
                checked={!!prefs.block_phishing}
                onChange={(v) => savePrefs({ block_phishing: v })}
                disabled={loading || savingPrefs}
              />
              <ToggleRow
                label="Anonimowa telemetria"
                hint="Pomóż ulepszać heurystykę — wysyłaj zanonimizowane statystyki."
                checked={!!prefs.share_telemetry}
                onChange={(v) => savePrefs({ share_telemetry: v })}
                disabled={loading || savingPrefs}
              />
            </SectionCard>

            {/* Preferences: appearance */}
            <SectionCard title="Wygląd i język" chip="UI" accent="rgba(255,123,123,0.16)" icon="◈">
              <div className="form-field">
                <label htmlFor="lang">Język interfejsu</label>
                <select
                  id="lang"
                  className="input"
                  value={prefs.language}
                  onChange={(e) => savePrefs({ language: e.target.value })}
                  disabled={loading || savingPrefs}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field" style={{ marginTop: 12 }}>
                <label>Motyw</label>
                <div className="settings__segments" role="radiogroup">
                  {THEMES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      role="radio"
                      aria-checked={prefs.theme === t.value}
                      className={`settings__segment ${prefs.theme === t.value ? "is-active" : ""}`}
                      onClick={() => savePrefs({ theme: t.value })}
                      disabled={loading || savingPrefs}
                    >
                      <strong>{t.label}</strong>
                    </button>
                  ))}
                </div>
                <span className="settings__hint">
                  Motyw zapisuje się do preferencji konta — zastosowanie wkrótce.
                </span>
              </div>
            </SectionCard>

            {/* Security */}
            <SectionCard title="Bezpieczeństwo" chip="Sesja" accent="rgba(255,123,123,0.18)" icon="◇">
              <div className="settings__row">
                <div>
                  <div className="settings__row-title">Zmień hasło</div>
                  <div className="settings__row-hint">
                    Wyślemy link resetujący na {me?.user?.email || "Twój e-mail"}.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--glass"
                  onClick={sendPasswordReset}
                  disabled={resetSending || loading || !me?.user?.email}
                >
                  {resetSending ? "Wysyłam…" : "Wyślij link"}
                </button>
              </div>
              <div className="settings__row">
                <div>
                  <div className="settings__row-title">Wyloguj wszędzie</div>
                  <div className="settings__row-hint">
                    Unieważnia tę sesję na backendzie i czyści tokeny lokalnie.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={signOut}
                  disabled={signingOut}
                >
                  {signingOut ? "Wylogowuję…" : "Wyloguj"}
                </button>
              </div>
            </SectionCard>

            {/* About */}
            <SectionCard title="O aplikacji" chip="Info" accent="rgba(110,247,199,0.16)" icon="◆">
              <ul className="settings__meta">
                <li>
                  <span>Wersja</span>
                  <strong>0.1.0</strong>
                </li>
                <li>
                  <span>Profil utworzony</span>
                  <strong>
                    {me?.profile?.created_at
                      ? new Date(me.profile.created_at).toLocaleDateString()
                      : "—"}
                  </strong>
                </li>
                <li>
                  <span>Ostatnia aktualizacja</span>
                  <strong>
                    {me?.profile?.updated_at
                      ? new Date(me.profile.updated_at).toLocaleString()
                      : "—"}
                  </strong>
                </li>
                <li>
                  <span>Status preferencji</span>
                  <strong style={{ color: savingPrefs ? "var(--warning)" : "var(--accent)" }}>
                    {savingPrefs ? "Zapisuję…" : "Zsynchronizowane"}
                  </strong>
                </li>
              </ul>
            </SectionCard>
          </div>
        </div>
      </section>
    </div>
  );
}

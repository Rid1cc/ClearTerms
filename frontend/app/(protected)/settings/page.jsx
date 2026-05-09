"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Topbar from "../../components/Topbar";
import { apiRequest } from "../../lib/api";
import { clearTokens, getAccessToken } from "../../lib/auth";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "pl", label: "Polski" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
];

const THEMES = [
  { value: "auto", label: "Auto (system)" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

const SCAN_LEVELS = [
  { value: "minimal", label: "Minimal", hint: "Phishing only" },
  { value: "balanced", label: "Balanced", hint: "Phishing + suspicious (recommended)" },
  { value: "strict", label: "Strict", hint: "Anything below 80 points" },
];

const DEFAULT_PREFS = {
  notifications: true,
  email_alerts: true,
  weekly_digest: false,
  language: "en",
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
      .catch((err) => flash("error", err.message || "Failed to load profile."))
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
      flash("success", "Profile saved.");
    } catch (err) {
      flash("error", err.message || "Failed to save profile.");
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
      flash("error", err.message || "Failed to save preferences.");
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
      flash("success", `Reset link sent to ${email}.`);
    } catch (err) {
      flash("error", err.message || "Failed to send reset link.");
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
          <Topbar ctaLabel="Sign in" ctaHref="/login" />

          <div className="dashboard__hero glass reveal">
            <div
              className="dashboard__hero-glow"
              aria-hidden
              style={{ background: "radial-gradient(circle at 80% 20%, rgba(103,183,255,0.25), transparent 60%)" }}
            />
            <div className="dashboard__hero-content">
              <div className="eyebrow">Settings</div>
              <h2 style={{ margin: "0 0 6px" }}>Account & preferences</h2>
              <p className="muted" style={{ margin: 0 }}>
                Manage your profile, notifications, scanning policy, and security.
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
              title="Profile"
              chip="Account"
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
                    {savingProfile ? "Saving…" : "Save profile"}
                  </button>
                </div>
              }
            >
              <form id="settings-profile" onSubmit={saveProfile} className="form" style={{ marginTop: 4 }}>
                <div className="form-field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    className="input"
                    value={me?.user?.email || ""}
                    disabled
                    readOnly
                  />
                  <span className="settings__hint">Tied to your auth account — contact support to change.</span>
                </div>
                <div className="form-field">
                  <label htmlFor="display_name">Display name</label>
                  <input
                    id="display_name"
                    className="input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Karol R."
                    maxLength={100}
                    disabled={loading}
                  />
                </div>
                <div className="form-field">
                  <label>User ID</label>
                  <input className="input" value={me?.user?.id || ""} disabled readOnly />
                </div>
              </form>
            </SectionCard>
          </div>

          <div className="settings__masonry">
            {/* Preferences: notifications */}
            <SectionCard title="Notifications" chip="Alerts" accent="rgba(103,183,255,0.18)" icon="◉">
              <ToggleRow
                label="In-app notifications"
                hint="Show security alerts in the dashboard and the extension."
                checked={!!prefs.notifications}
                onChange={(v) => savePrefs({ notifications: v })}
                disabled={loading || savingPrefs}
              />
              <ToggleRow
                label="Email alerts"
                hint="Send email when phishing or a critical leak is detected."
                checked={!!prefs.email_alerts}
                onChange={(v) => savePrefs({ email_alerts: v })}
                disabled={loading || savingPrefs}
              />
              <ToggleRow
                label="Weekly digest"
                hint="Every Monday — a summary of your scans."
                checked={!!prefs.weekly_digest}
                onChange={(v) => savePrefs({ weekly_digest: v })}
                disabled={loading || savingPrefs}
              />
            </SectionCard>

            {/* Preferences: scanning */}
            <SectionCard title="Scanning policy" chip="Extension" accent="rgba(255,209,102,0.18)" icon="⚐">
              <div className="form-field" style={{ marginBottom: 14 }}>
                <label>Vigilance level</label>
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
                label="Auto-block phishing"
                hint="Extension stops loading the page if the verdict is phishing."
                checked={!!prefs.block_phishing}
                onChange={(v) => savePrefs({ block_phishing: v })}
                disabled={loading || savingPrefs}
              />
              <ToggleRow
                label="Anonymous telemetry"
                hint="Help improve heuristics — share anonymised statistics."
                checked={!!prefs.share_telemetry}
                onChange={(v) => savePrefs({ share_telemetry: v })}
                disabled={loading || savingPrefs}
              />
            </SectionCard>

            {/* Preferences: appearance */}
            <SectionCard title="Appearance & language" chip="UI" accent="rgba(255,123,123,0.16)" icon="◈">
              <div className="form-field">
                <label htmlFor="lang">Interface language</label>
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
                <label>Theme</label>
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
                  Theme is saved to your account preferences — applied UI coming soon.
                </span>
              </div>
            </SectionCard>

            {/* Security */}
            <SectionCard title="Security" chip="Session" accent="rgba(255,123,123,0.18)" icon="◇">
              <div className="settings__row">
                <div>
                  <div className="settings__row-title">Change password</div>
                  <div className="settings__row-hint">
                    We&apos;ll send a reset link to {me?.user?.email || "your email"}.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--glass"
                  onClick={sendPasswordReset}
                  disabled={resetSending || loading || !me?.user?.email}
                >
                  {resetSending ? "Sending…" : "Send link"}
                </button>
              </div>
              <div className="settings__row">
                <div>
                  <div className="settings__row-title">Sign out everywhere</div>
                  <div className="settings__row-hint">
                    Invalidates this session on the backend and clears local tokens.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={signOut}
                  disabled={signingOut}
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </SectionCard>

            {/* About */}
            <SectionCard title="About" chip="Info" accent="rgba(110,247,199,0.16)" icon="◆">
              <ul className="settings__meta">
                <li>
                  <span>Version</span>
                  <strong>0.1.0</strong>
                </li>
                <li>
                  <span>Profile created</span>
                  <strong>
                    {me?.profile?.created_at
                      ? new Date(me.profile.created_at).toLocaleDateString()
                      : "—"}
                  </strong>
                </li>
                <li>
                  <span>Last update</span>
                  <strong>
                    {me?.profile?.updated_at
                      ? new Date(me.profile.updated_at).toLocaleString()
                      : "—"}
                  </strong>
                </li>
                <li>
                  <span>Preferences status</span>
                  <strong style={{ color: savingPrefs ? "var(--warning)" : "var(--accent)" }}>
                    {savingPrefs ? "Saving…" : "Synced"}
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

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { clearTokens, getAccessToken } from "../lib/auth";

export default function Topbar({ ctaLabel = "Sign in", ctaHref = "/login" }) {
  const [hasSession, setHasSession] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setHasSession(Boolean(getAccessToken()));
  }, []);

  const handleSignOut = async () => {
    const token = getAccessToken();
    setSigningOut(true);

    try {
      if (token) {
        await apiRequest("/api/auth/logout", { method: "POST", token });
      }
    } catch (err) {
      // Ignore logout errors and clear local tokens regardless.
    } finally {
      clearTokens();
      setHasSession(false);
      setSigningOut(false);
    }
  };

  return (
    <nav className="topbar glass reveal">
      <div className="brand">
        <span className="brand__icon"><Link className="" href="/">CT</Link></span>
        <span className="brand__name"><Link className="" href="/">ClearTerms</Link></span>
      </div>
      <div className="topbar__links">
        <Link className="ghost" href="/dashboard">Dashboard</Link>
        <Link className="ghost" href="/groups">Groups</Link>
        <Link className="ghost" href="/alerts">Alerts</Link>
        <Link className="ghost" href="/leaks">Leaks</Link>
        <Link className="ghost" href="/settings">Settings</Link>
      </div>
      {hasSession ? (
        <button className="btn btn--ghost" onClick={handleSignOut} disabled={signingOut}>
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      ) : (
        <Link className="btn btn--primary" href={ctaHref}>{ctaLabel}</Link>
      )}
    </nav>
  );
}

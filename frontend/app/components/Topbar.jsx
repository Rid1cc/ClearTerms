"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";
import { clearTokens, getAccessToken } from "../lib/auth";

export default function Topbar({ ctaLabel = "Sign in", ctaHref = "/login" }) {
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const syncSession = () => setHasSession(Boolean(getAccessToken()));
    syncSession();
    const onStorage = (e) => {
      if (e.key === "access_token" || e.key === "refresh_token") syncSession();
    };
    window.addEventListener("clearterms:logout", syncSession);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("clearterms:logout", syncSession);
      window.removeEventListener("storage", onStorage);
    };
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
      router.replace("/login");
    }
  };
/*<path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/> */
  return (
    <nav className="topbar reveal">

      <Link href="/" className="brand">
        <span className="brand__icon">
          <img src="/logo.png" alt="CT Logo" width={24} height={24}/>
        </span>
        <span className="brand__name"><strong>Clear</strong>Terms</span>
      </Link>
      <div className="topbar__links">
        <Link className="nav-link" href="/dashboard">Dashboard</Link>
        <Link className="nav-link" href="/groups">Groups</Link>
        <Link className="nav-link" href="/alerts">Alerts</Link>
        <Link className="nav-link" href="/leaks">Leaks</Link>
        <Link className="nav-link" href="/settings">Settings</Link>
      </div>
      {hasSession ? (
        <button className="btn btn--ghost" style={{ borderRadius: "999px" }} onClick={handleSignOut} disabled={signingOut}>
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      ) : (
        <Link className="btn btn--primary" style={{ borderRadius: "999px" }} href={ctaHref}>{ctaLabel}</Link>
      )}
    </nav>
  );
}

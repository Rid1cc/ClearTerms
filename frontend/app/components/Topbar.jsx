import Link from "next/link";

export default function Topbar({ ctaLabel = "Sign in", ctaHref = "/login" }) {
  return (
    <nav className="topbar glass reveal">
      <div className="brand">
        <span className="brand__icon">CT</span>
        <span className="brand__name">ClearTerms</span>
      </div>
      <div className="topbar__links">
        <Link className="ghost" href="/dashboard">Dashboard</Link>
        <Link className="ghost" href="/groups">Groups</Link>
        <Link className="ghost" href="/alerts">Alerts</Link>
        <Link className="ghost" href="/leaks">Leaks</Link>
        <Link className="ghost" href="/settings">Settings</Link>
      </div>
      <Link className="btn btn--primary" href={ctaHref}>{ctaLabel}</Link>
    </nav>
  );
}

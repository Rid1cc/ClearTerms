"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Topbar from "../../../components/Topbar";
import { apiRequest } from "../../../lib/api";
import { getAccessToken } from "../../../lib/auth";

export default function GroupDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [inviteCodeGenerating, setInviteCodeGenerating] = useState(false);

  useEffect(() => {
    loadGroup();
  }, [id]);

  const loadGroup = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }

      setLoading(true);
      const groupData = await apiRequest(`/api/groups/${id}`, { token });
      setGroup(groupData);

      const memData = await apiRequest(`/api/groups/${id}/members`, { token });
      setMembers(memData.members || []);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load group details.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    try {
      setInviteCodeGenerating(true);
      const token = getAccessToken();
      const res = await apiRequest(`/api/groups/${id}/invite-code`, {
        method: "POST",
        token
      });
      // reload group to get new invite code
      setGroup(prev => ({ ...prev, invite_code: res.invite_code }));
    } catch (err) {
      alert(err.message || "Failed to generate invite code");
    } finally {
      setInviteCodeGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ justifyContent: "center", alignItems: "center" }}>
        <p>Loading group...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page" style={{ justifyContent: "center", alignItems: "center" }}>
        <p style={{ color: "var(--danger)" }}>{error}</p>
        <Link href="/groups" className="btn btn--glass" style={{ marginTop: "16px" }}>Back to groups</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <Topbar />
          
          <div style={{ marginBottom: "32px", display: "flex", gap: "16px", alignItems: "center" }}>
            <Link href="/groups" className="btn btn--ghost" style={{ padding: "8px", borderRadius: "8px" }}>
              &larr; Back
            </Link>
            <h2 style={{ margin: 0 }}>{group?.name}</h2>
            <span className="chip chip--accent">{group?.role}</span>
          </div>

          <div className="section-grid">
            <div className="glass card">
              <div className="card__header">
                <h3>Members</h3>
              </div>
              <div className="card__body">
                <ul className="card__list" style={{ listStyle: "none", padding: 0, display: "grid", gap: "12px" }}>
                  {members.map(m => (
                    <li key={m.user_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div>
                        <strong>{m.profile?.display_name || m.user_id}</strong>
                      </div>
                      <span className="chip" style={{ fontSize: "12px" }}>{m.role}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="glass card">
              <div className="card__header">
                <h3>Invite Code</h3>
              </div>
              <div className="card__body">
                <p style={{ marginBottom: "16px" }}>Share this code with others so they can join your group.</p>
                {group?.invite_code ? (
                  <div style={{ padding: "16px", background: "rgba(0,0,0,0.3)", borderRadius: "8px", fontFamily: "monospace", fontSize: "1.2rem", textAlign: "center", letterSpacing: "2px", border: "1px dashed rgba(255,255,255,0.1)", marginBottom: "16px" }}>
                    {group.invite_code}
                  </div>
                ) : (
                  <p style={{ color: "var(--muted)", marginBottom: "16px" }}>No invite code generated yet.</p>
                )}

                {group?.role === "admin" && (
                  <button 
                    className="btn btn--glass" 
                    onClick={handleGenerateCode} 
                    disabled={inviteCodeGenerating}
                    style={{ width: "100%" }}
                  >
                    {inviteCodeGenerating ? "Generating..." : (group?.invite_code ? "Rotate Code" : "Generate Code")}
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

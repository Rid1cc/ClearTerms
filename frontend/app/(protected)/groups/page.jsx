"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "../../components/Topbar";
import { apiRequest } from "../../lib/api";
import { getAccessToken } from "../../lib/auth";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Forms state
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    const token = getAccessToken();
    if (!token) {
      setError("Sign in to view groups.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await apiRequest("/api/groups", { token });
      setGroups(data?.groups || []);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load groups.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;

    setCreating(true);
    try {
      const token = getAccessToken();
      await apiRequest("/api/groups", {
        method: "POST",
        token,
        body: { name: createName, description: createDesc }
      });
      setCreateName("");
      setCreateDesc("");
      await loadGroups();
    } catch (err) {
      alert(err.message || "Failed to create group.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoining(true);
    try {
      const token = getAccessToken();
      await apiRequest("/api/groups/join", {
        method: "POST",
        token,
        body: { invite_code: joinCode.trim() }
      });
      setJoinCode("");
      await loadGroups();
    } catch (err) {
      alert(err.message || "Failed to join group. Code might be invalid.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <Topbar />
          <div className="section__header reveal">
            <div className="eyebrow">Groups</div>
            <h2>Teams and family spaces</h2>
            <p>Manage members, roles, and shared security rules.</p>
          </div>
          <div className="section-grid">
            
            {/* My Groups */}
            <div className="glass card" style={{ alignSelf: "start", alignContent: "start" }}>
              <div className="card__header">
                <h3>My Groups</h3>
                <span className="chip">Overview</span>
              </div>
              <div className="card__body">
                {loading ? (
                  <p>Loading...</p>
                ) : error ? (
                  <p style={{ color: "var(--danger)" }}>{error}</p>
                ) : groups.length ? (
                  <ul className="card__list" style={{ listStyle: "none", padding: 0 }}>
                    {groups.map(group => (
                      <li key={group.id} style={{ marginBottom: "8px" }}>
                        <Link 
                          href={`/groups/${group.id}`} 
                          style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center", 
                            padding: "16px", 
                            background: "rgba(255,255,255,0.02)", 
                            borderRadius: "12px", 
                            textDecoration: "none", 
                            color: "var(--text)",
                            border: "1px solid rgba(255, 255, 255, 0.05)",
                            transition: "background 0.2s"
                          }}
                          className="hover:bg-white/5"
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "15px" }}>{group.name}</div>
                            {group.description && <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>{group.description}</div>}
                          </div>
                          <span className="chip chip--glass" style={{ fontSize: "12px" }}>{group.role}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>You don't belong to any groups yet.</p>
                )}
              </div>
            </div>

            {/* Left side column wrapper for Join/Create */}
            <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
              
              {/* Join Group */}
              <div className="glass card">
                <div className="card__header">
                  <h3>Join Group</h3>
                  <span className="chip">By Code</span>
                </div>
                <div className="card__body">
                  <form onSubmit={handleJoinGroup} style={{ display: "grid", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "var(--muted)" }}>Invite Code</label>
                      <input 
                        type="text" 
                        placeholder="e.g. abc123def456" 
                        value={joinCode} 
                        onChange={e => setJoinCode(e.target.value)}
                        style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "var(--text)" }} 
                        required 
                      />
                    </div>
                    <button type="submit" className="btn btn--primary" style={{ width: "100%", borderRadius: "8px" }} disabled={joining || !joinCode}>
                      {joining ? "Joining..." : "Join"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Create Group */}
              <div className="glass card">
                <div className="card__header">
                  <h3>Create Group</h3>
                  <span className="chip">Admin</span>
                </div>
                <div className="card__body">
                  <form onSubmit={handleCreateGroup} style={{ display: "grid", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "var(--muted)" }}>Group Name</label>
                      <input 
                        type="text" 
                        placeholder="My Family" 
                        value={createName} 
                        onChange={e => setCreateName(e.target.value)}
                        style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "var(--text)" }} 
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: "var(--muted)" }}>Description (optional)</label>
                      <input 
                        type="text" 
                        placeholder="For shared devices..." 
                        value={createDesc} 
                        onChange={e => setCreateDesc(e.target.value)}
                        style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "var(--text)" }} 
                      />
                    </div>
                    <button type="submit" className="btn btn--glass" style={{ width: "100%", borderRadius: "8px" }} disabled={creating || !createName}>
                      {creating ? "Creating..." : "Create Group"}
                    </button>
                  </form>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>
    </div>
  );
}

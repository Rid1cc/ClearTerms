"use client";
import { useState } from "react";
import Topbar from "../components/Topbar";
import { apiRequest } from "../lib/api";
import { setTokens } from "../lib/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState("login"); // "login", "register", "reset"

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState({ type: "idle", message: "" });

  const handleLogin = async (e) => {
    e.preventDefault();
    setStatus({ type: "loading", message: "Signing in..." });
    try {
      const payload = await apiRequest("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setTokens({ accessToken: payload.access_token, refreshToken: payload.refresh_token });
      setStatus({ type: "success", message: "Signed in successfully. Redirecting..." });
      router.push("/dashboard");
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Unable to sign in." });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setStatus({ type: "loading", message: "Creating account..." });
    try {
      const payload = await apiRequest("/api/auth/register", {
        method: "POST",
        body: { email, password, display_name: displayName || undefined },
      });
      if (payload?.session?.access_token) {
        setTokens({ accessToken: payload.session.access_token, refreshToken: payload.session.refresh_token });
        setStatus({ type: "success", message: "Account created. Redirecting..." });
        router.push("/dashboard");
      } else {
        setStatus({ type: "success", message: payload?.email_confirmation_required ? "Check your inbox to confirm the email." : "Account created." });
      }
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Unable to register." });
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setStatus({ type: "loading", message: "Sending reset link..." });
    try {
      await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: { email },
      });
      setStatus({ type: "success", message: "Password reset email sent." });
      setTimeout(() => setView("login"), 2000);
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Unable to reset password." });
    }
  };

  return (
    <div className="page min-h-screen flex flex-col">
      <div className="container py-8 relative z-10">
        <Topbar ctaLabel="Dashboard" ctaHref="/dashboard" />
      </div>

      <section className="section flex-1 flex flex-col items-center justify-center -mt-20">
        <div className="container max-w-[500px] w-full px-4">
          
          {view === "login" && (
            <div className="w-full flex flex-col items-center">
              <div className="section__header reveal text-center mb-10">
                <div className="eyebrow text-accent">Authentication</div>
                <h2 className="text-4xl font-bold tracking-tight mb-3">Welcome Back</h2>
                <p className="text-muted text-lg">Enter your details to access your workspace.</p>
              </div>
              
              <div className="form-card glass w-full p-8 sm:p-10 shadow-2xl">
                <form className="form flex flex-col gap-5" onSubmit={handleLogin}>
                  <div className="form-field">
                    <label className="text-sm font-medium mb-1 block text-gray-300">Email Address</label>
                    <input required className="input w-full transition-all focus:ring-2 focus:ring-accent/50 outline-none" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label className="text-sm font-medium mb-1 block text-gray-300">Password</label>
                    <input required className="input w-full transition-all focus:ring-2 focus:ring-accent/50 outline-none" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                  
                  <button className="btn btn--primary w-full mt-2 py-3 text-[15px] font-bold shadow-lg shadow-accent/20 hover:scale-[1.02] transition-transform" type="submit">
                    Sign in to Account
                  </button>
                  
                  {status.message && (
                    <div className={`status-pill status-pill--${status.type} w-full text-center mt-2 animate-in fade-in slide-in-from-top-2`}>
                      {status.message}
                    </div>
                  )}

                  <hr className="border-glass-border/30 my-4" />
                  
                  <div className="flex items-center justify-between text-sm">
                    <button className="text-muted hover:text-white transition-colors" type="button" onClick={() => { setView("reset"); setStatus({ type: "idle", message: "" }); }}>
                      Forgot password?
                    </button>
                    <button className="text-accent hover:text-accent-2 font-medium transition-colors" type="button" onClick={() => { setView("register"); setStatus({ type: "idle", message: "" }); }}>
                      Create new account
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {view === "register" && (
            <div className="w-full flex flex-col items-center">
              <div className="section__header reveal text-center mb-10">
                <div className="eyebrow text-accent">Get Started</div>
                <h2 className="text-4xl font-bold tracking-tight mb-3">Join ClearTerms</h2>
                <p className="text-muted text-lg">Create an account to manage privacy securely.</p>
              </div>
              
              <div className="form-card glass w-full p-8 sm:p-10 shadow-2xl">
                <form className="form flex flex-col gap-5" onSubmit={handleRegister}>
                  <div className="grid grid-cols-1 gap-5">
                    <div className="form-field">
                      <label className="text-sm font-medium mb-1 block text-gray-300">Display Name <span className="text-muted font-normal">(Optional)</span></label>
                      <input className="input w-full transition-all focus:ring-2 focus:ring-accent/50 outline-none" type="text" placeholder="John Doe" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label className="text-sm font-medium mb-1 block text-gray-300">Email Address</label>
                      <input required className="input w-full transition-all focus:ring-2 focus:ring-accent/50 outline-none" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label className="text-sm font-medium mb-1 block text-gray-300">Password</label>
                      <input required className="input w-full transition-all focus:ring-2 focus:ring-accent/50 outline-none" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                  </div>

                  <button className="btn btn--primary w-full mt-2 py-3 text-[15px] font-bold shadow-lg shadow-accent/20 hover:scale-[1.02] transition-transform" type="submit">
                    Create Account
                  </button>
                  
                  {status.message && (
                    <div className={`status-pill status-pill--${status.type} w-full text-center mt-2 animate-in fade-in slide-in-from-top-2`}>
                      {status.message}
                    </div>
                  )}

                  <hr className="border-glass-border/30 my-4" />
                  
                  <div className="text-center text-sm">
                    <span className="text-muted mr-2">Already have an account?</span>
                    <button className="text-accent hover:text-accent-2 font-medium transition-colors" type="button" onClick={() => { setView("login"); setStatus({ type: "idle", message: "" }); }}>
                      Sign in instead
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {view === "reset" && (
            <div className="w-full flex flex-col items-center">
              <div className="section__header reveal text-center mb-10">
                <div className="eyebrow text-accent">Recovery</div>
                <h2 className="text-4xl font-bold tracking-tight mb-3">Reset Password</h2>
                <p className="text-muted text-lg">We'll send a magic link to your email.</p>
              </div>
              
              <div className="form-card glass w-full p-8 sm:p-10 shadow-2xl">
                <form className="form flex flex-col gap-5" onSubmit={handleReset}>
                  <div className="form-field">
                    <label className="text-sm font-medium mb-1 block text-gray-300">Email Address</label>
                    <input required className="input w-full transition-all focus:ring-2 focus:ring-accent/50 outline-none" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  
                  <button className="btn btn--primary w-full mt-2 py-3 text-[15px] font-bold shadow-lg shadow-accent/20 hover:scale-[1.02] transition-transform" type="submit">
                    Send Reset Link
                  </button>
                  
                  {status.message && (
                    <div className={`status-pill status-pill--${status.type} w-full text-center mt-2 animate-in fade-in slide-in-from-top-2`}>
                      {status.message}
                    </div>
                  )}

                  <hr className="border-glass-border/30 my-4" />
                  
                  <div className="text-center text-sm">
                    <button className="text-muted hover:text-white transition-colors flex items-center justify-center w-full gap-2" type="button" onClick={() => { setView("login"); setStatus({ type: "idle", message: "" }); }}>
                      <span aria-hidden="true">&larr;</span> Back to sign in
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </section>
    </div>
  );
}

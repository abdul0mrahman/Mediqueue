export const dynamic = 'force-dynamic';
"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";


// ─── Inner component (uses useSearchParams) ───────────────────────────────────
function PatientLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mounted, setMounted] = useState(false);

  const isEmergency = searchParams?.get("emergency") === "true";
  const [login, setLogin] = useState({ username: "", password: "" });
  const [reg, setReg] = useState({
    username: "", password: "", confirmPassword: "",
    name: "", age: "", gender: "", phone: "", bloodType: "", emergencyContact: ""
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const getSystemTheme = () =>
      window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

    const applyTheme = (themeValue: string) => {
      document.documentElement.setAttribute("data-theme", themeValue);
      setTheme(themeValue as "light" | "dark");
    };

    try {
      const s = localStorage.getItem("mq-settings");
      if (s) {
        const p = JSON.parse(s);
        if (p.theme === "light" || p.theme === "dark") {
          applyTheme(p.theme);
        } else {
          applyTheme(getSystemTheme());
        }
      } else {
        const t = localStorage.getItem("mq-theme");
        if (t === "light" || t === "dark") {
          applyTheme(t);
        } else {
          applyTheme(getSystemTheme());
        }
      }
    } catch {
      applyTheme(getSystemTheme());
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handleThemeChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? "light" : "dark";
      const hasUserPreference = localStorage.getItem("mq-theme") ||
        (() => {
          try {
            const settings = localStorage.getItem("mq-settings");
            return settings && JSON.parse(settings).theme;
          } catch { return false; }
        })();
      if (!hasUserPreference) applyTheme(newTheme);
    };

    mediaQuery.addEventListener("change", handleThemeChange);
    return () => mediaQuery.removeEventListener("change", handleThemeChange);
  }, [mounted]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/patient/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(login),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); setLoading(false); return; }
      localStorage.setItem("mq-patient", JSON.stringify(data.patient));
      router.push("/patient");
    } catch { setError("Connection error. Try again."); }
    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (reg.password !== reg.confirmPassword) { setError("Passwords don't match."); return; }
    if (reg.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/patient/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reg),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); setLoading(false); return; }
      setSuccess("Account created! Please log in.");
      setTab("login");
      setLogin({ username: reg.username, password: "" });
    } catch { setError("Connection error. Try again."); }
    setLoading(false);
  }

  if (!mounted) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#000"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'Great Vibes', cursive", fontSize: "36px",
            background: "linear-gradient(135deg, #D4AF37, #F3D572)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent"
          }}>MediQueue</div>
          <div style={{ marginTop: "20px", color: "#888" }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Montserrat:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700&family=Great+Vibes&family=Inter:wght@300;400;500;600;700;800&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

        :root {
          --pure-black: #000000;
          --rich-black: #0a0a0a;
          --onyx: #111111;
          --gold-primary: #D4AF37;
          --gold-light: #F3D572;
          --gold-dark: #B38F2F;
          --gold-glow: rgba(212, 175, 55, 0.3);
          --white: #FFFFFF;
          --off-white: #FAF9F6;
          --gray-light: #E5E5E5;
          --gray-mid: #888888;
          --bg-primary: #FFFFFF;
          --bg-secondary: #F5F5F5;
          --text-primary: #000000;
          --text-secondary: #333333;
          --card-bg: rgba(255, 255, 255, 0.95);
          --border-color: rgba(0, 0, 0, 0.1);
          --input-bg: rgba(0, 0, 0, 0.02);
          --dropdown-bg: #FFFFFF;
          --dropdown-text: #000000;
          --dropdown-hover: #F5F5F5;
        }

        [data-theme="dark"] {
          --bg-primary: #000000;
          --bg-secondary: #0a0a0a;
          --text-primary: #FFFFFF;
          --text-secondary: #E5E5E5;
          --card-bg: rgba(10, 10, 10, 0.95);
          --border-color: rgba(212, 175, 55, 0.2);
          --input-bg: rgba(255, 255, 255, 0.05);
          --dropdown-bg: #1a1a1a;
          --dropdown-text: #FFFFFF;
          --dropdown-hover: #2a2a2a;
        }

        html, body {
          background: var(--bg-primary);
          font-family: 'Montserrat', sans-serif;
          color: var(--text-primary);
          min-height: 100vh;
          overflow-x: hidden;
          transition: background 0.3s ease, color 0.3s ease;
        }

        .bg-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.3;
          pointer-events: none;
          z-index: 0;
          animation: float 20s ease-in-out infinite;
          transition: opacity 0.3s ease;
        }

        [data-theme="light"] .bg-orb { opacity: 0.15; }

        .orb-1 {
          width: 60vw; height: 60vw;
          background: radial-gradient(circle, var(--gold-primary), transparent);
          top: -20%; right: -20%; animation-delay: 0s;
        }
        .orb-2 {
          width: 50vw; height: 50vw;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.4), transparent);
          bottom: -30%; left: -20%; animation-delay: -5s;
        }
        .orb-3 {
          width: 40vw; height: 40vw;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.2), transparent);
          top: 40%; left: 30%; animation-delay: -10s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(5%, -5%) scale(1.05); }
          66% { transform: translate(-3%, 3%) scale(0.95); }
        }

        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          position: relative;
          z-index: 1;
          animation: contentFadeIn 0.8s ease-out;
        }

        @keyframes contentFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .logo { text-align: center; margin-bottom: 40px; }

        .wordmark {
          font-family: 'Great Vibes', cursive;
          font-size: 48px;
          background: linear-gradient(135deg, var(--gold-primary) 0%, var(--gold-light) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          letter-spacing: 2px;
        }

        .tagline {
          font-family: 'Montserrat', sans-serif;
          font-size: 10px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--gray-mid);
          margin-top: 8px;
        }

        .card {
          background: var(--card-bg);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-color);
          border-radius: 28px;
          width: 100%;
          max-width: 480px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.25);
          transition: all 0.3s ease;
        }

        .tab-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
        }

        .tab-btn {
          padding: 18px;
          font-family: 'Montserrat', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          border: none;
          background: transparent;
          color: var(--gray-mid);
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }

        .tab-btn::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--gold-primary), var(--gold-light));
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }

        .tab-btn.active { color: var(--gold-primary); background: var(--card-bg); }
        .tab-btn.active::after { transform: scaleX(1); }
        .tab-btn:hover:not(.active) { color: var(--text-primary); }

        .form-body { padding: 32px; }

        .section-title {
          font-family: 'Montserrat', sans-serif;
          font-size: 10px;
          font-weight: 700;
          color: var(--gold-primary);
          letter-spacing: 2px;
          text-transform: uppercase;
          margin: 24px 0 16px;
          padding-top: 20px;
          border-top: 1px solid var(--border-color);
        }

        .section-title:first-of-type { margin-top: 0; padding-top: 0; border-top: none; }

        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        .field { margin-bottom: 16px; }

        .field-label {
          display: block;
          font-family: 'Montserrat', sans-serif;
          font-size: 9px;
          font-weight: 600;
          color: var(--gray-mid);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .field-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--input-bg);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          color: var(--text-primary);
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px;
          font-weight: 500;
          outline: none;
          transition: all 0.3s ease;
        }

        .field-input:focus {
          border-color: var(--gold-primary);
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
        }

        .field-input::placeholder { color: var(--gray-mid); font-family: 'Cormorant Garamond', serif; opacity: 0.6; }

        select.field-input {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23D4AF37' d='M6 8L0 0h12z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
          background-size: 12px;
          color: var(--text-primary);
        }

        select.field-input option {
          background-color: var(--dropdown-bg);
          color: var(--dropdown-text);
          padding: 10px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
        }

        select.field-input:-moz-focusring { color: transparent; text-shadow: 0 0 0 var(--text-primary); }
        select.field-input::-ms-expand { display: none; }

        .btn-submit {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, var(--gold-primary), var(--gold-dark));
          border: none;
          border-radius: 50px;
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: var(--pure-black);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 16px;
          position: relative;
          overflow: hidden;
        }

        .btn-submit::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s ease;
        }

        .btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 30px var(--gold-glow); }
        .btn-submit:hover:not(:disabled)::before { left: 100%; }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .error {
          color: #e8503a;
          font-size: 12px;
          margin-bottom: 16px;
          padding: 12px 16px;
          background: rgba(232, 80, 58, 0.1);
          border-radius: 12px;
          border: 1px solid rgba(232, 80, 58, 0.3);
          font-family: 'Montserrat', sans-serif;
          font-weight: 500;
        }

        .success {
          color: #3aaa6e;
          font-size: 12px;
          margin-bottom: 16px;
          padding: 12px 16px;
          background: rgba(58, 170, 110, 0.1);
          border-radius: 12px;
          border: 1px solid rgba(58, 170, 110, 0.3);
          font-family: 'Montserrat', sans-serif;
          font-weight: 500;
        }

        .footer-link {
          text-align: center;
          margin-top: 28px;
          font-family: 'Montserrat', sans-serif;
          font-size: 11px;
          color: var(--gray-mid);
          letter-spacing: 0.5px;
        }

        .footer-link a {
          color: var(--gold-primary);
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .footer-link a:hover { text-decoration: underline; text-shadow: 0 0 10px var(--gold-glow); }

        @media (max-width: 768px) {
          .form-body { padding: 24px; }
          .wordmark { font-size: 36px; }
        }

        @media (max-width: 480px) {
          .form-body { padding: 20px; }
          .row2 { grid-template-columns: 1fr; gap: 0; }
        }
      `}</style>

      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <div className="page">
        <div className="logo">
          <div className="wordmark">MediQueue</div>
          <div className="tagline">Patient Portal</div>
        </div>

        <div className="card">
          <div className="tab-row">
            <button
              className={`tab-btn ${tab === "login" ? "active" : ""}`}
              onClick={() => { setTab("login"); setError(""); setSuccess(""); }}
            >
              Sign In
            </button>
            <button
              className={`tab-btn ${tab === "register" ? "active" : ""}`}
              onClick={() => { setTab("register"); setError(""); setSuccess(""); }}
            >
              Create Account
            </button>
          </div>

          {tab === "login" && (
            <form className="form-body" onSubmit={handleLogin}>
              {error && <div className="error">{error}</div>}
              {success && <div className="success">{success}</div>}
              <div className="field">
                <label className="field-label">Username</label>
                <input className="field-input" placeholder="Enter your username" value={login.username}
                  onChange={e => setLogin(l => ({ ...l, username: e.target.value }))} autoComplete="username" required />
              </div>
              <div className="field">
                <label className="field-label">Password</label>
                <input className="field-input" type="password" placeholder="Enter your password" value={login.password}
                  onChange={e => setLogin(l => ({ ...l, password: e.target.value }))} autoComplete="current-password" required />
              </div>
              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? "Authenticating..." : "Access Portal →"}
              </button>
            </form>
          )}

          {tab === "register" && (
            <form className="form-body" onSubmit={handleRegister}>
              {error && <div className="error">{error}</div>}

              <div className="section-title">Account Credentials</div>
              <div className="field">
                <label className="field-label">Username</label>
                <input className="field-input" placeholder="Choose a unique username" value={reg.username}
                  onChange={e => setReg(r => ({ ...r, username: e.target.value }))} required />
              </div>
              <div className="row2">
                <div className="field">
                  <label className="field-label">Password</label>
                  <input className="field-input" type="password" placeholder="Minimum 6 characters" value={reg.password}
                    onChange={e => setReg(r => ({ ...r, password: e.target.value }))} required />
                </div>
                <div className="field">
                  <label className="field-label">Confirm Password</label>
                  <input className="field-input" type="password" placeholder="Repeat your password" value={reg.confirmPassword}
                    onChange={e => setReg(r => ({ ...r, confirmPassword: e.target.value }))} required />
                </div>
              </div>

              <div className="section-title">Personal Information</div>
              <div className="field">
                <label className="field-label">Full Name</label>
                <input className="field-input" placeholder="As per government ID" value={reg.name}
                  onChange={e => setReg(r => ({ ...r, name: e.target.value }))} required />
              </div>
              <div className="row2">
                <div className="field">
                  <label className="field-label">Age</label>
                  <input className="field-input" type="number" placeholder="Years" min="0" max="120" value={reg.age}
                    onChange={e => setReg(r => ({ ...r, age: e.target.value }))} required />
                </div>
                <div className="field">
                  <label className="field-label">Gender</label>
                  <select className="field-input" value={reg.gender} onChange={e => setReg(r => ({ ...r, gender: e.target.value }))} required>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div className="row2">
                <div className="field">
                  <label className="field-label">Blood Type</label>
                  <select className="field-input" value={reg.bloodType} onChange={e => setReg(r => ({ ...r, bloodType: e.target.value }))} required>
                    <option value="">Select blood type</option>
                    {["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Phone Number</label>
                  <input className="field-input" type="tel" placeholder="+91 XXXXXXXXXX" value={reg.phone}
                    onChange={e => setReg(r => ({ ...r, phone: e.target.value }))} required />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Emergency Contact</label>
                <input className="field-input" placeholder="Name & phone number" value={reg.emergencyContact}
                  onChange={e => setReg(r => ({ ...r, emergencyContact: e.target.value }))} required />
              </div>

              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account →"}
              </button>
            </form>
          )}
        </div>

        <div className="footer-link">
          <span style={{ opacity: 0.6 }}>Healthcare professional? </span>
          <Link href="/admin/login">Access Staff Portal →</Link>
        </div>
      </div>
    </>
  );
}

// ─── Fallback shown while Suspense resolves ───────────────────────────────────
function LoginFallback() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#000"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "'Great Vibes', cursive", fontSize: "36px",
          background: "linear-gradient(135deg, #D4AF37, #F3D572)",
          WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent"
        }}>
          MediQueue
        </div>
        <div style={{ marginTop: "20px", color: "#888", fontFamily: "sans-serif", fontSize: "13px" }}>
          Loading...
        </div>
      </div>
    </div>
  );
}

// ─── Default export: Suspense wrapper (fixes prerender error) ─────────────────
export default function PatientLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <PatientLoginContent />
    </Suspense>
  );
}
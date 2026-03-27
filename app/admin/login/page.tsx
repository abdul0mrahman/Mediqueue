"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [creds, setCreds] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Apply system theme
    const getSystemTheme = () => {
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    };

    const applyTheme = (themeValue) => {
      document.documentElement.setAttribute("data-theme", themeValue);
    };

    try {
      const t = localStorage.getItem("mq-theme");
      if (t === "light" || t === "dark") {
        applyTheme(t);
      } else {
        const settings = localStorage.getItem("mq-settings");
        if (settings) {
          const p = JSON.parse(settings);
          if (p.theme === "light" || p.theme === "dark") applyTheme(p.theme);
          else applyTheme(getSystemTheme());
        } else applyTheme(getSystemTheme());
      }
    } catch { applyTheme(getSystemTheme()); }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handleThemeChange = (e) => {
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
    
    // Only redirect if already logged in via sessionStorage (current session only)
    if (sessionStorage.getItem("mq-admin")) router.push("/dashboard");
    
    return () => mediaQuery.removeEventListener("change", handleThemeChange);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    if (creds.username === "admin" && creds.password === "admin123") {
      sessionStorage.setItem("mq-admin", "true");
      router.push("/dashboard");
    } else {
      setError("Invalid admin credentials.");
    }
    setLoading(false);
  }

  return (
    <>
      <style>{`
        /* Premium Font Imports */
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&family=Space+Grotesk:wght@300;400;500;600;700&family=Great+Vibes&family=Inter:wght@300;400;500;600;700;800&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        /* Theme Variables */
        :root {
          --pure-black: #000000;
          --gold-primary: #D4AF37;
          --gold-light: #F3D572;
          --gold-dark: #B38F2F;
          --gold-glow: rgba(212, 175, 55, 0.3);
          --white: #FFFFFF;
          --gray-light: #E5E5E5;
          --gray-mid: #888888;
          --bg-primary: #FFFFFF;
          --bg-secondary: #F5F5F5;
          --text-primary: #000000;
          --text-secondary: #333333;
          --card-bg: rgba(255, 255, 255, 0.95);
          --border-color: rgba(0, 0, 0, 0.1);
          --input-bg: rgba(0, 0, 0, 0.02);
          --admin-accent: #e8503a;
          --admin-accent-glow: rgba(232, 80, 58, 0.3);
        }

        [data-theme="dark"] {
          --pure-black: #000000;
          --gold-primary: #D4AF37;
          --gold-light: #F3D572;
          --gold-dark: #B38F2F;
          --gold-glow: rgba(212, 175, 55, 0.3);
          --white: #FFFFFF;
          --gray-light: #E5E5E5;
          --gray-mid: #888888;
          --bg-primary: #000000;
          --bg-secondary: #0a0a0a;
          --text-primary: #FFFFFF;
          --text-secondary: #E5E5E5;
          --card-bg: rgba(10, 10, 10, 0.95);
          --border-color: rgba(212, 175, 55, 0.2);
          --input-bg: rgba(255, 255, 255, 0.05);
          --admin-accent: #ff6b4a;
          --admin-accent-glow: rgba(232, 80, 58, 0.4);
        }

        html, body {
          background: var(--bg-primary);
          font-family: 'Space Grotesk', sans-serif;
          color: var(--text-primary);
          min-height: 100vh;
          overflow-x: hidden;
          transition: background 0.3s ease, color 0.3s ease;
        }

        /* Animated Background Orbs */
        .bg-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.2;
          pointer-events: none;
          z-index: 0;
          animation: float 20s ease-in-out infinite;
        }

        [data-theme="light"] .bg-orb {
          opacity: 0.1;
        }

        .orb-1 {
          width: 60vw;
          height: 60vw;
          background: radial-gradient(circle, var(--gold-primary), transparent);
          top: -20%;
          right: -20%;
        }
        .orb-2 {
          width: 50vw;
          height: 50vw;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.3), transparent);
          bottom: -30%;
          left: -20%;
        }
        .orb-3 {
          width: 40vw;
          height: 40vw;
          background: radial-gradient(circle, rgba(232, 80, 58, 0.15), transparent);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: -5s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(3%, -3%) scale(1.02); }
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
          animation: fadeInUp 0.8s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Logo Section */
        .logo {
          text-align: center;
          margin-bottom: 40px;
        }

        .wordmark {
          font-family: 'Great Vibes', cursive;
          font-size: 48px;
          background: linear-gradient(135deg, var(--gold-primary) 0%, var(--gold-light) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          letter-spacing: 2px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: var(--admin-accent);
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-top: 12px;
          background: rgba(232, 80, 58, 0.1);
          border: 1px solid rgba(232, 80, 58, 0.3);
          padding: 6px 16px;
          border-radius: 100px;
        }

        /* Card */
        .card {
          background: var(--card-bg);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(232, 80, 58, 0.25);
          border-radius: 28px;
          width: 100%;
          max-width: 420px;
          padding: 40px 36px;
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(232, 80, 58, 0.1);
          transition: all 0.3s ease;
        }

        .card-title {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }

        .card-sub {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          color: var(--gray-mid);
          margin-bottom: 32px;
          letter-spacing: 0.3px;
        }

        /* Form Fields */
        .field {
          margin-bottom: 20px;
        }

        .field-label {
          display: block;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 10px;
          font-weight: 600;
          color: var(--admin-accent);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .field-input {
          width: 100%;
          padding: 14px 16px;
          background: var(--input-bg);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          color: var(--text-primary);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          font-weight: 500;
          outline: none;
          transition: all 0.3s ease;
        }

        .field-input:focus {
          border-color: var(--admin-accent);
          box-shadow: 0 0 0 3px rgba(232, 80, 58, 0.1);
        }

        .field-input::placeholder {
          color: var(--gray-mid);
          font-weight: 400;
        }

        /* Button */
        .btn-submit {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, rgba(232, 80, 58, 0.15), rgba(232, 80, 58, 0.05));
          color: var(--admin-accent);
          border: 1.5px solid rgba(232, 80, 58, 0.4);
          border-radius: 50px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 8px;
          position: relative;
          overflow: hidden;
        }

        .btn-submit::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(232, 80, 58, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px var(--admin-accent-glow);
          border-color: var(--admin-accent);
        }

        .btn-submit:hover:not(:disabled)::before {
          left: 100%;
        }

        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Error Message */
        .error {
          color: var(--admin-accent);
          font-size: 12px;
          margin-bottom: 20px;
          padding: 12px 16px;
          background: rgba(232, 80, 58, 0.08);
          border-radius: 14px;
          border: 1px solid rgba(232, 80, 58, 0.25);
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 500;
        }

        /* Hint */
        .hint {
          font-family: 'Space Grotesk', monospace;
          font-size: 10px;
          color: var(--gray-mid);
          text-align: center;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--border-color);
          letter-spacing: 0.5px;
        }

        /* Back Link */
        .back {
          text-align: center;
          margin-top: 28px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          color: var(--gray-mid);
        }

        .back a {
          color: var(--gold-primary);
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .back a:hover {
          text-shadow: 0 0 10px var(--gold-glow);
          gap: 10px;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .card {
            padding: 32px 24px;
          }
          .wordmark {
            font-size: 36px;
          }
          .card-title {
            font-size: 24px;
          }
        }

        /* Loading animation */
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Animated Background Orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <div className="page">
        <div className="logo">
          <div className="wordmark">MediQueue</div>
          <div><span className="badge">⚕ Staff Portal</span></div>
        </div>

        <div className="card">
          <div className="card-title">Admin Access</div>
          <div className="card-sub">Restricted — authorized personnel only</div>
          
          {error && <div className="error">{error}</div>}
          
          <form onSubmit={handleLogin}>
            <div className="field">
              <label className="field-label">Username</label>
              <input 
                className="field-input" 
                placeholder="Enter admin username" 
                value={creds.username}
                onChange={e => setCreds(c => ({ ...c, username: e.target.value }))} 
                autoComplete="username" 
                required 
              />
            </div>
            
            <div className="field">
              <label className="field-label">Password</label>
              <input 
                className="field-input" 
                type="password" 
                placeholder="Enter admin password" 
                value={creds.password}
                onChange={e => setCreds(c => ({ ...c, password: e.target.value }))} 
                autoComplete="current-password" 
                required 
              />
            </div>
            
            <button className="btn-submit" type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Access Dashboard →"}
            </button>
          </form>
          
          
        </div>
        
        <div className="back">
          <a href="/login">← Return to Patient Portal</a>
        </div>
      </div>
    </>
  );
}
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Apply theme IMMEDIATELY before anything else
    const getSystemTheme = () => {
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    };

    const applyTheme = (themeValue) => {
      document.documentElement.setAttribute("data-theme", themeValue);
    };

    try {
      // Check localStorage first
      let storedTheme = localStorage.getItem("mq-theme");
      if (!storedTheme) {
        const settings = localStorage.getItem("mq-settings");
        if (settings) {
          try {
            storedTheme = JSON.parse(settings).theme || null;
          } catch (e) {}
        }
      }

      if (storedTheme) {
        applyTheme(storedTheme === "light" ? "light" : "dark");
      } else {
        // Use system preference immediately
        const systemTheme = getSystemTheme();
        applyTheme(systemTheme);
      }
    } catch (error) {
      // Fallback to system theme
      const systemTheme = getSystemTheme();
      applyTheme(systemTheme);
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handleThemeChange = (e) => {
      const newTheme = e.matches ? "light" : "dark";
      // Only update if no user preference is stored
      const hasUserPreference = localStorage.getItem("mq-theme") || 
        (() => {
          try {
            const settings = localStorage.getItem("mq-settings");
            return settings && JSON.parse(settings).theme;
          } catch { return false; }
        })();
      
      if (!hasUserPreference) {
        applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener("change", handleThemeChange);
    
    // Logo animation timing
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        setShowLogo(false);
      }, 800);
    }, 2000);
    
    return () => {
      mediaQuery.removeEventListener("change", handleThemeChange);
      clearTimeout(timer);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <style>{`
        /* Premium Font Imports */
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Montserrat:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700&family=Great+Vibes&family=Inter:wght@300;400;500;600;700;800&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        /* Theme Variables - Light & Dark Mode */
        :root {
          /* Light Mode Default */
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
          --logo-overlay-bg: #FFFFFF;
        }

        /* Dark Mode */
        [data-theme="dark"] {
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
          --bg-primary: #000000;
          --bg-secondary: #0a0a0a;
          --text-primary: #FFFFFF;
          --text-secondary: #E5E5E5;
          --card-bg: rgba(10, 10, 10, 0.95);
          --border-color: rgba(212, 175, 55, 0.2);
          --logo-overlay-bg: #000000;
        }

        body {
          background: var(--bg-primary);
          transition: background-color 0.3s ease;
          overflow-x: hidden;
        }

        /* Logo Overlay Animation */
        .logo-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--logo-overlay-bg);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease;
          pointer-events: none;
        }

        .logo-overlay.fade-out {
          opacity: 0;
        }

        .logo-container {
          text-align: center;
          animation: logoPulse 1.5s ease-in-out;
        }

        @keyframes logoPulse {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .mq-logo {
          font-family: 'Playfair Display', serif;
          font-size: 120px;
          font-weight: 800;
          background: linear-gradient(135deg, var(--gold-primary) 0%, var(--gold-light) 50%, var(--gold-primary) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          letter-spacing: -4px;
          animation: logoGlow 2s ease-in-out infinite;
          position: relative;
        }

        @keyframes logoGlow {
          0%, 100% {
            text-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
          }
          50% {
            text-shadow: 0 0 40px rgba(212, 175, 55, 0.6);
          }
        }

        .logo-subtitle {
          font-family: 'Montserrat', sans-serif;
          font-size: 12px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: var(--gold-primary);
          margin-top: 16px;
          opacity: 0;
          animation: fadeInUp 0.5s ease-out 0.8s forwards;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Main Content */
        .landing {
          position: relative;
          background: var(--bg-primary);
          min-height: 100vh;
          overflow-x: hidden;
          opacity: 0;
          animation: contentFadeIn 1s ease-out 2.5s forwards;
        }

        @keyframes contentFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Animated Background Orbs */
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

        [data-theme="light"] .bg-orb {
          opacity: 0.15;
        }

        .orb-1 {
          width: 60vw;
          height: 60vw;
          background: radial-gradient(circle, var(--gold-primary), transparent);
          top: -20%;
          right: -20%;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 50vw;
          height: 50vw;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.4), transparent);
          bottom: -30%;
          left: -20%;
          animation-delay: -5s;
        }

        .orb-3 {
          width: 40vw;
          height: 40vw;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.2), transparent);
          top: 40%;
          left: 30%;
          animation-delay: -10s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(5%, -5%) scale(1.05); }
          66% { transform: translate(-3%, 3%) scale(0.95); }
        }

        /* Hero Section - Mobile Optimized */
        .hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 80px 16px 60px;
          position: relative;
          z-index: 2;
        }

        @media (max-width: 768px) {
          .hero {
            padding: 60px 16px 40px;
          }
        }

        .hero-content {
          max-width: 1200px;
          width: 100%;
          animation: fadeInUpContent 1s ease-out 2.8s forwards;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        @keyframes fadeInUpContent {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hero-badge {
          display: inline-block;
          font-family: 'Montserrat', sans-serif;
          font-size: clamp(10px, 3vw, 12px);
          font-weight: 600;
          color: var(--gold-primary);
          text-transform: uppercase;
          letter-spacing: 3px;
          padding: 6px 16px;
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 50px;
          background: rgba(212, 175, 55, 0.05);
          margin-bottom: 24px;
          animation: pulse 2s ease-in-out infinite;
        }

        @media (max-width: 480px) {
          .hero-badge {
            letter-spacing: 2px;
            font-size: 9px;
          }
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.4);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(212, 175, 55, 0);
          }
        }

        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(36px, 8vw, 96px);
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 24px;
          background: linear-gradient(135deg, var(--text-primary) 0%, var(--gold-light) 50%, var(--gold-primary) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: shimmer 3s infinite;
        }

        @keyframes shimmer {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .hero-subtitle {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(16px, 4vw, 24px);
          color: var(--text-secondary);
          max-width: 700px;
          margin: 0 auto 40px;
          line-height: 1.6;
          font-weight: 400;
          padding: 0 16px;
        }

        .hero-buttons {
          display: flex;
          gap: clamp(12px, 4vw, 20px);
          justify-content: center;
          flex-wrap: wrap;
          padding: 0 16px;
        }

        .btn-primary {
          padding: clamp(12px, 4vw, 16px) clamp(24px, 6vw, 40px);
          background: linear-gradient(135deg, var(--gold-primary), var(--gold-dark));
          border: none;
          border-radius: 50px;
          font-family: 'Montserrat', sans-serif;
          font-size: clamp(12px, 3vw, 14px);
          font-weight: 700;
          color: var(--pure-black);
          text-decoration: none;
          letter-spacing: 1px;
          text-transform: uppercase;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          text-align: center;
        }

        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s ease;
        }

        .btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px var(--gold-glow);
        }

        .btn-primary:hover::before {
          left: 100%;
        }

        .btn-secondary {
          padding: clamp(12px, 4vw, 16px) clamp(24px, 6vw, 40px);
          background: transparent;
          border: 2px solid var(--gold-primary);
          border-radius: 50px;
          font-family: 'Montserrat', sans-serif;
          font-size: clamp(12px, 3vw, 14px);
          font-weight: 600;
          color: var(--gold-primary);
          text-decoration: none;
          letter-spacing: 1px;
          transition: all 0.3s ease;
          cursor: pointer;
          text-align: center;
        }

        .btn-secondary:hover {
          background: rgba(212, 175, 55, 0.1);
          transform: translateY(-3px);
          box-shadow: 0 5px 20px rgba(212, 175, 55, 0.2);
        }

        /* Portal Cards */
        .portals {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: clamp(20px, 5vw, 32px);
          max-width: 1000px;
          margin: 60px auto 0;
          padding: 0 20px;
        }

        @media (max-width: 768px) {
          .portals {
            margin: 40px auto 0;
            padding: 0 16px;
          }
        }

        .portal-card {
          background: var(--card-bg);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-color);
          border-radius: 24px;
          padding: clamp(28px, 5vw, 40px) clamp(20px, 4vw, 32px);
          text-decoration: none;
          transition: all 0.5s cubic-bezier(0.2, 0.9, 0.4, 1.1);
          position: relative;
          overflow: hidden;
        }

        .portal-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--gold-primary), var(--gold-light));
          transform: scaleX(0);
          transition: transform 0.5s ease;
        }

        .portal-card:hover {
          transform: translateY(-10px);
          border-color: var(--gold-primary);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(212, 175, 55, 0.1);
        }

        .portal-card:hover::before {
          transform: scaleX(1);
        }

        .portal-icon {
          font-size: clamp(48px, 8vw, 56px);
          margin-bottom: 20px;
          display: inline-block;
          transition: transform 0.3s ease;
        }

        .portal-card:hover .portal-icon {
          transform: scale(1.1) rotate(5deg);
        }

        .portal-label {
          font-family: 'Montserrat', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--gold-primary);
          margin-bottom: 12px;
        }

        .portal-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(22px, 5vw, 28px);
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 16px;
        }

        .portal-desc {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(14px, 3.5vw, 16px);
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .portal-arrow {
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: var(--gold-primary);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: gap 0.3s ease;
        }

        .portal-card:hover .portal-arrow {
          gap: 16px;
        }

        /* Stats Section */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1px;
          border-radius: 16px;
          overflow: hidden;
          max-width: 900px;
          margin: 60px auto 0;
          background: var(--card-bg);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-color);
        }

        @media (max-width: 768px) {
          .stats-grid {
            margin: 40px 16px 0;
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .stat-item {
          padding: clamp(24px, 5vw, 32px) clamp(16px, 4vw, 24px);
          text-align: center;
          transition: all 0.3s ease;
        }

        .stat-item:hover {
          background: rgba(212, 175, 55, 0.05);
          transform: scale(1.05);
        }

        .stat-number {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 6vw, 36px);
          font-weight: 800;
          background: linear-gradient(135deg, var(--gold-primary), var(--gold-light));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin-bottom: 8px;
        }

        .stat-label {
          font-family: 'Montserrat', sans-serif;
          font-size: clamp(9px, 2.5vw, 11px);
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--gray-mid);
        }

        /* Touch-friendly improvements */
        @media (hover: none) and (pointer: coarse) {
          .portal-card:active {
            transform: scale(0.98);
          }
          
          .btn-primary:active,
          .btn-secondary:active {
            transform: scale(0.97);
          }
        }

        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Safe area insets */
        @supports (padding: max(0px)) {
          .hero {
            padding-top: max(80px, env(safe-area-inset-top));
            padding-bottom: max(60px, env(safe-area-inset-bottom));
          }
        }
      `}</style>

      {/* Logo Animation Overlay */}
      {showLogo && (
        <div className={`logo-overlay ${fadeOut ? 'fade-out' : ''}`}>
          <div className="logo-container">
            <div className="mq-logo">MQ</div>
            <div className="logo-subtitle">MediQueue</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="landing">
        {/* Animated Background Orbs */}
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        <div className="bg-orb orb-3"></div>

        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <div className="hero-badge">HEALTHCARE INTELLIGENCE</div>
            <h1 className="hero-title">
              Where AI Meets<br />
              <span style={{fontFamily: "'Great Vibes', cursive", fontSize: '1.2em'}}>Emergency Excellence</span>
            </h1>
            <p className="hero-subtitle">
              Revolutionary AI-powered triage system that prioritizes critical care with surgical precision. 
              Trusted by leading healthcare institutions worldwide.
            </p>
            <div className="hero-buttons">
              <Link href="/login" className="btn-primary">Begin Your Journey</Link>
              <Link href="/admin/login" className="btn-secondary">Staff Access</Link>
            </div>

            {/* Portal Cards */}
            <div className="portals">
              <Link href="/login" className="portal-card">
                <div className="portal-icon">🏥</div>
                <div className="portal-label">PATIENT EXPERIENCE</div>
                <div className="portal-title">Patient Portal</div>
                <div className="portal-desc">
                  Seamless check-in, intelligent symptom analysis, and real-time queue tracking. 
                  Experience healthcare reimagined.
                </div>
                <div className="portal-arrow">Access Portal →</div>
              </Link>
              <Link href="/admin/login" className="portal-card">
                <div className="portal-icon">⚡</div>
                <div className="portal-label">CLINICAL COMMAND</div>
                <div className="portal-title">Admin Dashboard</div>
                <div className="portal-desc">
                  Complete queue management, priority override capabilities, and advanced analytics 
                  for operational excellence.
                </div>
                <div className="portal-arrow">Staff Login →</div>
              </Link>
            </div>

            {/* Stats */}
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number">&lt;0.5s</div>
                <div className="stat-label">AI RESPONSE TIME</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">99.99%</div>
                <div className="stat-label">SYSTEM UPTIME</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">6-TIER</div>
                <div className="stat-label">PRIORITY MATRIX</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">24/7</div>
                <div className="stat-label">REAL-TIME MONITORING</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
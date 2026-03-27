"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const [starvationThreshold, setStarvationThreshold] = useState(20);
  const [maxQueue, setMaxQueue] = useState(10);
  const [hospitalName, setHospitalName] = useState("MediQueue+ Hospital");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [criticalFlash, setCriticalFlash] = useState(true);
  const [saved, setSaved] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearDone, setClearDone] = useState(false);

  // Load saved values on mount
  useEffect(() => {
    try {
      // Theme comes from mq-theme (top-level key)
      const t = localStorage.getItem("mq-theme");
      if (t === "light" || t === "dark") {
        setThemeState(t);
        document.documentElement.setAttribute("data-theme", t);
      }
      // Other settings come from mq-settings
      const s = JSON.parse(localStorage.getItem("mq-settings") || "{}");
      if (s.starvationThreshold) setStarvationThreshold(s.starvationThreshold);
      if (s.maxQueue) setMaxQueue(s.maxQueue);
      if (s.hospitalName) setHospitalName(s.hospitalName);
      if (s.soundEnabled !== undefined) setSoundEnabled(s.soundEnabled);
      if (s.criticalFlash !== undefined) setCriticalFlash(s.criticalFlash);
    } catch {}
  }, []);

  // This is called on every theme card click — applies instantly
  function applyTheme(t: "dark" | "light") {
    setThemeState(t);
    localStorage.setItem("mq-theme", t);
    document.documentElement.setAttribute("data-theme", t);
  }

  function save() {
    // Write theme as its own key so layout.tsx inline script + all pages can read it
    localStorage.setItem("mq-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    // Write other settings separately
    const settings = { starvationThreshold, maxQueue, hospitalName, soundEnabled, criticalFlash };
    localStorage.setItem("mq-settings", JSON.stringify(settings));
    window.dispatchEvent(new StorageEvent("storage", { key: "mq-settings", newValue: JSON.stringify(settings) }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function clearAllData() {
    if (!confirm("This will permanently delete ALL patients, treatment history, and analytics from the database. This cannot be undone.\n\nAre you sure?")) return;
    setClearing(true);
    try {
      const res = await fetch("/api/queue/clear", { method: "DELETE" });
      if (res.ok) { setClearDone(true); setTimeout(() => setClearDone(false), 3000); }
      else alert("Failed to clear data. Please try again.");
    } catch { alert("Network error. Please try again."); }
    setClearing(false);
  }

  const light = theme === "light";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Manrope:wght@300;400;500;600;700;800&display=swap');

        /* NO hardcoded :root here — all vars come from globals.css via data-theme on <html> */

        .page { 
          position: relative; 
          z-index: 1; 
          max-width: 680px; 
          margin: 0 auto; 
          padding: 32px 20px 120px; 
          width: 100%;
          box-sizing: border-box;
        }

        .top-nav { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          margin-bottom: 32px; 
          flex-wrap: wrap; 
          gap: 12px; 
          width: 100%;
        }
        .back-link { 
          display: inline-flex; 
          align-items: center; 
          gap: 6px; 
          font-family: 'DM Mono', monospace; 
          font-size: 9px; 
          color: var(--text3); 
          letter-spacing: 2px; 
          text-transform: uppercase; 
          text-decoration: none; 
          transition: color 0.2s; 
          white-space: nowrap;
        }
        .back-link:hover { color: var(--gold); }
        .nav-links { 
          display: flex; 
          gap: 16px; 
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .nav-link { 
          font-family: 'DM Mono', monospace; 
          font-size: 9px; 
          color: var(--text3); 
          letter-spacing: 2px; 
          text-transform: uppercase; 
          text-decoration: none; 
          transition: color 0.2s; 
          white-space: nowrap;
        }
        .nav-link:hover { color: var(--gold); }

        .page-header { margin-bottom: 32px; }
        .page-title { 
          font-family: 'DM Serif Display', serif; 
          font-size: 36px; 
          color: var(--white); 
          letter-spacing: -1px; 
          word-break: break-word;
        }
        .page-sub { 
          font-size: 12px; 
          color: var(--text3); 
          margin-top: 6px; 
          word-break: break-word;
        }

        .section { 
          margin-bottom: 28px; 
          width: 100%;
        }
        .section-title { 
          font-family: 'DM Mono', monospace; 
          font-size: 8px; 
          color: var(--gold); 
          letter-spacing: 3px; 
          text-transform: uppercase; 
          margin-bottom: 12px; 
          padding-bottom: 8px; 
          border-bottom: 1px solid var(--border); 
        }

        .setting-row { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          padding: 14px 16px; 
          background: var(--surface); 
          border: 1px solid var(--border); 
          border-radius: 10px; 
          margin-bottom: 6px; 
          box-shadow: var(--shadow); 
          gap: 16px; 
          transition: border-color 0.2s; 
          width: 100%;
          box-sizing: border-box;
        }
        .setting-row:hover { border-color: var(--border2); }
        .setting-left { 
          flex: 1; 
          min-width: 0; /* Allows text truncation if needed */
        }
        .setting-name { 
          font-size: 13px; 
          font-weight: 600; 
          color: var(--white); 
          word-break: break-word;
        }
        .setting-desc { 
          font-size: 10px; 
          color: var(--text3); 
          margin-top: 3px; 
          line-height: 1.4; 
          word-break: break-word;
        }

        /* THEME CARDS */
        .theme-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 10px; 
          width: 100%;
        }
        .theme-card { 
          padding: 16px; 
          border-radius: 10px; 
          border: 2px solid transparent; 
          cursor: pointer; 
          transition: all 0.2s; 
          text-align: center; 
          position: relative; 
          width: 100%;
          box-sizing: border-box;
        }
        .theme-card.selected { box-shadow: 0 0 20px var(--gold-dim); }
        .theme-card.dark-card { background: #0b0f1a; }
        .theme-card.dark-card.selected { border-color: #c8a96e; }
        .theme-card.light-card { background: #f0f3fa; border-color: rgba(160,120,64,0.2); }
        .theme-card.light-card.selected { border-color: #8a6520; }
        .theme-preview { 
          width: 100%; 
          height: 52px; 
          border-radius: 6px; 
          margin-bottom: 10px; 
          display: flex; 
          gap: 5px; 
          padding: 7px; 
          overflow: hidden; 
          box-sizing: border-box;
        }
        .theme-bar { border-radius: 3px; }
        .theme-name { 
          font-family: 'DM Mono', monospace; 
          font-size: 9px; 
          letter-spacing: 2px; 
          text-transform: uppercase; 
          word-break: break-word;
        }
        .theme-check { 
          position: absolute; 
          top: 8px; 
          right: 10px; 
          font-family: 'DM Mono', monospace; 
          font-size: 10px; 
        }

        /* TOGGLE */
        .toggle { 
          position: relative; 
          width: 44px; 
          height: 24px; 
          flex-shrink: 0; 
          cursor: pointer; 
          display: block; 
        }
        .toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .toggle-track { 
          position: absolute; 
          inset: 0; 
          background: var(--bg2); 
          border: 1px solid var(--border2); 
          border-radius: 100px; 
          transition: all 0.3s; 
        }
        .toggle input:checked ~ .toggle-track { 
          background: rgba(200,169,110,0.2); 
          border-color: rgba(200,169,110,0.45); 
        }
        .toggle-thumb { 
          position: absolute; 
          top: 3px; 
          left: 3px; 
          width: 16px; 
          height: 16px; 
          background: var(--text3); 
          border-radius: 50%; 
          transition: all 0.3s; 
          pointer-events: none; 
        }
        .toggle input:checked ~ .toggle-thumb { 
          left: 23px; 
          background: var(--gold); 
          box-shadow: 0 0 8px var(--gold); 
        }

        /* SLIDER - Mobile optimized */
        .slider-wrap { 
          display: flex; 
          align-items: center; 
          gap: 12px; 
          min-width: 160px; 
          flex-shrink: 0; 
        }
        .slider { 
          -webkit-appearance: none; 
          flex: 1; 
          height: 4px; 
          background: var(--bg2); 
          border-radius: 2px; 
          outline: none; 
          cursor: pointer; 
          min-width: 80px; /* Ensures slider is tappable */
        }
        .slider::-webkit-slider-thumb { 
          -webkit-appearance: none; 
          width: 20px; 
          height: 20px; 
          border-radius: 50%; 
          background: var(--gold); 
          cursor: pointer; 
          box-shadow: 0 0 6px rgba(200,169,110,0.4); 
        }
        .slider-val { 
          font-family: 'DM Mono', monospace; 
          font-size: 13px; 
          color: var(--gold); 
          min-width: 42px; 
          text-align: right; 
          font-weight: 600; 
          flex-shrink: 0;
        }

        .setting-input { 
          background: var(--input-bg); 
          border: 1px solid var(--border2); 
          border-radius: 7px; 
          color: var(--text); 
          font-family: 'Manrope', sans-serif; 
          font-size: 14px; /* Larger for mobile touch */
          padding: 10px 12px; 
          outline: none; 
          transition: all 0.2s; 
          width: 200px; 
          flex-shrink: 0; 
          -webkit-appearance: none;
        }
        .setting-input:focus { border-color: rgba(200,169,110,0.4); }

        .danger-row { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          padding: 14px 16px; 
          background: var(--surface); 
          border: 1px solid rgba(232,80,58,0.2); 
          border-radius: 10px; 
          gap: 16px; 
          box-shadow: var(--shadow); 
          width: 100%;
          box-sizing: border-box;
        }
        .btn-danger { 
          padding: 10px 16px; 
          background: rgba(232,80,58,0.08); 
          color: #e8503a; 
          border: 1px solid rgba(232,80,58,0.3); 
          border-radius: 7px; 
          font-family: 'Manrope', sans-serif; 
          font-weight: 700; 
          font-size: 12px; 
          cursor: pointer; 
          transition: all 0.2s; 
          white-space: nowrap; 
          flex-shrink: 0; 
          -webkit-appearance: none;
        }
        .btn-danger:hover:not(:disabled) { background: rgba(232,80,58,0.15); }
        .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
        .clear-done { 
          font-family: 'DM Mono', monospace; 
          font-size: 10px; 
          color: #3aaa6e; 
          letter-spacing: 1px; 
          word-break: break-word;
        }

        .save-bar { 
          position: fixed; 
          bottom: 0; 
          left: 0; 
          right: 0; 
          background: var(--bg); 
          border-top: 1px solid var(--border2); 
          padding: 14px 20px; 
          display: flex; 
          justify-content: flex-end; 
          align-items: center; 
          gap: 12px; 
          z-index: 50; 
          backdrop-filter: blur(16px); 
          box-sizing: border-box;
          width: 100%;
        }
        .btn-save { 
          padding: 12px 28px; 
          background: var(--gold-dim); 
          color: var(--gold); 
          border: 1px solid var(--border2); 
          border-radius: 8px; 
          font-family: 'Manrope', sans-serif; 
          font-size: 13px; 
          font-weight: 700; 
          letter-spacing: 1px; 
          text-transform: uppercase; 
          cursor: pointer; 
          transition: all 0.25s; 
          -webkit-appearance: none;
          white-space: nowrap;
        }
        .btn-save:hover { 
          border-color: var(--gold); 
          box-shadow: 0 0 20px var(--gold-dim); 
        }
        .saved-msg { 
          font-family: 'DM Mono', monospace; 
          font-size: 10px; 
          color: #3aaa6e; 
          letter-spacing: 1px; 
          white-space: nowrap;
        }

        /* Mobile-first responsive design */
        @media(max-width: 640px) {
          .page { 
            padding: 24px 16px 100px; 
          }
          .page-title { 
            font-size: 32px; 
          }
          .setting-row { 
            flex-direction: column; 
            align-items: flex-start; 
            gap: 12px; 
            padding: 16px;
          }
          .setting-left { 
            width: 100%; 
          }
          .slider-wrap { 
            width: 100%; 
            min-width: 100%;
          }
          .setting-input { 
            width: 100%; 
            font-size: 16px; /* Prevents zoom on iOS */
          }
          .danger-row { 
            flex-direction: column; 
            align-items: flex-start; 
            gap: 12px; 
          }
          .btn-danger { 
            width: 100%; 
            text-align: center;
            padding: 14px;
          }
          .save-bar { 
            padding: 12px 16px; 
            gap: 8px;
          }
          .btn-save { 
            padding: 12px 20px; 
            font-size: 12px;
          }
        }

        @media(max-width: 480px) {
          .page { 
            padding: 20px 12px 90px; 
          }
          .page-title { 
            font-size: 28px; 
          }
          .top-nav { 
            gap: 8px; 
          }
          .nav-links { 
            gap: 12px; 
          }
          .theme-grid { 
            gap: 8px; 
          }
          .theme-card { 
            padding: 12px; 
          }
          .theme-preview { 
            height: 46px; 
          }
          .setting-row { 
            padding: 14px; 
          }
          .save-bar { 
            flex-direction: row; 
            justify-content: space-between;
            padding: 10px 12px;
          }
          .saved-msg { 
            font-size: 9px; 
          }
          .btn-save { 
            padding: 10px 16px; 
          }
        }

        /* Small phones */
        @media(max-width: 360px) {
          .page-title { 
            font-size: 24px; 
          }
          .nav-links { 
            gap: 8px; 
          }
          .theme-card { 
            padding: 10px; 
          }
          .theme-preview { 
            height: 40px; 
          }
          .slider-val { 
            min-width: 38px; 
            font-size: 12px;
          }
        }

        /* Touch-friendly improvements */
        @media (hover: none) and (pointer: coarse) {
          .slider::-webkit-slider-thumb { 
            width: 24px; 
            height: 24px; 
          }
          .toggle { 
            width: 52px; 
            height: 28px; 
          }
          .toggle-thumb { 
            width: 20px; 
            height: 20px; 
          }
          .toggle input:checked ~ .toggle-thumb { 
            left: 27px; 
          }
          .btn-save, 
          .btn-danger, 
          .theme-card { 
            min-height: 44px; /* Apple's recommended touch target size */
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>

      <div className="page">
        <div className="top-nav">
          <Link href="/dashboard" className="back-link">← Dashboard</Link>
          <div className="nav-links">
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/dashboard" className="nav-link">Dashboard</Link>
          </div>
        </div>

        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Configure your MediQueue+ system</p>
        </div>

        {/* APPEARANCE */}
        <div className="section">
          <div className="section-title">Appearance</div>
          <div className="theme-grid">
            {/* DARK card */}
            <div
              className={`theme-card dark-card ${theme === "dark" ? "selected" : ""}`}
              onClick={() => applyTheme("dark")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && applyTheme("dark")}
            >
              {theme === "dark" && <div className="theme-check" style={{color:"#c8a96e"}}>✓</div>}
              <div className="theme-preview" style={{background:"#0b0f1a"}}>
                <div className="theme-bar" style={{width:"28%",background:"#131b2e",border:"1px solid rgba(200,169,110,0.2)"}} />
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
                  <div className="theme-bar" style={{height:"45%",background:"#192236",width:"100%"}} />
                  <div className="theme-bar" style={{height:"35%",background:"#192236",width:"70%"}} />
                </div>
              </div>
              <div className="theme-name" style={{color:"#c8a96e"}}>Dark Mode</div>
            </div>

            {/* LIGHT card */}
            <div
              className={`theme-card light-card ${theme === "light" ? "selected" : ""}`}
              onClick={() => applyTheme("light")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && applyTheme("light")}
            >
              {theme === "light" && <div className="theme-check" style={{color:"#8a6520"}}>✓</div>}
              <div className="theme-preview" style={{background:"#f0f3fa"}}>
                <div className="theme-bar" style={{width:"28%",background:"#ffffff",border:"1px solid rgba(138,101,32,0.2)"}} />
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
                  <div className="theme-bar" style={{height:"45%",background:"#e4e8f4",width:"100%"}} />
                  <div className="theme-bar" style={{height:"35%",background:"#e4e8f4",width:"70%"}} />
                </div>
              </div>
              <div className="theme-name" style={{color:"#8a6520"}}>Light Mode</div>
            </div>
          </div>
          <p style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"var(--text3)",letterSpacing:"1px",marginTop:8,textAlign:"center"}}>
            Theme applies instantly to all pages
          </p>
        </div>

        {/* HOSPITAL */}
        <div className="section">
          <div className="section-title">Hospital</div>
          <div className="setting-row">
            <div className="setting-left">
              <div className="setting-name">Hospital Name</div>
              <div className="setting-desc">Shown in the dashboard header</div>
            </div>
            <input 
              className="setting-input" 
              value={hospitalName} 
              onChange={e => setHospitalName(e.target.value)}
              inputMode="text"
              enterKeyHint="done"
            />
          </div>
        </div>

        {/* QUEUE CONFIG */}
        <div className="section">
          <div className="section-title">Queue Configuration</div>
          <div className="setting-row">
            <div className="setting-left">
              <div className="setting-name">Max Queue Size</div>
              <div className="setting-desc">Maximum patients in queue at once</div>
            </div>
            <div className="slider-wrap">
              <input 
                type="range" 
                className="slider" 
                min={5} 
                max={20} 
                value={maxQueue} 
                onChange={e => setMaxQueue(Number(e.target.value))}
                aria-label="Max queue size"
              />
              <span className="slider-val">{maxQueue}</span>
            </div>
          </div>
          <div className="setting-row">
            <div className="setting-left">
              <div className="setting-name">Starvation Threshold</div>
              <div className="setting-desc">Wait time (seconds) before auto priority boost</div>
            </div>
            <div className="slider-wrap">
              <input 
                type="range" 
                className="slider" 
                min={10} 
                max={120} 
                step={5} 
                value={starvationThreshold} 
                onChange={e => setStarvationThreshold(Number(e.target.value))}
                aria-label="Starvation threshold in seconds"
              />
              <span className="slider-val">{starvationThreshold}s</span>
            </div>
          </div>
        </div>

        {/* ALERTS */}
        <div className="section">
          <div className="section-title">Alerts & Notifications</div>
          <div className="setting-row">
            <div className="setting-left">
              <div className="setting-name">Sound Alerts</div>
              <div className="setting-desc">Alarm when critical patients are admitted</div>
            </div>
            <label className="toggle">
              <input 
                type="checkbox" 
                checked={soundEnabled} 
                onChange={e => setSoundEnabled(e.target.checked)}
                aria-label="Toggle sound alerts"
              />
              <div className="toggle-track" /><div className="toggle-thumb" />
            </label>
          </div>
          <div className="setting-row">
            <div className="setting-left">
              <div className="setting-name">Critical Screen Flash</div>
              <div className="setting-desc">Full red screen when priority 5 patient admitted</div>
            </div>
            <label className="toggle">
              <input 
                type="checkbox" 
                checked={criticalFlash} 
                onChange={e => setCriticalFlash(e.target.checked)}
                aria-label="Toggle critical screen flash"
              />
              <div className="toggle-track" /><div className="toggle-thumb" />
            </label>
          </div>
        </div>

        {/* DANGER ZONE */}
        <div className="section">
          <div className="section-title">Danger Zone</div>
          <div className="danger-row">
            <div className="setting-left">
              <div className="setting-name" style={{color:"#e8503a"}}>Clear All Patient Data</div>
              <div className="setting-desc">Permanently wipes all patients, treatments, boost events, and analytics. Cannot be undone.</div>
              {clearDone && <div className="clear-done" style={{marginTop:6}}>✓ All data cleared successfully</div>}
            </div>
            <button className="btn-danger" onClick={clearAllData} disabled={clearing}>
              {clearing ? "Clearing..." : "Clear Data"}
            </button>
          </div>
        </div>
      </div>

      <div className="save-bar">
        {saved && <span className="saved-msg">✓ Settings saved</span>}
        <button className="btn-save" onClick={save}>Save Settings</button>
      </div>
    </>
  );
}
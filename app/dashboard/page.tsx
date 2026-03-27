"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Audio ──────────────────────────────────────────────────────────────────
function playAlarm() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, ctx.currentTime + i * 0.35);
      osc.frequency.setValueAtTime(440, ctx.currentTime + i * 0.35 + 0.17);
      gain.gain.setValueAtTime(0.7, ctx.currentTime + i * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.35 + 0.32);
      osc.start(ctx.currentTime + i * 0.35);
      osc.stop(ctx.currentTime + i * 0.35 + 0.32);
    }
  } catch {}
}

function playTreatSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

// ── Severity map ───────────────────────────────────────────────────────────
const SEV: Record<number, { label: string; color: string; glow: string; bg: string; border: string; hex: string; short: string; slaSecs: number }> = {
  5: { label:"Critical", short:"CRIT", color:"#e8503a", glow:"rgba(232,80,58,0.5)",  bg:"rgba(232,80,58,0.12)",  border:"rgba(232,80,58,0.35)",  hex:"#e8503a", slaSecs: 5 * 60 },
  4: { label:"Severe",   short:"SEV",  color:"#d4873a", glow:"rgba(212,135,58,0.5)", bg:"rgba(212,135,58,0.12)", border:"rgba(212,135,58,0.35)", hex:"#d4873a", slaSecs: 15 * 60 },
  3: { label:"Urgent",   short:"URG",  color:"#c4a832", glow:"rgba(196,168,50,0.5)", bg:"rgba(196,168,50,0.1)",  border:"rgba(196,168,50,0.3)",  hex:"#c4a832", slaSecs: 30 * 60 },
  2: { label:"Moderate", short:"MOD",  color:"#3a82c4", glow:"rgba(58,130,196,0.5)", bg:"rgba(58,130,196,0.12)", border:"rgba(58,130,196,0.35)", hex:"#3a82c4", slaSecs: 60 * 60 },
  1: { label:"Minor",    short:"MIN",  color:"#3aaa6e", glow:"rgba(58,170,110,0.5)", bg:"rgba(58,170,110,0.12)", border:"rgba(58,170,110,0.35)", hex:"#3aaa6e", slaSecs: 120 * 60 },
};
const PIE_COLORS = ["#e8503a","#d4873a","#c4a832","#3a82c4","#3aaa6e"];

const PATIENT_TAGS = [
  { id:"wheelchair", label:"♿ Wheelchair", color:"#3a82c4" },
  { id:"escort",     label:"👥 Escort",     color:"#c4a832" },
  { id:"translator", label:"🌐 Translator", color:"#d4873a" },
  { id:"fasting",    label:"🍽️ Fasting",    color:"#3aaa6e" },
  { id:"allergy",    label:"⚠️ Allergy",    color:"#e8503a" },
];

// ── Types ──────────────────────────────────────────────────────────────────
type Patient = { id:number; name:string; condition:string; priority:number; originalPriority:number; boosted:boolean; boostReason?:string; enqueuedAt:number; waitSeconds:number; treatedAt?:number; patientUserId?:number };
type BoostEvent = { time:number; patientName:string; oldPriority:number; newPriority:number; reason:string };
type TreatmentLog = { time:number; severity:number; waitSeconds:number; name:string };
type Analytics = { totalAdmitted:number; totalTreated:number; treatmentLog:TreatmentLog[]; boostEvents:BoostEvent[] };
type Toast = { id:number; message:string; type:"admit"|"treat"|"boost"|"critical"|"lock"|"note"|"clear"|"export"|"auto"|"delete"|"notify" };
type Vitals = { bp:string; pulse:string; temp:string };

function resolveTheme(raw: string | null): "light" | "dark" {
  if (raw === "light") return "light";
  if (raw === "dark") return "dark";
  if (raw === "system") return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  return "dark";
}
function applyThemeFromStorage() {
  try { document.documentElement.setAttribute("data-theme", resolveTheme(localStorage.getItem("mq-theme"))); } catch {}
}

// ── Live Wait Counter (counts UP from enqueuedAt) ─────────────────────────
function LiveWaitUp({ enqueuedAt, priority }: { enqueuedAt: number; priority: number }) {
  const [secs, setSecs] = useState(() => Math.floor((Date.now() - enqueuedAt) / 1000));
  useEffect(() => {
    const t = setInterval(() => setSecs(Math.floor((Date.now() - enqueuedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [enqueuedAt]);
  const sla = SEV[priority]?.slaSecs ?? 9999;
  const breached = secs >= sla;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const display = m > 0 ? `${m}m ${String(s).padStart(2,"0")}s` : `${secs}s`;
  return (
    <span style={{ color: breached ? "#e8503a" : "var(--gray-mid)", fontWeight: breached ? 700 : 400 }}>
      ⏱️ {display}{breached ? " ⚠️" : ""}
    </span>
  );
}

// ── SLA Badge ─────────────────────────────────────────────────────────────
function SlaBadge({ enqueuedAt, priority }: { enqueuedAt: number; priority: number }) {
  const [breached, setBreached] = useState(false);
  useEffect(() => {
    const check = () => {
      const secs = Math.floor((Date.now() - enqueuedAt) / 1000);
      setBreached(secs >= (SEV[priority]?.slaSecs ?? 9999));
    };
    check();
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, [enqueuedAt, priority]);
  if (!breached) return null;
  return (
    <span style={{
      padding:"2px 7px", borderRadius:100, fontSize:8, fontWeight:700,
      background:"rgba(232,80,58,0.15)", color:"#e8503a",
      border:"1px solid rgba(232,80,58,0.4)", animation:"slaPulse 1.5s ease-in-out infinite"
    }}>SLA BREACH</span>
  );
}

// ── Pie Chart ──────────────────────────────────────────────────────────────
function PieChart({ data }: { data: { label:string; value:number; color:string }[] }) {
  const total = data.reduce((s,d) => s+d.value, 0);
  if (total===0) return <div style={{textAlign:"center",padding:"20px",color:"var(--gray-mid)",fontSize:11}}>No data yet</div>;
  function polarToXY(cx:number,cy:number,r:number,deg:number){const rad=(deg*Math.PI)/180;return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)};}
  function arc(cx:number,cy:number,r:number,s:number,e:number){const a=polarToXY(cx,cy,r,s);const b=polarToXY(cx,cy,r,e);return`M ${cx} ${cy} L ${a.x} ${a.y} A ${r} ${r} 0 ${e-s>180?1:0} 1 ${b.x} ${b.y} Z`;}
  let angle=-90;
  const slices=data.filter(d=>d.value>0).map(d=>{const pct=d.value/total;const start=angle;angle+=pct*360;return{...d,pct,start,end:angle};});
  return (
    <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
      <svg width="110" height="110" viewBox="0 0 110 110" style={{flexShrink:0}}>
        {slices.map((s,i)=><path key={i} d={arc(55,55,46,s.start,s.end-0.5)} fill={s.color} opacity={0.85} style={{filter:`drop-shadow(0 0 4px ${s.color}55)`}}/>)}
        <circle cx="55" cy="55" r="26" fill="var(--card-bg)"/>
        <text x="55" y="51" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontFamily="'Playfair Display',serif">{total}</text>
        <text x="55" y="63" textAnchor="middle" fill="var(--gray-mid)" fontSize="6" fontFamily="'Space Grotesk',monospace" letterSpacing="1">TOTAL</text>
      </svg>
      <div style={{display:"flex",flexDirection:"column",gap:6,flex:1,minWidth:90}}>
        {slices.map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:s.color,flexShrink:0}}/>
            <span style={{fontSize:9,color:"var(--text-secondary)",flex:1}}>{s.label}</span>
            <span style={{fontSize:10,color:s.color,fontWeight:600}}>{s.value}</span>
            <span style={{fontSize:9,color:"var(--gray-mid)",width:28,textAlign:"right"}}>{Math.round(s.pct*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const router = useRouter();
  const [queue, setQueue]         = useState<Patient[]>([]);
  const [treated, setTreated]     = useState<Patient[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({ totalAdmitted:0, totalTreated:0, treatmentLog:[], boostEvents:[] });
  const [activeTab, setActiveTab] = useState<"queue"|"treated"|"analytics"|"starvation">("queue");
  const [overrideId, setOverrideId] = useState<number|null>(null);
  const [overridePriority, setOverridePriority] = useState("5");
  const [overrideReason, setOverrideReason] = useState("");
  const [newBoost, setNewBoost]   = useState(false);
  const [toasts, setToasts]       = useState<Toast[]>([]);
  const [criticalAlert, setCriticalAlert] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [queueLocked, setQueueLocked] = useState(false);
  const [notes, setNotes]         = useState<Record<number,string>>({});
  const [noteOpen, setNoteOpen]   = useState<number|null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [confirmClear, setConfirmClear] = useState<"queue"|"treated"|"boosts"|null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [clearingLoading, setClearingLoading] = useState(false);
  const [resettingDay, setResettingDay] = useState(false); // Added for New Day button

  // New feature state
  const [vitals, setVitals]       = useState<Record<number, Vitals>>({});
  const [vitalsOpen, setVitalsOpen] = useState<number|null>(null);
  const [vitalsDraft, setVitalsDraft] = useState<Vitals>({ bp:"", pulse:"", temp:"" });
  const [patientTags, setPatientTags] = useState<Record<number, string[]>>({});
  const [tagsOpen, setTagsOpen]   = useState<number|null>(null);
  const [smsOpen, setSmsOpen]     = useState<Patient|null>(null);
  const [smsDraft, setSmsDraft]   = useState("");
  const [callingPatient, setCallingPatient] = useState<number|null>(null);

  const prevBoostCount = useRef(0);
  const toastId = useRef(0);
  const prevQueueIds = useRef<number[]>([]);
  const queueRef = useRef<Patient[]>([]);
  const queueLockedRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueLockedRef.current = queueLocked; }, [queueLocked]);

  useEffect(() => {
    applyThemeFromStorage();
    if (!sessionStorage.getItem("mq-admin")) { router.push("/admin/login"); return; }
    try {
      const n = localStorage.getItem("mq-notes"); if (n) setNotes(JSON.parse(n));
      const t = localStorage.getItem("mq-tags");  if (t) setPatientTags(JSON.parse(t));
      const v = localStorage.getItem("mq-vitals"); if (v) setVitals(JSON.parse(v));
    } catch {}
    window.addEventListener("storage", applyThemeFromStorage);
    return () => window.removeEventListener("storage", applyThemeFromStorage);
  }, []);

  function addToast(message:string, type:Toast["type"]) {
    const id = toastId.current++;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/queue");
      const data = await res.json();
      const newIds = data.queue.map((p:Patient) => p.id);
      const addedIds = newIds.filter((id:number) => !prevQueueIds.current.includes(id));
      addedIds.forEach((id:number) => {
        const p = data.queue.find((x:Patient) => x.id===id);
        if (p?.priority===5) { addToast(`⚠️ CRITICAL: ${p.name} — ${p.condition}`, "critical"); setCriticalAlert(true); playAlarm(); setTimeout(()=>setCriticalAlert(false),2500); }
      });
      prevQueueIds.current = newIds;
      if (data.analytics.boostEvents.length > prevBoostCount.current) {
        const latest = data.analytics.boostEvents[0];
        addToast(`🔄 Priority boosted: ${latest.patientName}`, "boost");
        setNewBoost(true); setTimeout(()=>setNewBoost(false),2000);
      }
      prevBoostCount.current = data.analytics.boostEvents.length;
      setQueue(data.queue); setTreated(data.treated); setAnalytics(data.analytics);
    } catch {}
  }, []);

  useEffect(() => { fetchQueue(); const t = setInterval(fetchQueue, 3000); return () => clearInterval(t); }, [fetchQueue]);

  async function treatNext() {
    try {
      const res = await fetch("/api/queue", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({}) });
      if (res.ok) { const data = await res.json(); if (data.treatedPatient) { playTreatSound(); addToast(`🏥 Discharged: ${data.treatedPatient.name}`, "treat"); fetchQueue(); } }
    } catch {}
  }

  async function applyOverride() {
    if (!overrideId) return;
    try {
      await fetch("/api/queue", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ override:true, id:overrideId, newPriority:Number(overridePriority), reason:overrideReason||"Doctor override" }) });
      fetchQueue(); setOverrideId(null); setOverrideReason(""); addToast("Priority overridden", "boost");
    } catch {}
  }

  async function removePatient(id:number) {
    try {
      await fetch("/api/queue", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id }) });
      fetchQueue(); addToast("Patient removed from queue", "clear");
    } catch {}
  }

  function saveNote(patientId:number) {
    const updated = { ...notes, [patientId]: noteDraft };
    setNotes(updated);
    try { localStorage.setItem("mq-notes", JSON.stringify(updated)); } catch {}
    setNoteOpen(null); addToast("Note saved", "note");
  }

  function saveVitals(patientId:number) {
    const updated = { ...vitals, [patientId]: vitalsDraft };
    setVitals(updated);
    try { localStorage.setItem("mq-vitals", JSON.stringify(updated)); } catch {}
    setVitalsOpen(null); addToast("Vitals saved", "note");
  }

  function toggleTag(patientId:number, tagId:string) {
    const current = patientTags[patientId] ?? [];
    const updated = current.includes(tagId) ? current.filter(t=>t!==tagId) : [...current, tagId];
    const next = { ...patientTags, [patientId]: updated };
    setPatientTags(next);
    try { localStorage.setItem("mq-tags", JSON.stringify(next)); } catch {}
  }

  async function callToCounter(p: Patient) {
    if (!p.patientUserId) { addToast("⚠️ Patient has no portal account linked", "critical"); return; }
    setCallingPatient(p.id);
    try {
      await fetch("/api/notify", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ patientUserId: p.patientUserId, message: `🔔 ${p.name}, please proceed to the counter now. Your token is ready.` }),
      });
      addToast(`🔔 Called ${p.name} to counter`, "notify");
    } catch { addToast("Failed to notify patient", "critical"); }
    setTimeout(() => setCallingPatient(null), 2000);
  }

  function sendSms(p: Patient) {
    setSmsOpen(p);
    setSmsDraft(`Dear ${p.name}, your queue position has been updated. Please proceed to the reception desk at your earliest convenience. — MediQueue`);
  }

  function toggleLock() {
    const next = !queueLocked; setQueueLocked(next);
    addToast(next ? "🔒 Queue locked" : "🔓 Queue unlocked", "lock");
  }

  // New function: Reset for new day
  async function resetForNewDay() {
    if (!confirm('⚠️ START NEW DAY?\n\nThis will clear ALL:\n- Patients in queue\n- Treated patients\n- Patient users\n- Visit history\n- Boost events\n\nToken numbers will reset to 1.\n\nThis cannot be undone! Are you sure?')) {
      return;
    }
    
    setResettingDay(true);
    try {
      const res = await fetch('/api/reset-day', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        addToast('🌅 New day started! All data cleared. Token numbers reset.', 'clear');
        fetchQueue(); // Refresh the dashboard
      } else {
        addToast('Failed to reset day', 'critical');
      }
    } catch (error) {
      addToast('Error resetting day', 'critical');
    }
    setResettingDay(false);
  }

  async function clearQueue() {
    setClearingLoading(true);
    try {
      const res = await fetch("/api/queue/clear", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ type:"queue" }) });
      if (res.ok) { fetchQueue(); addToast("🗑️ Queue cleared", "delete"); } else addToast("Failed to clear queue", "critical");
    } catch { addToast("Error clearing queue", "critical"); }
    setClearingLoading(false); setConfirmClear(null);
  }

  async function clearTreated() {
    setClearingLoading(true);
    try {
      const res = await fetch("/api/queue/clear", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ type:"treated" }) });
      if (res.ok) { setTreated([]); setAnalytics(prev=>({...prev,totalTreated:0,treatmentLog:[]})); fetchQueue(); addToast("🗑️ Treated cleared", "delete"); } else addToast("Failed", "critical");
    } catch { addToast("Error", "critical"); }
    setClearingLoading(false); setConfirmClear(null);
  }

  async function clearBoosts() {
    setClearingLoading(true);
    try {
      const res = await fetch("/api/queue/clear", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ type:"boosts" }) });
      if (res.ok) { setAnalytics(prev=>({...prev,boostEvents:[]})); prevBoostCount.current=0; fetchQueue(); addToast("🗑️ Boosts cleared", "delete"); } else addToast("Failed", "critical");
    } catch { addToast("Error", "critical"); }
    setClearingLoading(false); setConfirmClear(null);
  }

  function exportReport() {
    setExportLoading(true);
    try {
      const rows = [
        ["Name","Condition","Severity","Severity Level","Wait (s)","Treated At","Boosted","Notes","Tags","Vitals BP","Vitals Pulse","Vitals Temp"],
        ...treated.map(p => [p.name,p.condition,p.priority,SEV[p.priority].label,p.waitSeconds,p.treatedAt?new Date(p.treatedAt).toLocaleString():"",p.boosted?"Yes":"No",notes[p.id]||"",(patientTags[p.id]||[]).join("|"),vitals[p.id]?.bp||"",vitals[p.id]?.pulse||"",vitals[p.id]?.temp||""]),
        ...queue.map(p => [p.name,p.condition,p.priority,SEV[p.priority].label,p.waitSeconds,"In Queue",p.boosted?"Yes":"No",notes[p.id]||"",(patientTags[p.id]||[]).join("|"),vitals[p.id]?.bp||"",vitals[p.id]?.pulse||"",vitals[p.id]?.temp||""])
      ];
      const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
      const blob = new Blob([csv],{type:"text/csv"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download=`mediqueue-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
      addToast("📊 Report exported", "export");
    } catch { addToast("Export failed","critical"); }
    setExportLoading(false);
  }

  function logout() { sessionStorage.removeItem("mq-admin"); router.push("/admin/login"); }

  const sevCounts = [5,4,3,2,1].map(s => ({ s, count: analytics.treatmentLog.filter(t=>t.severity===s).length }));
  const maxCount = Math.max(...sevCounts.map(x=>x.count), 1);
  const pieData = [5,4,3,2,1].map((s,i) => ({ label:SEV[s].label, value:analytics.treatmentLog.filter(t=>t.severity===s).length, color:PIE_COLORS[i] }));
  const filteredTreated = treated.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.condition.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Space+Grotesk:wght@300;400;500;600;700&family=Great+Vibes&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        :root{--pure-black:#000;--gold-primary:#D4AF37;--gold-light:#F3D572;--gold-dark:#B38F2F;--gold-glow:rgba(212,175,55,0.3);--bg-primary:#fff;--bg-secondary:#f5f5f5;--text-primary:#000;--text-secondary:#333;--card-bg:rgba(255,255,255,0.95);--border-color:rgba(0,0,0,0.1);--input-bg:rgba(0,0,0,0.02);--surface:#fff;--surface2:#f8f8f8;--surface3:#f0f0f0;--border:#e5e5e5;--gray-mid:#888;}
        [data-theme="dark"]{--bg-primary:#000;--bg-secondary:#0a0a0a;--text-primary:#fff;--text-secondary:#e5e5e5;--card-bg:rgba(10,10,10,0.95);--border-color:rgba(212,175,55,0.2);--input-bg:rgba(255,255,255,0.05);--surface:#0a0a0a;--surface2:#111;--surface3:#1a1a1a;--border:#222;--gray-mid:#888;}
        body{background:var(--bg-primary);font-family:'Space Grotesk',sans-serif;color:var(--text-primary);transition:background 0.3s;}
        .bg-orb{position:fixed;border-radius:50%;filter:blur(100px);opacity:0.2;pointer-events:none;z-index:0;animation:float 20s ease-in-out infinite;}
        [data-theme="light"] .bg-orb{opacity:0.1;}
        .orb-1{width:60vw;height:60vw;background:radial-gradient(circle,var(--gold-primary),transparent);top:-20%;right:-20%;}
        .orb-2{width:50vw;height:50vw;background:radial-gradient(circle,rgba(212,175,55,0.3),transparent);bottom:-30%;left:-20%;}
        .orb-3{width:40vw;height:40vw;background:radial-gradient(circle,rgba(232,80,58,0.15),transparent);top:50%;left:50%;transform:translate(-50%,-50%);animation-delay:-5s;}
        @keyframes float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(3%,-3%) scale(1.02)}}
        @keyframes slaPulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .app{position:relative;z-index:1;max-width:1400px;margin:0 auto;padding:16px 20px;}
        .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--border-color);flex-wrap:wrap;gap:16px;}
        .wordmark{font-family:'Great Vibes',cursive;font-size:32px;background:linear-gradient(135deg,var(--gold-primary),var(--gold-light));-webkit-background-clip:text;background-clip:text;color:transparent;}
        .tagline{font-size:9px;color:var(--gray-mid);letter-spacing:2px;text-transform:uppercase;margin-top:4px;}
        .header-right{display:flex;gap:12px;align-items:center;flex-wrap:wrap;}
        .status-pill{display:flex;align-items:center;gap:8px;background:rgba(58,170,110,0.1);border:1px solid rgba(58,170,110,0.3);padding:6px 14px;border-radius:100px;font-size:11px;font-weight:500;color:#3aaa6e;}
        .status-dot{width:8px;height:8px;border-radius:50%;background:#3aaa6e;box-shadow:0 0 8px #3aaa6e;animation:breathe 2s ease-in-out infinite;}
        @keyframes breathe{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.8)}}
        .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;}
        @media(max-width:768px){.stats-row{grid-template-columns:repeat(2,1fr)}}
        .stat-card{background:var(--card-bg);backdrop-filter:blur(10px);border:1px solid var(--border-color);border-radius:20px;padding:20px;transition:all 0.3s;}
        .stat-card:hover{transform:translateY(-2px);border-color:var(--gold-primary);}
        .stat-card.critical{border-color:#e8503a;animation:criticalPulse 1.5s ease-in-out infinite;}
        @keyframes criticalPulse{0%,100%{box-shadow:0 0 0 0 rgba(232,80,58,0.2)}50%{box-shadow:0 0 0 8px rgba(232,80,58,0)}}
        .stat-value{font-family:'Playfair Display',serif;font-size:36px;font-weight:700;color:var(--gold-primary);line-height:1;}
        .stat-value.danger{color:#e8503a;}
        .stat-label{font-size:10px;font-weight:600;color:var(--gray-mid);letter-spacing:1px;text-transform:uppercase;margin-top:8px;}
        .dashboard-layout{display:grid;grid-template-columns:280px 1fr;gap:20px;align-items:start;}
        @media(max-width:900px){.dashboard-layout{grid-template-columns:1fr}}
        .sidebar-card{background:var(--card-bg);border:1px solid var(--border-color);border-radius:20px;overflow:hidden;margin-bottom:20px;}
        .card-header{padding:14px 18px;background:rgba(212,175,55,0.03);border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:8px;}
        .card-dot{width:6px;height:6px;border-radius:50%;background:var(--gold-primary);box-shadow:0 0 8px var(--gold-glow);}
        .card-title{font-size:11px;font-weight:700;color:var(--gold-primary);letter-spacing:2px;text-transform:uppercase;}
        .card-body{padding:16px;}
        .queue-control-btn{width:100%;padding:10px;border-radius:12px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;margin-bottom:8px;border:1px solid;font-family:'Space Grotesk',sans-serif;}
        .queue-control-btn.lock{background:rgba(212,135,58,0.1);color:#d4873a;border-color:rgba(212,135,58,0.3);}
        .queue-control-btn.clear{background:rgba(232,80,58,0.1);color:#e8503a;border-color:rgba(232,80,58,0.3);}
        .queue-control-btn.export{background:rgba(58,130,196,0.1);color:#3a82c4;border-color:rgba(58,130,196,0.3);}
        .queue-control-btn.newday{background:rgba(212,175,55,0.1);color:#c4a832;border-color:rgba(212,175,55,0.3);}
        .tabs{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;}
        .tab{padding:8px 18px;background:var(--card-bg);border:1px solid var(--border-color);border-radius:50px;font-size:12px;font-weight:600;color:var(--text-secondary);cursor:pointer;transition:all 0.2s;}
        .tab.active{background:linear-gradient(135deg,var(--gold-primary),var(--gold-dark));color:#000;border-color:transparent;}
        .patient-list{max-height:calc(100vh - 180px);overflow-y:auto;display:flex;flex-direction:column;gap:8px;}
        .patient-list::-webkit-scrollbar{width:4px;}
        .patient-list::-webkit-scrollbar-thumb{background:var(--gold-primary);border-radius:4px;}
        .patient-card{background:var(--card-bg);border:1px solid var(--border-color);border-radius:12px;padding:8px 12px;display:flex;align-items:flex-start;gap:10px;transition:all 0.2s;position:relative;}
        .patient-card:hover{transform:translateX(4px);border-color:var(--gold-primary);}
        .patient-card.sla-breach{box-shadow:0 0 12px rgba(232,80,58,0.25);border-color:rgba(232,80,58,0.4);}
        .patient-position{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--gray-mid);min-width:32px;text-align:center;padding-top:2px;}
        .patient-position.first{color:#e8503a;}
        .patient-info{flex:1;min-width:0;}
        .patient-name{font-size:13px;font-weight:700;color:var(--text-primary);}
        .patient-condition{font-size:10px;color:var(--text-secondary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .patient-tags-row{display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;align-items:center;}
        .priority-tag{padding:2px 6px;border-radius:100px;font-size:8px;font-weight:600;white-space:nowrap;}
        .patient-note-preview{font-size:9px;color:var(--gold-primary);margin-top:3px;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px;}
        .patient-vitals-preview{font-size:9px;color:var(--gray-mid);margin-top:2px;}
        .patient-actions{display:flex;gap:4px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;padding-top:2px;}
        .action-btn{padding:4px 8px;border-radius:6px;font-size:9px;font-weight:600;cursor:pointer;transition:all 0.2s;border:1px solid var(--border-color);background:var(--surface2);color:var(--text-secondary);white-space:nowrap;font-family:'Space Grotesk',sans-serif;}
        .action-btn:hover{border-color:var(--gold-primary);color:var(--gold-primary);}
        .action-btn.treat{background:rgba(58,170,110,0.1);color:#3aaa6e;border-color:rgba(58,170,110,0.3);}
        .action-btn.call{background:rgba(212,175,55,0.1);color:var(--gold-primary);border-color:rgba(212,175,55,0.3);}
        .action-btn.call.calling{animation:callPulse 0.6s ease-in-out infinite;}
        @keyframes callPulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;}
        .modal{background:var(--card-bg);border:1px solid var(--border-color);border-radius:24px;padding:24px;max-width:420px;width:100%;}
        .modal-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--text-primary);margin-bottom:18px;}
        .field-label{display:block;font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;}
        .field-input{width:100%;padding:10px 14px;background:var(--input-bg);border:1px solid var(--border-color);border-radius:10px;color:var(--text-primary);font-size:13px;outline:none;font-family:'Space Grotesk',sans-serif;}
        .vitals-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;}
        .vitals-field label{font-size:10px;color:var(--gray-mid);display:block;margin-bottom:4px;}
        .toast-stack{position:fixed;bottom:20px;right:20px;z-index:1000;display:flex;flex-direction:column;gap:8px;}
        .toast{padding:10px 18px;border-radius:10px;background:var(--card-bg);backdrop-filter:blur(10px);border:1px solid;font-size:12px;font-weight:500;animation:slideIn 0.3s ease;}
        @keyframes slideIn{from{opacity:0;transform:translateX(100px)}to{opacity:1;transform:translateX(0)}}
        .treat-next-btn{width:100%;margin-bottom:16px;padding:12px;background:linear-gradient(135deg,#e8503a,#b53a1a);color:white;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;font-family:'Space Grotesk',sans-serif;}
        .treat-next-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 4px 20px rgba(232,80,58,0.4);}
        .treat-next-btn:disabled{opacity:0.5;cursor:not-allowed;}
        .empty-state{text-align:center;padding:40px 20px;color:var(--gray-mid);}
        .empty-icon{font-size:40px;margin-bottom:10px;}
        .tag-chip{padding:4px 10px;border-radius:100px;font-size:9px;font-weight:600;cursor:pointer;border:1px solid;transition:all 0.15s;}
      `}</style>

      <div className="bg-orb orb-1"/><div className="bg-orb orb-2"/><div className="bg-orb orb-3"/>

      {/* Toast Stack */}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className="toast" style={{ borderColor: t.type==="critical"||t.type==="delete"?"#e8503a":t.type==="treat"?"#3aaa6e":t.type==="boost"?"#c4a832":t.type==="notify"?"#3a82c4":"var(--gold-primary)", color: t.type==="critical"||t.type==="delete"?"#e8503a":t.type==="treat"?"#3aaa6e":t.type==="boost"?"#c4a832":t.type==="notify"?"#3a82c4":"var(--gold-primary)" }}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Critical Alert */}
      {criticalAlert && (
        <div style={{ position:"fixed",inset:0,background:"rgba(232,80,58,0.95)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeOut 2.5s forwards",pointerEvents:"none" }}>
          <style>{`@keyframes fadeOut{0%{opacity:1}70%{opacity:1}100%{opacity:0;visibility:hidden}}`}</style>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:70,marginBottom:12 }}>⚠️</div>
            <div style={{ fontSize:28,fontWeight:700,color:"white",fontFamily:"'Playfair Display',serif" }}>CRITICAL PATIENT</div>
            <div style={{ fontSize:14,color:"rgba(255,255,255,0.9)",marginTop:10 }}>Immediate attention required</div>
          </div>
        </div>
      )}

      {/* Confirm Clear Modal */}
      {confirmClear && (
        <div className="modal-overlay" onClick={()=>setConfirmClear(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">{confirmClear==="queue"?"Clear Queue?":confirmClear==="treated"?"Clear Treated?":"Clear Boosts?"}</div>
            <p style={{ marginBottom:24,color:"var(--text-secondary)",fontSize:13 }}>This action cannot be undone and will delete from database.</p>
            <div style={{ display:"flex",gap:12 }}>
              <button className="queue-control-btn" style={{ flex:1,background:"transparent" }} onClick={()=>setConfirmClear(null)}>Cancel</button>
              <button className="queue-control-btn" style={{ flex:1,background:"rgba(232,80,58,0.15)",color:"#e8503a" }} onClick={()=>{ if(confirmClear==="queue")clearQueue(); if(confirmClear==="treated")clearTreated(); if(confirmClear==="boosts")clearBoosts(); }} disabled={clearingLoading}>{clearingLoading?"Clearing...":"Yes, Clear"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {overrideId!==null && (
        <div className="modal-overlay" onClick={()=>setOverrideId(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Priority Override</div>
            <div style={{ marginBottom:16 }}>
              <label className="field-label">New Priority</label>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8 }}>
                {[1,2,3,4,5].map(p=>(
                  <button key={p} onClick={()=>setOverridePriority(String(p))} style={{ padding:8,borderRadius:8,background:overridePriority===String(p)?SEV[p].bg:"transparent",border:`1px solid ${overridePriority===String(p)?SEV[p].color:"var(--border-color)"}`,color:SEV[p].color,cursor:"pointer",fontSize:12 }}>P{p}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label className="field-label">Reason</label>
              <input className="field-input" placeholder="Reason..." value={overrideReason} onChange={e=>setOverrideReason(e.target.value)}/>
            </div>
            <div style={{ display:"flex",gap:12 }}>
              <button className="queue-control-btn" style={{ flex:1,background:"transparent" }} onClick={()=>setOverrideId(null)}>Cancel</button>
              <button className="queue-control-btn" style={{ flex:1,background:"linear-gradient(135deg,var(--gold-primary),var(--gold-dark))",color:"#000" }} onClick={applyOverride}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {noteOpen!==null && (
        <div className="modal-overlay" onClick={()=>setNoteOpen(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Clinical Note</div>
            <textarea className="field-input" style={{ minHeight:100,marginBottom:20,resize:"vertical" }} placeholder="Add clinical notes..." value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} autoFocus/>
            <div style={{ display:"flex",gap:12 }}>
              <button className="queue-control-btn" style={{ flex:1,background:"transparent" }} onClick={()=>setNoteOpen(null)}>Cancel</button>
              <button className="queue-control-btn" style={{ flex:1,background:"linear-gradient(135deg,var(--gold-primary),var(--gold-dark))",color:"#000" }} onClick={()=>saveNote(noteOpen)}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Vitals Modal */}
      {vitalsOpen!==null && (
        <div className="modal-overlay" onClick={()=>setVitalsOpen(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">🩺 Quick Vitals</div>
            <div className="vitals-grid">
              <div className="vitals-field">
                <label>Blood Pressure</label>
                <input className="field-input" placeholder="120/80" value={vitalsDraft.bp} onChange={e=>setVitalsDraft(v=>({...v,bp:e.target.value}))}/>
              </div>
              <div className="vitals-field">
                <label>Pulse (bpm)</label>
                <input className="field-input" placeholder="72" value={vitalsDraft.pulse} onChange={e=>setVitalsDraft(v=>({...v,pulse:e.target.value}))}/>
              </div>
              <div className="vitals-field">
                <label>Temp (°C)</label>
                <input className="field-input" placeholder="37.0" value={vitalsDraft.temp} onChange={e=>setVitalsDraft(v=>({...v,temp:e.target.value}))}/>
              </div>
            </div>
            <div style={{ display:"flex",gap:12 }}>
              <button className="queue-control-btn" style={{ flex:1,background:"transparent" }} onClick={()=>setVitalsOpen(null)}>Cancel</button>
              <button className="queue-control-btn" style={{ flex:1,background:"linear-gradient(135deg,var(--gold-primary),var(--gold-dark))",color:"#000" }} onClick={()=>saveVitals(vitalsOpen)}>Save Vitals</button>
            </div>
          </div>
        </div>
      )}

      {/* Tags Modal */}
      {tagsOpen!==null && (
        <div className="modal-overlay" onClick={()=>setTagsOpen(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">🏷️ Patient Tags</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:10,marginBottom:24 }}>
              {PATIENT_TAGS.map(tag => {
                const active = (patientTags[tagsOpen]??[]).includes(tag.id);
                return (
                  <button key={tag.id} className="tag-chip" onClick={()=>toggleTag(tagsOpen,tag.id)} style={{ background:active?`${tag.color}22`:"transparent", color:tag.color, borderColor:active?tag.color:"var(--border-color)", transform:active?"scale(1.05)":"scale(1)" }}>
                    {tag.label}
                  </button>
                );
              })}
            </div>
            <button className="queue-control-btn" style={{ background:"linear-gradient(135deg,var(--gold-primary),var(--gold-dark))",color:"#000" }} onClick={()=>setTagsOpen(null)}>Done</button>
          </div>
        </div>
      )}

      {/* SMS Modal */}
      {smsOpen!==null && (
        <div className="modal-overlay" onClick={()=>setSmsOpen(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">📱 SMS Notification</div>
            <div style={{ marginBottom:8,fontSize:11,color:"var(--gray-mid)" }}>To: {smsOpen.name} {smsOpen.patientUserId ? `(Portal User #${smsOpen.patientUserId})` : "(No portal account)"}</div>
            <textarea className="field-input" style={{ minHeight:100,marginBottom:20,resize:"vertical" }} value={smsDraft} onChange={e=>setSmsDraft(e.target.value)}/>
            <div style={{ padding:"10px 14px",background:"rgba(58,130,196,0.08)",border:"1px solid rgba(58,130,196,0.25)",borderRadius:10,marginBottom:20,fontSize:11,color:"#3a82c4" }}>
              ℹ️ SMS sending is a placeholder. Integrate with Twilio or similar to enable real SMS delivery.
            </div>
            <div style={{ display:"flex",gap:12 }}>
              <button className="queue-control-btn" style={{ flex:1,background:"transparent" }} onClick={()=>setSmsOpen(null)}>Cancel</button>
              <button className="queue-control-btn" style={{ flex:1,background:"rgba(58,130,196,0.15)",color:"#3a82c4",borderColor:"rgba(58,130,196,0.3)" }} onClick={()=>{ addToast(`📱 SMS sent to ${smsOpen!.name} (placeholder)`, "notify"); setSmsOpen(null); }}>Send SMS</button>
            </div>
          </div>
        </div>
      )}

      <div className="app">
        {/* Header */}
        <div className="header">
          <div>
            <div className="wordmark">MediQueue+</div>
            <div className="tagline">Admin Dashboard · AI-Powered Triage</div>
          </div>
          <div className="header-right">
            <Link href="/" style={{ fontSize:12,color:"var(--text-secondary)",textDecoration:"none",padding:"6px 12px",borderRadius:8 }}>🏠 Home</Link>
            <div className="status-pill"><span className="status-dot"/><span>Live</span></div>
            <button onClick={logout} style={{ padding:"6px 16px",borderRadius:100,fontSize:11,fontWeight:600,border:"1px solid #e8503a",color:"#e8503a",background:"transparent",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif" }}>🚪 Logout</button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{queue.length}</div>
            <div className="stat-label">Active Queue</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color:"#3aaa6e" }}>{analytics.totalTreated}</div>
            <div className="stat-label">Treated Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{analytics.boostEvents.length}</div>
            <div className="stat-label">Priority Boosts</div>
          </div>
          <div className="stat-card">
            {queue[0] ? (
              <>
                <div style={{ fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:SEV[queue[0].priority].color }}>{SEV[queue[0].priority].label}</div>
                <div style={{ fontSize:14,fontWeight:600,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{queue[0].name}</div>
                <div style={{ fontSize:11,color:"var(--text-secondary)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{queue[0].condition}</div>
              </>
            ) : (
              <div style={{ fontFamily:"'Playfair Display',serif",fontSize:20,color:"var(--gray-mid)" }}>No patients</div>
            )}
            <div className="stat-label">Next Patient</div>
          </div>
        </div>

        {/* Lock Banner */}
        {queueLocked && (
          <div style={{ background:"rgba(212,135,58,0.1)",border:"1px solid rgba(212,135,58,0.3)",borderRadius:12,padding:"10px 16px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <span style={{ fontSize:12,color:"#d4873a" }}>🔒 Queue is locked — new admissions paused</span>
            <button onClick={toggleLock} style={{ padding:"5px 14px",background:"rgba(212,135,58,0.15)",border:"1px solid rgba(212,135,58,0.4)",borderRadius:50,color:"#d4873a",cursor:"pointer",fontSize:11 }}>Unlock</button>
          </div>
        )}

        <div className="dashboard-layout">
          {/* Sidebar */}
          <div>
            <div className="sidebar-card">
              <div className="card-header"><div className="card-dot"/><div className="card-title">🛠️ Queue Management</div></div>
              <div className="card-body">
                <button className="queue-control-btn lock" onClick={toggleLock}>{queueLocked?"🔓 Unlock Queue":"🔒 Lock Queue"}</button>
                <button className="queue-control-btn export" onClick={exportReport} disabled={exportLoading}>📥 Export CSV Report</button>
                <button className="queue-control-btn newday" onClick={resetForNewDay} disabled={resettingDay}>🌅 Start New Day</button>
                <button className="queue-control-btn clear" onClick={()=>setConfirmClear("queue")} disabled={queue.length===0}>🗑️ Clear Queue ({queue.length})</button>
                <button className="queue-control-btn clear" onClick={()=>setConfirmClear("treated")} disabled={treated.length===0}>🗑️ Clear Treated ({treated.length})</button>
                <button className="queue-control-btn clear" onClick={()=>setConfirmClear("boosts")} disabled={analytics.boostEvents.length===0}>🗑️ Clear Boosts ({analytics.boostEvents.length})</button>
                <div style={{ marginTop:12,padding:10,background:"var(--surface2)",borderRadius:10 }}>
                  <div style={{ fontSize:10,color:"var(--gray-mid)",marginBottom:5 }}>Quick Stats</div>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}><span>Total patients:</span><span style={{ fontWeight:600 }}>{queue.length+treated.length}</span></div>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginTop:4 }}><span>Critical:</span><span style={{ color:"#e8503a",fontWeight:600 }}>{queue.filter(p=>p.priority===5).length}</span></div>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginTop:4 }}><span>SLA breaches:</span><span style={{ color:"#e8503a",fontWeight:600 }}>{queue.filter(p=>Math.floor((Date.now()-p.enqueuedAt)/1000)>=SEV[p.priority].slaSecs).length}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div>
            <div className="tabs">
              {(["queue","treated","analytics","starvation"] as const).map(t=>(
                <button key={t} className={`tab ${activeTab===t?"active":""}`} onClick={()=>setActiveTab(t)}>
                  {t==="queue"?`📋 Queue (${queue.length})`:t==="treated"?`✅ Treated (${treated.length})`:t==="analytics"?"📊 Analytics":`🔄 Boosts (${analytics.boostEvents.length})`}
                </button>
              ))}
            </div>

            {/* Queue Tab */}
            {activeTab==="queue" && (
              <>
                <button className="treat-next-btn" onClick={treatNext} disabled={queue.length===0}>🏥 Treat Next Patient</button>
                <div className="patient-list">
                  {queue.length===0 ? (
                    <div className="empty-state"><div className="empty-icon">🏥</div><div>Queue is empty</div></div>
                  ) : (
                    queue.map((p,i) => {
                      const isSlaBreached = Math.floor((Date.now()-p.enqueuedAt)/1000) >= SEV[p.priority].slaSecs;
                      const pTags = patientTags[p.id] ?? [];
                      const pVitals = vitals[p.id];
                      const pNote = notes[p.id];
                      return (
                        <div key={p.id} className={`patient-card ${isSlaBreached?"sla-breach":""}`} style={{ borderLeft:`3px solid ${SEV[p.priority].color}` }}>
                          <div className={`patient-position ${i===0?"first":""}`}>{i+1}</div>
                          <div className="patient-info">
                            <div className="patient-name">{p.name}</div>
                            <div className="patient-condition">{p.condition}</div>
                            <div className="patient-tags-row">
                              <span className="priority-tag" style={{ background:SEV[p.priority].bg,color:SEV[p.priority].color,border:`1px solid ${SEV[p.priority].border}` }}>{SEV[p.priority].short}</span>
                              <span className="priority-tag" style={{ background:"var(--surface2)",color:"var(--gray-mid)" }}><LiveWaitUp enqueuedAt={p.enqueuedAt} priority={p.priority}/></span>
                              <SlaBadge enqueuedAt={p.enqueuedAt} priority={p.priority}/>
                              {p.boosted && <span className="priority-tag" style={{ background:"rgba(196,168,50,0.1)",color:"#c4a832" }}>↑ Boosted</span>}
                              {pTags.map(tid => { const tag=PATIENT_TAGS.find(t=>t.id===tid); return tag?<span key={tid} className="priority-tag" style={{ background:`${tag.color}22`,color:tag.color,border:`1px solid ${tag.color}44` }}>{tag.label}</span>:null; })}
                            </div>
                            {pNote && <div className="patient-note-preview">📝 {pNote}</div>}
                            {pVitals && (pVitals.bp||pVitals.pulse||pVitals.temp) && (
                              <div className="patient-vitals-preview">
                                {pVitals.bp&&`BP: ${pVitals.bp}`}{pVitals.bp&&pVitals.pulse?" · ":""}{pVitals.pulse&&`♥ ${pVitals.pulse}bpm`}{(pVitals.bp||pVitals.pulse)&&pVitals.temp?" · ":""}{pVitals.temp&&`🌡️ ${pVitals.temp}°C`}
                              </div>
                            )}
                          </div>
                          <div className="patient-actions">
                            <button className="action-btn treat" onClick={async()=>{ await fetch("/api/queue",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({treatById:p.id})}); fetchQueue(); addToast(`Treated: ${p.name}`,"treat"); playTreatSound(); }}>Treat</button>
                            <button className={`action-btn call ${callingPatient===p.id?"calling":""}`} onClick={()=>callToCounter(p)}>{callingPatient===p.id?"Calling...":"📢 Call"}</button>
                            <button className="action-btn" onClick={()=>{ setVitalsOpen(p.id); setVitalsDraft(vitals[p.id]??{bp:"",pulse:"",temp:""}); }}>🩺</button>
                            <button className="action-btn" onClick={()=>setTagsOpen(p.id)}>🏷️</button>
                            <button className="action-btn" onClick={()=>sendSms(p)}>📱</button>
                            <button className="action-btn" onClick={()=>{ setOverrideId(p.id); setOverridePriority(String(p.priority)); setOverrideReason(""); }}>Override</button>
                            <button className="action-btn" onClick={()=>{ setNoteOpen(p.id); setNoteDraft(notes[p.id]||""); }}>Note</button>
                            <button className="action-btn" onClick={()=>removePatient(p.id)}>Remove</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* Treated Tab */}
            {activeTab==="treated" && (
              <>
                <input className="field-input" placeholder="🔍 Search patients..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} style={{ marginBottom:14 }}/>
                <div className="patient-list">
                  {filteredTreated.length===0 ? (
                    <div className="empty-state"><div className="empty-icon">✅</div><div>No treated patients found</div></div>
                  ) : (
                    filteredTreated.map(p=>(
                      <div key={p.id} className="patient-card">
                        <div style={{ width:28,height:28,borderRadius:"50%",background:SEV[p.priority].bg,display:"flex",alignItems:"center",justifyContent:"center",color:SEV[p.priority].color,fontSize:12,flexShrink:0 }}>✓</div>
                        <div className="patient-info">
                          <div className="patient-name">{p.name}</div>
                          <div className="patient-condition">{p.condition}</div>
                          <div className="patient-tags-row">
                            <span className="priority-tag" style={{ background:SEV[p.priority].bg,color:SEV[p.priority].color }}>{SEV[p.priority].short}</span>
                            <span className="priority-tag">⏱️ {p.waitSeconds}s</span>
                            {p.treatedAt&&<span className="priority-tag">🕐 {new Date(p.treatedAt).toLocaleTimeString()}</span>}
                          </div>
                          {notes[p.id]&&<div className="patient-note-preview">📝 {notes[p.id]}</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Analytics Tab */}
            {activeTab==="analytics" && (
              <div className="patient-list">
                <div style={{ marginBottom:20 }}>
                  <div className="card-header" style={{ marginBottom:12 }}><div className="card-dot"/><div className="card-title">Treatments by Severity</div></div>
                  {sevCounts.map(({s,count})=>(
                    <div key={s} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:12 }}><span style={{ color:SEV[s].color }}>{SEV[s].label}</span><span>{count}</span></div>
                      <div style={{ height:6,background:"var(--surface3)",borderRadius:3,overflow:"hidden" }}><div style={{ width:`${(count/maxCount)*100}%`,height:"100%",background:SEV[s].color,borderRadius:3 }}/></div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom:20 }}>
                  <div className="card-header" style={{ marginBottom:12 }}><div className="card-dot"/><div className="card-title">Distribution</div></div>
                  <PieChart data={pieData}/>
                </div>
                <div>
                  <div className="card-header" style={{ marginBottom:12 }}><div className="card-dot"/><div className="card-title">Recent Treatments</div></div>
                  {analytics.treatmentLog.slice(0,8).map((t,i)=>(
                    <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border-color)",fontSize:12 }}>
                      <span style={{ fontWeight:600 }}>{t.name}</span>
                      <span style={{ color:SEV[t.severity].color }}>{SEV[t.severity].short}</span>
                      <span style={{ color:"var(--gray-mid)" }}>{t.waitSeconds}s</span>
                      <span style={{ fontSize:10,color:"var(--gray-mid)" }}>{new Date(t.time).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Boosts Tab */}
            {activeTab==="starvation" && (
              <div className="patient-list">
                <div style={{ background:"rgba(196,168,50,0.1)",border:"1px solid rgba(196,168,50,0.3)",borderRadius:12,padding:14,marginBottom:16 }}>
                  <div style={{ fontWeight:700,color:"#c4a832",marginBottom:6,fontSize:13 }}>⚡ Starvation Prevention Active</div>
                  <div style={{ fontSize:11,color:"var(--text-secondary)" }}>Patients waiting over 20 seconds automatically receive a +1 priority boost.</div>
                </div>
                {analytics.boostEvents.length===0 ? (
                  <div className="empty-state"><div className="empty-icon">🔄</div><div>No boost events yet</div></div>
                ) : (
                  analytics.boostEvents.map((ev,i)=>(
                    <div key={i} style={{ padding:10,background:"var(--surface2)",borderRadius:10,marginBottom:8 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                        <span style={{ fontWeight:600,fontSize:12 }}>{ev.patientName}</span>
                        <span style={{ fontSize:10,color:"var(--gray-mid)" }}>{new Date(ev.time).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:11 }}>
                        <span style={{ color:SEV[ev.oldPriority]?.color,textDecoration:"line-through" }}>{SEV[ev.oldPriority]?.short}</span>
                        <span>→</span>
                        <span style={{ color:SEV[ev.newPriority]?.color,fontWeight:600 }}>{SEV[ev.newPriority]?.short}</span>
                      </div>
                      <div style={{ fontSize:10,color:"var(--gray-mid)",marginTop:4 }}>{ev.reason}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
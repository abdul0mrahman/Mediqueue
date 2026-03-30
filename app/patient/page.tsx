"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ── Sound Effects ──────────────────────────────────────────────────────────
function playJoinChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination); osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.35, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
      osc.start(ctx.currentTime + i * 0.12); osc.stop(ctx.currentTime + i * 0.12 + 0.4);
    });
  } catch {}
}
function playNextUpAlert() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [880, 1100, 880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination); osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);
      gain.gain.setValueAtTime(0.5, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.15);
      osc.start(ctx.currentTime + i * 0.18); osc.stop(ctx.currentTime + i * 0.18 + 0.15);
    });
  } catch {}
}
function playBoostSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
  } catch {}
}
function haptic(pattern: number | number[]) {
  try { if ("vibrate" in navigator) navigator.vibrate(pattern); } catch {}
}

// ── Severity map ───────────────────────────────────────────────────────────
const SEV: Record<number, { label: string; color: string; bg: string; border: string; glow: string; tip: string; emoji: string }> = {
  5: { label:"Critical", color:"#e8503a", bg:"rgba(232,80,58,0.08)",  border:"rgba(232,80,58,0.25)",  glow:"rgba(232,80,58,0.4)",  tip:"You will be seen immediately.", emoji:"🔴" },
  4: { label:"Severe",   color:"#d4873a", bg:"rgba(212,135,58,0.08)", border:"rgba(212,135,58,0.25)", glow:"rgba(212,135,58,0.4)",  tip:"A nurse will call you within minutes.", emoji:"🟠" },
  3: { label:"Urgent",   color:"#c4a832", bg:"rgba(196,168,50,0.07)", border:"rgba(196,168,50,0.22)", glow:"rgba(196,168,50,0.35)", tip:"Estimated wait under 20 minutes.", emoji:"🟡" },
  2: { label:"Moderate", color:"#3a82c4", bg:"rgba(58,130,196,0.08)", border:"rgba(58,130,196,0.25)", glow:"rgba(58,130,196,0.4)",  tip:"Staff will call you when ready.", emoji:"🔵" },
  1: { label:"Minor",    color:"#3aaa6e", bg:"rgba(58,170,110,0.08)", border:"rgba(58,170,110,0.25)", glow:"rgba(58,170,110,0.4)",  tip:"You may have a short wait.", emoji:"🟢" },
};

// ── Health tips ────────────────────────────────────────────────────────────
const HEALTH_TIPS_DB: { keywords: string[]; tips: string[] }[] = [
  { keywords:["chest","heart","cardiac","palpitation"], tips:["Sit upright — do not lie flat.","Avoid caffeine, food, or water until assessed.","Loosen tight clothing around your chest.","Stay calm — anxiety can worsen chest symptoms.","Tell staff if pain spreads to your arm or jaw."] },
  { keywords:["breath","asthma","wheez","lung","oxygen"], tips:["Sit upright and lean slightly forward.","Avoid perfume or smoke nearby.","Do not exert yourself — sit still.","Use your inhaler if you have one.","Alert staff if lips or fingertips turn blue."] },
  { keywords:["fever","temperature","chill","flu","infection"], tips:["Sip water regularly while waiting.","Remove extra layers if you feel hot.","Do not share food or drink with others.","Paracetamol may help if you've taken it.","Inform staff if temperature rises rapidly."] },
  { keywords:["head","migraine","dizz","vertigo","faint"], tips:["Stay seated — do not stand quickly.","Avoid bright lights and loud sounds.","Do not eat or drink if feeling nauseous.","Rest your head gently against the seat.","Alert staff if you may lose consciousness."] },
  { keywords:["cut","bleed","wound","laceration","injur"], tips:["Keep gentle pressure on the wound.","Elevate the injured limb if possible.","Do not remove embedded objects.","Avoid touching the wound area.","Tell staff if bleeding increases."] },
  { keywords:["stomach","abdomen","nausea","vomit","bowel"], tips:["Do not eat or drink until assessed.","Sit comfortably — avoid lying flat.","A sick bag is at the front desk.","Inform staff if pain becomes severe.","Note when symptoms started and what you last ate."] },
];
function getHealthTips(condition: string): string[] {
  if (!condition) return ["Stay seated and avoid exerting yourself.","Inform staff if your symptoms worsen.","Stay hydrated unless told otherwise.","Keep your phone charged.","Have your ID and medication list ready."];
  const lower = condition.toLowerCase();
  for (const g of HEALTH_TIPS_DB) if (g.keywords.some(k => lower.includes(k))) return g.tips;
  return ["Stay seated and avoid exerting yourself.","Inform staff if your symptoms worsen.","Stay hydrated unless told otherwise.","Keep your phone charged.","Have your ID and medication list ready."];
}

const SYMPTOM_SUGGESTIONS = [
  "Severe chest pain radiating to left arm","Difficulty breathing and shortness of breath",
  "High fever above 39°C with chills","Sudden severe headache and neck stiffness",
  "Deep cut with heavy bleeding","Dizziness and nausea since morning",
  "Mild headache and runny nose","Stomach ache and vomiting",
  "Sprained ankle from a fall","Allergic reaction with skin rash",
  "Back pain after lifting","Ear pain and hearing difficulty",
];
const QUICK_SYMPTOMS = ["Shortness of breath","Chest tightness","Nausea","Dizziness","Headache","Fever/Chills","Vomiting","Blurred vision","Numbness","Palpitations","Back pain","Joint pain","Weakness","Sweating","Confusion"];
const CHAT_QUICK_Qs = ["What should I do while waiting?","What are warning signs?","How does priority work?","Can I eat or drink?","What happens during ER assessment?","How long will I wait?"];

// ── Types ──────────────────────────────────────────────────────────────────
type PatientUser = { id:number; name:string; username:string; age:number; gender:string; bloodType:string; phone:string; emergencyContact:string };
type QueueEntry  = { id:number; patientUserId?:number; priority:number; position:number; waitSeconds:number; boosted:boolean };
type LivePatient = { id:number; name:string; condition?:string; priority:number; waitSeconds:number; boosted:boolean; patientUserId?:number; position:number };
type ChatMsg     = { id:string; role:"user"|"assistant"; content:string; ts:Date; typing?:boolean };

// ── Live wait countdown ────────────────────────────────────────────────────
function LiveWait({ secs }: { secs: number }) {
  const [s, setS] = useState(secs);
  useEffect(() => { setS(secs); }, [secs]);
  useEffect(() => {
    if (s <= 0) return;
    const t = setTimeout(() => setS(v => Math.max(0, v - 1)), 1000);
    return () => clearTimeout(t);
  }, [s]);
  const m = Math.floor(s / 60);
  if (s <= 0) return <span style={{ color:"#3aaa6e", fontWeight:700 }}>Now</span>;
  return <span>{m > 0 ? `${m}m ${String(s % 60).padStart(2,"0")}s` : `${s}s`}</span>;
}

// ── Big countdown clock ────────────────────────────────────────────────────
function BigCountdownClock({ initialSeconds }: { initialSeconds: number }) {
  const [secs, setSecs] = useState(initialSeconds);
  useEffect(() => { setSecs(initialSeconds); }, [initialSeconds]);
  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secs]);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const eta = new Date(Date.now() + secs * 1000);
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:7, color:"var(--gray-mid)", letterSpacing:"2px", textTransform:"uppercase", marginBottom:4 }}>Countdown</div>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:38, color:"var(--gold-primary)", letterSpacing:-1, lineHeight:1 }}>
        {secs <= 0 ? "Now" : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
      </div>
      <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, color:"var(--gray-mid)", marginTop:3 }}>
        ETA {eta.getHours().toString().padStart(2,"0")}:{eta.getMinutes().toString().padStart(2,"0")}
      </div>
    </div>
  );
}

// ── Priority Dial ──────────────────────────────────────────────────────────
function PriorityDial({ priority, prevPriority }: { priority:number; prevPriority:number|null }) {
  const sev = SEV[priority];
  const changed = prevPriority !== null && prevPriority !== priority;
  const wentUp = changed && priority > (prevPriority ?? 0);
  const normalised = (priority - 1) / 4;
  const startAngle = 150; const totalArc = 240;
  const angle = startAngle + normalised * totalArc;
  const rad = (angle - 90) * (Math.PI / 180);
  const cx = 60; const cy = 60; const r = 44;
  const nx = cx + r * Math.cos(rad); const ny = cy + r * Math.sin(rad);
  const arcPath = (from: number, to: number, radius: number) => {
    const f = (from - 90) * Math.PI / 180; const t2 = (to - 90) * Math.PI / 180;
    const x1 = cx + radius * Math.cos(f); const y1 = cy + radius * Math.sin(f);
    const x2 = cx + radius * Math.cos(t2); const y2 = cy + radius * Math.sin(t2);
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${(to - from) > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <div style={{ position:"relative", width:120, height:120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <path d={arcPath(startAngle, startAngle + totalArc, r)} fill="none" stroke="var(--border-color)" strokeWidth="6" strokeLinecap="round"/>
          <path d={arcPath(startAngle, angle, r)} fill="none" stroke={sev.color} strokeWidth="6" strokeLinecap="round"
            style={{ filter:`drop-shadow(0 0 6px ${sev.color})`, transition:"all 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}/>
          <circle cx={nx} cy={ny} r="5" fill={sev.color}
            style={{ filter:`drop-shadow(0 0 8px ${sev.color})`, transition:"all 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}/>
          <text x="60" y="56" textAnchor="middle" fill={sev.color} fontSize="22" fontFamily="'Cormorant Garamond',serif" fontWeight="700">{priority}</text>
          <text x="60" y="70" textAnchor="middle" fill="var(--gray-mid)" fontSize="7" fontFamily="'Montserrat',sans-serif" letterSpacing="1">PRIORITY</text>
        </svg>
        {changed && (
          <div style={{ position:"absolute", top:-4, right:-4, background:wentUp?"#e8503a":"#3aaa6e", color:"#fff", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, animation:"popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)", boxShadow:`0 0 10px ${wentUp?"rgba(232,80,58,0.6)":"rgba(58,170,110,0.6)"}` }}>
            {wentUp ? "↑" : "↓"}
          </div>
        )}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 14px", borderRadius:100, background:sev.bg, border:`1px solid ${sev.border}`, transition:"all 0.5s ease" }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:sev.color, boxShadow:`0 0 6px ${sev.color}` }}/>
        <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, fontWeight:700, color:sev.color, letterSpacing:"2px", textTransform:"uppercase" }}>{sev.label}</span>
      </div>
    </div>
  );
}

// ── Priority Timeline ──────────────────────────────────────────────────────
function PriorityTimeline({ events }: { events:{time:string;priority:number;note:string}[] }) {
  if (events.length === 0) return (
    <div style={{ textAlign:"center", padding:"30px 0", fontFamily:"'Montserrat',sans-serif", fontSize:10, color:"var(--gray-mid)" }}>
      Priority changes will appear here
    </div>
  );
  return (
    <div style={{ position:"relative", paddingLeft:20 }}>
      <div style={{ position:"absolute", left:6, top:8, bottom:8, width:1, background:"var(--border-color)" }}/>
      {events.map((e, i) => (
        <div key={i} style={{ position:"relative", marginBottom:14, animation:"fadeSlideIn 0.4s ease" }}>
          <div style={{ position:"absolute", left:-14, top:3, width:10, height:10, borderRadius:"50%", background:SEV[e.priority]?.color ?? "var(--gray-mid)", boxShadow:`0 0 6px ${SEV[e.priority]?.color ?? "transparent"}`, border:"2px solid var(--card-bg)" }}/>
          <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, color:"var(--gray-mid)", marginBottom:2 }}>{e.time}</div>
          <div style={{ fontSize:13, color:"var(--text-primary)", fontFamily:"'Cormorant Garamond',serif", fontWeight:600 }}>{e.note}</div>
        </div>
      ))}
    </div>
  );
}

// ── Typing Indicator ───────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display:"flex", gap:5, alignItems:"center", padding:"12px 16px" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"var(--gold-primary)", opacity:0.7, animation:`typingBounce 1.2s ${i*0.2}s ease-in-out infinite` }}/>
      ))}
    </div>
  );
}

// ── Live Queue Card (with token number) ────────────────────────────────────
function LiveQueueCard({ p, isMe }: { p:LivePatient; isMe:boolean }) {
  const sev = SEV[p.priority] ?? SEV[1];
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:10,
      padding:"10px 14px",
      background: isMe ? sev.bg : "var(--surface)",
      border:`1px solid ${isMe ? sev.border : "var(--border-color)"}`,
      borderRadius:12,
      transition:"all 0.3s ease",
      boxShadow: isMe ? `0 0 14px ${sev.glow}` : "none",
      animation:"cardIn 0.4s ease",
    }}>
      <div style={{ width:50, textAlign:"center", fontFamily:"'Cormorant Garamond',serif", fontSize:14, fontWeight:700, color:isMe ? sev.color : "var(--gray-mid)", flexShrink:0 }}>
        #{String(p.id).padStart(3, "0")}
      </div>
      <div style={{ width:32, height:32, borderRadius:"50%", background:isMe ? sev.color : "var(--surface2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Cormorant Garamond',serif", fontSize:13, fontWeight:700, color:isMe ? "#fff" : "var(--text-primary)", flexShrink:0, boxShadow:isMe ? `0 0 8px ${sev.glow}` : "none" }}>
        {p.position}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:14, fontWeight:600, color:"var(--text-primary)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {isMe ? "You" : p.name}
          </span>
          {isMe && <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:7, fontWeight:700, color:sev.color, background:sev.bg, border:`1px solid ${sev.border}`, padding:"1px 7px", borderRadius:100, letterSpacing:1 }}>YOU</span>}
          {p.boosted && <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:7, color:"#c4a832", background:"rgba(196,168,50,0.1)", padding:"1px 6px", borderRadius:100 }}>↑ Boosted</span>}
        </div>
        {p.condition && (
          <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, color:"var(--gray-mid)", marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {p.condition.length > 40 ? p.condition.substring(0, 40) + "..." : p.condition}
          </div>
        )}
        <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, color:sev.color, fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginTop:2 }}>{sev.label}</div>
      </div>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:13, color:"var(--gold-primary)", fontWeight:600, textAlign:"right", flexShrink:0 }}>
        <LiveWait secs={p.waitSeconds}/>
      </div>
    </div>
  );
}

// ── Profile Modal ──────────────────────────────────────────────────────────
function ProfileModal({ patient, history, onClose, onUpdate }: {
  patient: PatientUser | null;
  history: {condition:string;priority:number;date:string}[];
  onClose: () => void;
  onUpdate: (updated: PatientUser) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(patient?.name || "");
  const [age, setAge] = useState(patient?.age.toString() || "");
  const [gender, setGender] = useState(patient?.gender || "");
  const [bloodType, setBloodType] = useState(patient?.bloodType || "");
  const [phone, setPhone] = useState(patient?.phone || "");
  const [emergencyContact, setEmergencyContact] = useState(patient?.emergencyContact || "");
  const [profilePhoto, setProfilePhoto] = useState<string>(() => {
    try { return localStorage.getItem("mq-profile-photo") || ""; } catch { return ""; }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setProfilePhoto(base64);
        localStorage.setItem("mq-profile-photo", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!patient) return;
    const updated: PatientUser = { ...patient, name, age: parseInt(age) || patient.age, gender, bloodType, phone, emergencyContact };
    onUpdate(updated);
    setEditing(false);
  };

  const initials = patient?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) || "?";

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(10px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"var(--card-bg)", border:"1px solid var(--border-color)", borderRadius:28, maxWidth:560, width:"100%", maxHeight:"90vh", overflow:"auto", boxShadow:"0 40px 80px rgba(0,0,0,0.3)" }}>

        {/* Header */}
        <div style={{ padding:"20px 24px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, fontWeight:700, color:"var(--gold-primary)", letterSpacing:"3px", textTransform:"uppercase", marginBottom:4 }}>Patient Profile</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:700, color:"var(--text-primary)" }}>My Profile</div>
          </div>
          <button onClick={onClose} style={{ width:34, height:34, borderRadius:"50%", border:"1px solid var(--border-color)", background:"transparent", cursor:"pointer", color:"var(--gray-mid)", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        {/* Avatar + Name */}
        <div style={{ padding:"20px 24px", display:"flex", alignItems:"center", gap:18, borderBottom:"1px solid var(--border-color)" }}>
          <div style={{ position:"relative", flexShrink:0 }}>
            <div style={{ width:80, height:80, borderRadius:"50%", border:"2px solid var(--gold-primary)", backgroundImage:profilePhoto ? `url(${profilePhoto})` : "none", backgroundSize:"cover", backgroundPosition:"center", background:profilePhoto ? undefined : "var(--surface2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:700, color:"var(--gold-primary)" }}>
              {!profilePhoto && initials}
            </div>
            <button onClick={() => fileInputRef.current?.click()} style={{ position:"absolute", bottom:-2, right:-2, width:24, height:24, borderRadius:"50%", background:"linear-gradient(135deg,var(--gold-primary),var(--gold-dark))", border:"2px solid var(--card-bg)", cursor:"pointer", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>✏️</button>
            <input type="file" accept="image/*" ref={fileInputRef} style={{ display:"none" }} onChange={handlePhotoUpload}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:700, color:"var(--text-primary)", marginBottom:4 }}>{patient?.name}</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, color:"var(--gray-mid)", background:"var(--surface)", border:"1px solid var(--border-color)", padding:"2px 10px", borderRadius:100 }}>@{patient?.username}</span>
              <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, fontWeight:700, color:"#e8503a", background:"rgba(232,80,58,0.08)", border:"1px solid rgba(232,80,58,0.25)", padding:"2px 10px", borderRadius:100 }}>{patient?.bloodType}</span>
            </div>
          </div>
          <button onClick={() => setEditing(e => !e)} style={{ padding:"8px 16px", background:editing ? "var(--gold-dim)" : "transparent", border:"1px solid var(--border-color)", borderRadius:100, fontFamily:"'Montserrat',sans-serif", fontSize:9, fontWeight:700, color:editing ? "var(--gold-primary)" : "var(--gray-mid)", cursor:"pointer", letterSpacing:"1px", textTransform:"uppercase", transition:"all 0.2s" }}>
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {/* Info Grid (view mode) */}
        {!editing && (
          <div style={{ padding:"20px 24px", borderBottom:"1px solid var(--border-color)" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                { label:"Age", value:`${patient?.age} years` },
                { label:"Gender", value:patient?.gender },
                { label:"Blood Type", value:patient?.bloodType },
                { label:"Phone", value:patient?.phone },
                { label:"Emergency Contact", value:patient?.emergencyContact || "Not set" },
                { label:"Patient ID", value:`#${patient?.id}` },
              ].map((item, i) => (
                <div key={i} style={{ background:"var(--surface)", border:"1px solid var(--border-color)", borderRadius:14, padding:"12px 16px" }}>
                  <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:7, fontWeight:600, color:"var(--gray-mid)", letterSpacing:"2px", textTransform:"uppercase", marginBottom:5 }}>{item.label}</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:600, color:"var(--text-primary)" }}>{item.value || "—"}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit Form */}
        {editing && (
          <div style={{ padding:"20px 24px", borderBottom:"1px solid var(--border-color)" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                { label:"Full Name", value:name, set:setName, type:"text", full:true },
                { label:"Age", value:age, set:setAge, type:"number" },
                { label:"Phone", value:phone, set:setPhone, type:"tel" },
                { label:"Emergency Contact", value:emergencyContact, set:setEmergencyContact, type:"text" },
              ].map((f, i) => (
                <div key={i} style={{ gridColumn: f.full ? "1 / -1" : "auto" }}>
                  <label style={{ display:"block", fontFamily:"'Montserrat',sans-serif", fontSize:7, fontWeight:600, color:"var(--gray-mid)", letterSpacing:"2px", textTransform:"uppercase", marginBottom:6 }}>{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
                    style={{ width:"100%", padding:"10px 14px", background:"var(--input-bg)", border:"1px solid var(--border-color)", borderRadius:11, color:"var(--text-primary)", fontFamily:"'Cormorant Garamond',serif", fontSize:15, outline:"none" }}/>
                </div>
              ))}
              <div>
                <label style={{ display:"block", fontFamily:"'Montserrat',sans-serif", fontSize:7, fontWeight:600, color:"var(--gray-mid)", letterSpacing:"2px", textTransform:"uppercase", marginBottom:6 }}>Gender</label>
                <select value={gender} onChange={e => setGender(e.target.value)}
                  style={{ width:"100%", padding:"10px 14px", background:"var(--input-bg)", border:"1px solid var(--border-color)", borderRadius:11, color:"var(--text-primary)", fontFamily:"'Cormorant Garamond',serif", fontSize:15, outline:"none" }}>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
                </select>
              </div>
              <div>
                <label style={{ display:"block", fontFamily:"'Montserrat',sans-serif", fontSize:7, fontWeight:600, color:"var(--gray-mid)", letterSpacing:"2px", textTransform:"uppercase", marginBottom:6 }}>Blood Type</label>
                <select value={bloodType} onChange={e => setBloodType(e.target.value)}
                  style={{ width:"100%", padding:"10px 14px", background:"var(--input-bg)", border:"1px solid var(--border-color)", borderRadius:11, color:"var(--text-primary)", fontFamily:"'Cormorant Garamond',serif", fontSize:15, outline:"none" }}>
                  <option value="">Select</option>
                  {["A+","A−","B+","B−","AB+","AB−","O+","O−"].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleSave} style={{ width:"100%", marginTop:16, padding:"12px", background:"linear-gradient(135deg,var(--gold-primary),var(--gold-dark))", border:"none", borderRadius:50, fontFamily:"'Montserrat',sans-serif", fontSize:12, fontWeight:800, color:"#000", cursor:"pointer", letterSpacing:"1.5px", textTransform:"uppercase" }}>
              Save Changes
            </button>
          </div>
        )}

        {/* Visit History */}
        <div style={{ padding:"20px 24px" }}>
          <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, fontWeight:700, color:"var(--gold-primary)", letterSpacing:"2.5px", textTransform:"uppercase", marginBottom:14, display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:5, height:5, borderRadius:"50%", background:"var(--gold-primary)", boxShadow:"0 0 6px var(--gold-primary)" }}/>
            Visit History
          </div>
          {history.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:"var(--gray-mid)" }}>No previous visits on record</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:220, overflowY:"auto" }}>
              {history.map((v, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"var(--surface)", border:"1px solid var(--border-color)", borderRadius:13 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:SEV[v.priority].color, boxShadow:`0 0 5px ${SEV[v.priority].color}`, flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:14, fontWeight:600, color:"var(--text-primary)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{v.condition}</div>
                    <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, color:"var(--gray-mid)", marginTop:2 }}>{v.date}</div>
                  </div>
                  <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, fontWeight:700, padding:"2px 10px", borderRadius:100, color:SEV[v.priority].color, background:SEV[v.priority].bg, border:`1px solid ${SEV[v.priority].border}`, flexShrink:0 }}>{SEV[v.priority].label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function PatientPortal() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [patient, setPatient]         = useState<PatientUser|null>(null);
  // ── FIX: store the raw queue entry id separately so token survives re-renders ──
  const [myQueueId, setMyQueueId]     = useState<number|null>(null);
  const [myEntry, setMyEntry]         = useState<QueueEntry|null>(null);
  const [condition, setCondition]     = useState("");
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiResult, setAiResult]       = useState<{priority:number;reasoning:string;keywords:string[]}|null>(null);
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState("");
  const [queueSize, setQueueSize]     = useState(0);
  const [allPatients, setAllPatients] = useState<LivePatient[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [history, setHistory]         = useState<{condition:string;priority:number;date:string}[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggs, setFilteredSuggs]     = useState<string[]>([]);
  const [posFlash, setPosFlash]       = useState(false);
  const [priorityEvents, setPriorityEvents]   = useState<{time:string;priority:number;note:string}[]>([]);
  const [activeTab, setActiveTab]     = useState<"status"|"tips"|"actions">("status");
  const [showSymptomsPanel, setShowSymptomsPanel] = useState(false);
  const [checkedSymptoms, setCheckedSymptoms]     = useState<string[]>([]);
  const [rightPanel, setRightPanel]   = useState<"queue"|"chat"|null>(null);
  const [chatMsgs, setChatMsgs]       = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput]     = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string>(() => {
    try { return localStorage.getItem("mq-profile-photo") || ""; } catch { return ""; }
  });
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyLoading, setEmergencyLoading] = useState(false);

  const prevBoosted      = useRef(false);
  const prevPosition     = useRef<number|null>(null);
  const prevPriority     = useRef<number|null>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const chatEndRef       = useRef<HTMLDivElement>(null);
  const chatInputRef     = useRef<HTMLTextAreaElement>(null);
  const approachAlerted  = useRef(false);

  // Keep profilePhoto in sync with localStorage changes (e.g. from ProfileModal)
  useEffect(() => {
    const sync = () => {
      try { setProfilePhoto(localStorage.getItem("mq-profile-photo") || ""); } catch {}
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  // ── Init ──
  useEffect(() => {
    try {
      const t = localStorage.getItem("mq-theme");
      document.documentElement.setAttribute("data-theme", t === "light" ? "light" : "dark");
    } catch {}

    // Check if this is an emergency session
    const isEmergency = searchParams.get("emergency") === "true" || localStorage.getItem("mq-emergency") === "true";

    try {
      const savedPatient = localStorage.getItem("mq-patient");
      if (savedPatient) {
        // Normal logged-in user
        const parsed = JSON.parse(savedPatient);
        setPatient(parsed);

        // If they came via emergency, auto-trigger emergency modal after load
        if (isEmergency) {
          const emergName = localStorage.getItem("mq-emergency-name") || "";
          setEmergencyName(emergName);
          setTimeout(() => setShowEmergencyModal(true), 600);
          localStorage.removeItem("mq-emergency");
          localStorage.removeItem("mq-emergency-name");
        }
        
        fetch(`/api/history?patientUserId=${parsed.id}`)
          .then(r => r.json())
          .then(data => {
            if (data.visits) setHistory(data.visits.map((v: any) => ({
              condition:v.condition, priority:v.priority,
              date:new Date(v.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})
            })));
          }).catch(() => {});
      } else if (isEmergency) {
        // Not logged in but IS emergency — create a guest patient object
        const emergName = localStorage.getItem("mq-emergency-name") || "Emergency Patient";
        const guestPatient: PatientUser = {
          id: 0, // guest id — queue submission uses name only
          name: emergName,
          username: "guest",
          age: 0,
          gender: "",
          bloodType: "",
          phone: "",
          emergencyContact: "",
        };
        setPatient(guestPatient);
        setEmergencyName(emergName);
        setTimeout(() => setShowEmergencyModal(true), 600);
        localStorage.removeItem("mq-emergency");
        localStorage.removeItem("mq-emergency-name");
      } else {
        router.push("/login");
      }
    } catch (err) {
      console.error("Failed to load patient", err);
      router.push("/login");
    }

    setPageLoading(false);
  }, [router, searchParams]);

  // ── Queue polling ──────────────────────────────────────────────────────
  const fetchQueue = useCallback(async (patientId?: number) => {
    try {
      const res = await fetch("/api/queue");
      const data = await res.json();

      const enriched: LivePatient[] = (data.queue ?? []).map((e: any, i: number) => {
        const userId =
          e.patientUserId != null ? Number(e.patientUserId) :
          e.patientId     != null ? Number(e.patientId)     :
          e.userId        != null ? Number(e.userId)        : undefined;

        return {
          id:           e.id ?? i + 1,
          name:         e.name ?? "Patient",
          condition:    e.condition,
          priority:     e.priority ?? 1,
          waitSeconds: Math.max(0, i * 300),
          boosted:      e.boosted ?? false,
          patientUserId: userId,
          position:     i + 1,
        };
      });

      setQueueSize(enriched.length);
      setAllPatients(enriched);

      if (patientId && patientId > 0) {
        let entry = enriched.find(p => p.patientUserId === patientId);

        if (entry) {
          setMyQueueId(prev => prev ?? entry!.id);

          const qEntry: QueueEntry = {
            id:            entry.id,
            patientUserId: entry.patientUserId,
            priority:      entry.priority,
            position:      entry.position,
            waitSeconds:   entry.waitSeconds,
            boosted:       entry.boosted,
          };
          setMyEntry(qEntry);

          if (prevPosition.current !== null && prevPosition.current !== entry.position) {
            setPosFlash(true); setTimeout(() => setPosFlash(false), 800);
          }
          if (prevPriority.current !== null && prevPriority.current !== entry.priority) {
            const timeStr = new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
            setPriorityEvents(prev => [...prev, {
              time: timeStr, priority: entry!.priority,
              note: entry!.priority > (prevPriority.current ?? 0)
                ? `Priority escalated to ${SEV[entry!.priority].label}`
                : `Priority updated to ${SEV[entry!.priority].label}`
            }]);
          }
          if (entry.position === 1 && prevPosition.current !== 1) { playNextUpAlert(); haptic([80,40,80,40,120]); }
          if ((entry.position === 2 || entry.position === 3) && (prevPosition.current ?? 99) > 3 && !approachAlerted.current) approachAlerted.current = true;
          if (entry.position > 3) approachAlerted.current = false;
          if (entry.boosted && !prevBoosted.current) { playBoostSound(); haptic([20,20,60]); }
          prevPriority.current = entry.priority;
          prevPosition.current = entry.position;
          prevBoosted.current  = entry.boosted;
        }
      }
    } catch (err) {
      console.error("Queue fetch error:", err);
    }
  }, []);

  useEffect(() => {
    if (patient) {
      fetchQueue(patient.id);
      const t = setInterval(() => fetchQueue(patient.id), 5000);
      return () => clearInterval(t);
    }
  }, [patient, fetchQueue]);

  useEffect(() => {
    if (patient && submitted) {
      let count = 0;
      const aggressive = setInterval(() => {
        fetchQueue(patient.id);
        count++;
        if (count >= 10) clearInterval(aggressive);
      }, 1500);
      return () => clearInterval(aggressive);
    }
  }, [patient, submitted, fetchQueue]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chatMsgs]);

  function handleEmergencyEnter() {
    setShowEmergencyModal(true);
  }

  async function submitEmergency() {
    if (!patient) return;
    const name = emergencyName.trim() || patient.name || "Emergency Patient";
    setEmergencyLoading(true);
    try {
      const res = await fetch("/api/queue", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          condition: "EMERGENCY — immediate assistance required",
          priority: 5,
          patientUserId: patient.id > 0 ? patient.id : undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Emergency admit failed"); setEmergencyLoading(false); return; }
      const responseData = await res.json().catch(() => ({}));
      if (responseData?.entry?.id || responseData?.id) {
        const newId = responseData?.entry?.id ?? responseData?.id;
        setMyQueueId(newId);
        setMyEntry({ id: newId, patientUserId: patient.id > 0 ? patient.id : undefined, priority: 5, position: 0, waitSeconds: 0, boosted: false });
      }
      playJoinChime(); haptic([100, 50, 100, 50, 200]);
      prevPriority.current = 5;
      setPriorityEvents([{ time: new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}), priority: 5, note: "🚨 Emergency admit — Critical priority assigned" }]);
      setShowEmergencyModal(false);
      setEmergencyName("");
      setSubmitted(true);
    } catch { setError("Emergency admit failed. Please try again."); }
    setEmergencyLoading(false);
  }

  function openChat() {
    if (!chatStarted && patient) {
      setChatMsgs([{
        id:"welcome", role:"assistant",
        content:`Hello ${patient.name.split(" ")[0]} 👋 I'm your MediQueue Health Assistant. Ask me anything about your symptoms, visit, or what to expect!`,
        ts: new Date(),
      }]);
      setChatStarted(true);
    }
    setRightPanel(p => p === "chat" ? null : "chat");
  }

  async function sendChat(text?: string) {
    const content = (text ?? chatInput).trim();
    if (!content || chatLoading) return;
    setChatInput("");
    const userMsg: ChatMsg = { id: Date.now().toString(), role:"user", content, ts: new Date() };
    setChatMsgs(prev => [...prev, userMsg]);
    setChatLoading(true);
    const tempId = "temp-" + Date.now();
    setChatMsgs(prev => [...prev, { id: tempId, role:"assistant", content: "", ts: new Date() }]);
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, patientName: patient?.name, history: chatMsgs.filter(m => !m.typing && m.id !== "welcome").map(m => ({ role: m.role, text: m.content })) }),
      });
      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const d = line.slice(6);
            if (d === "[DONE]") break;
            try { const parsed = JSON.parse(d); if (parsed.content) { accumulated += parsed.content; setChatMsgs(prev => prev.map(m => m.id === tempId ? { ...m, content: accumulated } : m)); } } catch {}
          }
        }
      }
    } catch {
      setChatMsgs(prev => prev.map(m => m.id === tempId ? { ...m, content: "I'm having trouble connecting. Please try again." } : m));
    }
    setChatLoading(false);
  }

  function handleConditionChange(val: string) {
    setCondition(val); setAiResult(null);
    if (val.length > 1) {
      const matches = SYMPTOM_SUGGESTIONS.filter(s => s.toLowerCase().includes(val.toLowerCase())).slice(0,4);
      setFilteredSuggs(matches); setShowSuggestions(matches.length > 0);
    } else setShowSuggestions(false);
  }

  function toggleSymptom(s: string) {
    setCheckedSymptoms(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev,s]);
  }

  function buildFullCondition() {
    const extras = checkedSymptoms.join(", ");
    const base = condition.trim();
    return base && extras ? `${base}; also: ${extras}` : base || extras || "";
  }

  async function assessAndSubmit() {
    const full = buildFullCondition();
    if (!full || !patient) return;
    setAiLoading(true); setError(""); setShowSuggestions(false);
    try {
      const res = await fetch("/api/triage", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ condition: full }) });
      const data = await res.json();
      setAiResult(data);
    } catch { setError("Assessment failed. Please try again."); }
    setAiLoading(false);
  }

  async function confirmSubmit() {
    if (!aiResult || !patient) return;
    const full = buildFullCondition();
    try {
      const res = await fetch("/api/queue", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name:patient.name, condition:full, priority:aiResult.priority, patientUserId:patient.id > 0 ? patient.id : undefined }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed to join queue"); return; }

      const responseData = await res.json().catch(() => ({}));
      if (responseData?.entry?.id || responseData?.id) {
        const newId = responseData?.entry?.id ?? responseData?.id;
        setMyQueueId(newId);
        setMyEntry({ id: newId, patientUserId: patient.id > 0 ? patient.id : undefined, priority: aiResult.priority, position: 0, waitSeconds: 0, boosted: false });
      }

      playJoinChime(); haptic([40,30,40]);
      prevPriority.current = aiResult.priority;
      setPriorityEvents([{ time: new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}), priority: aiResult.priority, note: `Joined — AI assessed as ${SEV[aiResult.priority].label}` }]);
      fetch("/api/history", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ patientUserId:patient.id, condition:full, priority:aiResult.priority }) })
        .then(r=>r.json()).then(d=>{ if(d.visit) setHistory(prev=>[{condition:d.visit.condition,priority:d.visit.priority,date:new Date(d.visit.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})},...prev].slice(0,20)); }).catch(()=>{});
      setSubmitted(true);
    } catch { setError("Failed to join queue."); }
  }

  function startNewVisit() {
    setSubmitted(false); setCondition(""); setAiResult(null);
    setError(""); setPriorityEvents([]); setCheckedSymptoms([]);
    setMyEntry(null); setMyQueueId(null);
    prevPosition.current=null; prevPriority.current=null; prevBoosted.current=false;
  }

  function logout() { localStorage.removeItem("mq-patient"); router.push("/login"); }

  function updatePatient(updated: PatientUser) {
    setPatient(updated);
    localStorage.setItem("mq-patient", JSON.stringify(updated));
  }

  const tokenId    = myQueueId ?? myEntry?.id ?? null;
  const tokenStr   = tokenId != null ? `#${String(tokenId).padStart(3, "0")}` : null;
  const waitSecs   = myEntry?.waitSeconds ?? 0;
  const waitMins   = Math.floor(waitSecs / 60);
  const waitDisp = waitSecs <= 0 ? "Now" : waitMins > 0 ? `~${waitMins}m` : `<1m`;
  const healthTips = getHealthTips(condition);
  const initials   = patient?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) || "?";

  const queuePreview = (() => {
    if (!myEntry || allPatients.length === 0) return allPatients.slice(0, 8);
    const myIdx = allPatients.findIndex(p => p.patientUserId === patient?.id);
    if (myIdx === -1) return allPatients.slice(0, 8);
    const start = Math.max(0, myIdx - 2);
    const end   = Math.min(allPatients.length, start + 7);
    return allPatients.slice(start, end);
  })();

  if (pageLoading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"var(--bg-primary)" }}>
        <div className="scan-row" style={{ width:200 }}>
          <div className="scan-bar" style={{ width:"100%" }}><div className="scan-fill"/></div>
          <span className="scan-txt">Loading your portal...</span>
        </div>
      </div>
    );
  }

  if (!patient) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700;800;900&family=Great+Vibes&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :root {
          --gold-primary:#D4AF37; --gold-light:#F3D572; --gold-dark:#B38F2F;
          --gold-glow:rgba(212,175,55,0.25); --gold-dim:rgba(212,175,55,0.07);
          --bg-primary:#fafaf8; --surface:#f4f4f0; --surface2:#eeede8;
          --card-bg:rgba(255,255,255,0.97); --border-color:rgba(0,0,0,0.09);
          --text-primary:#0a0a0a; --text-secondary:#333; --gray-mid:#777;
          --input-bg:rgba(0,0,0,0.025);
        }
        [data-theme="dark"] {
          --bg-primary:#000; --surface:#0a0a0a; --surface2:#0f0f0f;
          --card-bg:rgba(10,10,10,0.97); --border-color:rgba(212,175,55,0.12);
          --text-primary:#fff; --text-secondary:#ccc; --gray-mid:#666;
          --input-bg:rgba(255,255,255,0.04);
        }
        html,body { background:var(--bg-primary); font-family:'Montserrat',sans-serif; color:var(--text-primary); min-height:100vh; overflow-x:hidden; transition:background 0.3s,color 0.3s; }
        .bg-orb { position:fixed; border-radius:50%; filter:blur(100px); pointer-events:none; z-index:0; animation:orbFloat 22s ease-in-out infinite; }
        .orb-1 { width:55vw;height:55vw;background:radial-gradient(circle,rgba(212,175,55,0.12),transparent);top:-15%;right:-15%; }
        .orb-2 { width:45vw;height:45vw;background:radial-gradient(circle,rgba(212,175,55,0.07),transparent);bottom:-20%;left:-10%;animation-delay:-8s; }
        @keyframes orbFloat{0%,100%{transform:translate(0,0)scale(1)}50%{transform:translate(3%,-4%)scale(1.04)}}

        .page-shell { position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:20px 16px 60px; }
        .header { display:flex;align-items:center;justify-content:space-between;width:100%;max-width:1100px;margin-bottom:20px; }
        .wordmark { font-family:'Great Vibes',cursive;font-size:38px;background:linear-gradient(135deg,var(--gold-primary),var(--gold-light));-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:2px; }
        .tagline { font-family:'Montserrat',sans-serif;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--gray-mid); }
        .header-right { display:flex;align-items:center;gap:8px; }
        .btn-ghost { font-family:'Montserrat',sans-serif;font-size:8px;color:var(--gray-mid);background:transparent;border:1px solid var(--border-color);padding:5px 13px;border-radius:100px;cursor:pointer;letter-spacing:1px;text-transform:uppercase;transition:all 0.2s; }
        .btn-ghost:hover { color:#e8503a;border-color:rgba(232,80,58,0.4); }
        .btn-confirm-emergency { 
          font-family:'Montserrat',sans-serif;font-size:8px;font-weight:700;
          background:linear-gradient(135deg,#e8503a,#c0392b);
          border:none;padding:5px 13px;border-radius:100px;
          cursor:pointer;letter-spacing:1px;text-transform:uppercase;
          transition:all 0.2s;color:#fff;
        }
        .btn-confirm-emergency:hover { transform:translateY(-1px);box-shadow:0 4px 12px rgba(232,80,58,0.4); }
        .panel-toggle-btn { font-family:'Montserrat',sans-serif;font-size:8px;font-weight:700;padding:5px 13px;border-radius:100px;cursor:pointer;letter-spacing:1px;text-transform:uppercase;transition:all 0.25s;border:1px solid var(--border-color);background:transparent;color:var(--gray-mid); }
        .panel-toggle-btn:hover { border-color:var(--gold-primary);color:var(--gold-primary);background:var(--gold-dim); }
        .panel-toggle-btn.active { background:var(--gold-dim);border-color:var(--gold-primary);color:var(--gold-primary); }

        .avatar-btn { width:34px;height:34px;border-radius:50%;border:2px solid var(--gold-primary);background:var(--surface2);cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:13px;font-weight:700;color:var(--gold-primary);overflow:hidden;transition:all 0.2s;flex-shrink:0; }
        .avatar-btn:hover { box-shadow:0 0 0 3px var(--gold-glow); }

        .content-row { display:flex;gap:16px;width:100%;max-width:1100px;align-items:flex-start; }
        .main-col { flex:1;min-width:0; }
        .side-panel { width:0;overflow:hidden;transition:width 0.35s cubic-bezier(0.16,1,0.3,1),opacity 0.3s;opacity:0;flex-shrink:0; }
        .side-panel.open { width:340px;opacity:1; }

        .main-card { background:var(--card-bg);border:1px solid var(--border-color);border-radius:24px;width:100%;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.1); }
        .sec-head { padding:13px 20px;background:var(--surface);border-bottom:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between; }
        .sec-title { font-family:'Montserrat',sans-serif;font-size:9px;font-weight:700;color:var(--gold-primary);letter-spacing:2.5px;text-transform:uppercase;display:flex;align-items:center;gap:7px; }
        .sec-dot { width:5px;height:5px;border-radius:50%;background:var(--gold-primary);box-shadow:0 0 6px var(--gold-primary); }

        .form-body { padding:20px; }
        .field-label { display:block;font-family:'Montserrat',sans-serif;font-size:9px;font-weight:600;color:var(--gray-mid);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:7px; }
        .field-input { width:100%;padding:12px 15px;background:var(--input-bg);border:1px solid var(--border-color);border-radius:13px;color:var(--text-primary);font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:500;outline:none;transition:all 0.3s;resize:vertical;min-height:78px; }
        .field-input:focus { border-color:var(--gold-primary);box-shadow:0 0 0 3px rgba(212,175,55,0.07); }
        .field-input::placeholder { color:var(--gray-mid);opacity:0.6; }

        .sugg-dropdown { position:absolute;left:0;right:0;top:calc(100% + 4px);background:var(--card-bg);border:1px solid var(--border-color);border-radius:13px;overflow:hidden;z-index:50;box-shadow:0 12px 32px rgba(0,0,0,0.12);animation:fadeUp 0.15s ease; }
        .sugg-item { padding:10px 15px;font-family:'Cormorant Garamond',serif;font-size:14px;color:var(--text-secondary);cursor:pointer;transition:background 0.1s;border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:9px; }
        .sugg-item:last-child { border-bottom:none; }
        .sugg-item:hover { background:var(--gold-dim);color:var(--gold-primary); }

        .quick-chip { padding:5px 11px;background:var(--surface);border:1px solid var(--border-color);border-radius:100px;font-family:'Montserrat',sans-serif;font-size:8px;font-weight:500;color:var(--gray-mid);cursor:pointer;transition:all 0.15s;white-space:nowrap; }
        .quick-chip:hover,.quick-chip.active { color:var(--gold-primary);border-color:var(--gold-primary);background:var(--gold-dim); }

        .btn-assess { width:100%;padding:13px;background:linear-gradient(135deg,var(--gold-primary),var(--gold-dark));border:none;border-radius:50px;font-family:'Montserrat',sans-serif;font-size:12px;font-weight:800;color:#000;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:all 0.3s;margin-top:4px; }
        .btn-assess:hover:not(:disabled) { transform:translateY(-2px);box-shadow:0 10px 30px var(--gold-glow); }
        .btn-assess:disabled { opacity:0.4;cursor:not-allowed; }

        .scan-row { margin-top:12px;padding:10px 15px;background:var(--gold-dim);border:1px solid rgba(212,175,55,0.18);border-radius:12px;display:flex;align-items:center;gap:12px; }
        .scan-bar { width:56px;height:2px;background:var(--border-color);border-radius:1px;overflow:hidden;flex-shrink:0; }
        .scan-fill { height:100%;width:40%;background:var(--gold-primary);animation:scanAnim 1.4s ease-in-out infinite; }
        @keyframes scanAnim{0%{margin-left:-40%}100%{margin-left:100%}}
        .scan-txt { font-family:'Montserrat',sans-serif;font-size:9px;font-weight:600;color:var(--gold-primary);letter-spacing:1.5px; }

        .ai-result { margin-top:14px;border-radius:16px;border:1px solid;overflow:hidden;animation:fadeUp 0.3s ease; }
        .ai-top { padding:13px 17px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.05); }
        .ai-sev { font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700; }
        .ai-badge { font-family:'Montserrat',sans-serif;font-size:8px;color:var(--gold-primary);background:var(--gold-dim);border:1px solid rgba(212,175,55,0.2);padding:3px 10px;border-radius:100px;letter-spacing:1px;font-weight:600; }
        .ai-body { padding:12px 17px; }
        .ai-reasoning { font-family:'Cormorant Garamond',serif;font-size:14px;color:var(--text-secondary);line-height:1.7;margin-bottom:10px;font-style:italic; }
        .ai-kws { display:flex;gap:4px;flex-wrap:wrap;margin-bottom:13px; }
        .kw { font-family:'Montserrat',sans-serif;font-size:8px;color:var(--gray-mid);background:var(--surface);border:1px solid var(--border-color);padding:2px 9px;border-radius:100px;font-weight:500; }
        .ai-actions { display:flex;gap:8px; }
        .btn-redo { padding:10px 15px;background:transparent;color:var(--gray-mid);border:1px solid var(--border-color);border-radius:50px;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.2s; }
        .btn-redo:hover { color:var(--text-primary); }
        .btn-join { flex:1;padding:10px;background:rgba(58,170,110,0.08);color:#3aaa6e;border:1px solid rgba(58,170,110,0.28);border-radius:50px;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:all 0.2s; }
        .btn-join:hover { background:rgba(58,170,110,0.15); }

        .token-hero-banner { padding:20px 22px 18px;border-bottom:1px solid var(--border-color);background:linear-gradient(135deg,rgba(212,175,55,0.05),transparent);display:flex;align-items:center;justify-content:space-between;gap:16px; }
        .token-eyebrow { font-family:'Montserrat',sans-serif;font-size:7px;font-weight:700;color:var(--gray-mid);letter-spacing:3px;text-transform:uppercase;margin-bottom:4px; }
        .token-number-display { font-family:'Cormorant Garamond',serif;font-size:72px;font-weight:700;line-height:1;letter-spacing:-3px;background:linear-gradient(135deg,var(--gold-primary),var(--gold-light));-webkit-background-clip:text;background-clip:text;color:transparent; }
        .token-subline { font-family:'Montserrat',sans-serif;font-size:8px;color:var(--gray-mid);letter-spacing:1.5px;display:flex;align-items:center;gap:6px;margin-top:4px; }

        .queue-hero { padding:14px 20px 18px; }
        .queue-top { display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;margin-bottom:18px; }
        .divider-v { width:1px;height:80px;background:var(--border-color); }
        .live-dot { width:5px;height:5px;border-radius:50%;background:#3aaa6e;box-shadow:0 0 5px #3aaa6e;display:inline-block;animation:breathe 2s ease-in-out infinite; }
        @keyframes breathe{0%,100%{opacity:1}50%{opacity:0.35}}

        .stats-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px; }
        .s-box { background:var(--surface);border:1px solid var(--border-color);border-radius:13px;padding:13px;text-align:center; }
        .s-val { font-family:'Cormorant Garamond',serif;font-size:26px;color:var(--text-primary);line-height:1;font-weight:600; }
        .s-lbl { font-family:'Montserrat',sans-serif;font-size:7px;color:var(--gray-mid);letter-spacing:2px;text-transform:uppercase;margin-top:4px; }

        .pos-bar-labels { display:flex;justify-content:space-between;font-family:'Montserrat',sans-serif;font-size:8px;color:var(--gray-mid);margin-bottom:6px; }
        .pos-bar { height:8px;background:var(--border-color);border-radius:4px;overflow:hidden;display:flex;margin-bottom:14px; }
        .next-alert { background:rgba(58,170,110,0.08);border:1px solid rgba(58,170,110,0.25);border-radius:13px;padding:11px 15px;text-align:center;margin-bottom:10px;animation:pulseAlert 2s ease-in-out infinite; }
        @keyframes pulseAlert{0%,100%{box-shadow:none}50%{box-shadow:0 0 16px rgba(58,170,110,0.18)}}

        .tab-bar { display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--border-color);border-bottom:1px solid var(--border-color);background:var(--surface); }
        .tab-btn { padding:11px;font-family:'Montserrat',sans-serif;font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;border:none;background:transparent;color:var(--gray-mid);cursor:pointer;transition:all 0.2s;position:relative; }
        .tab-btn::after { content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--gold-primary);transform:scaleX(0);transition:transform 0.25s; }
        .tab-btn.active { color:var(--gold-primary);background:var(--card-bg); }
        .tab-btn.active::after { transform:scaleX(1); }
        .tab-content { padding:18px 20px;min-height:140px; }

        .tip-item { display:flex;align-items:flex-start;gap:11px;padding:9px 0;border-bottom:1px solid var(--border-color); }
        .tip-item:last-child { border-bottom:none; }
        .tip-num { font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--gold-primary);font-weight:600;flex-shrink:0;line-height:1.2; }
        .tip-text { font-family:'Cormorant Garamond',serif;font-size:14px;color:var(--text-secondary);line-height:1.6; }
        .action-grid { display:grid;grid-template-columns:1fr 1fr;gap:8px; }
        .action-btn { display:flex;flex-direction:column;gap:6px;padding:13px;background:var(--surface);border:1px solid var(--border-color);border-radius:13px;cursor:pointer;text-align:left;transition:all 0.2s; }
        .action-btn:hover { border-color:var(--gold-primary);background:var(--gold-dim); }
        .action-icon { font-size:20px; }
        .action-label { font-family:'Montserrat',sans-serif;font-size:9px;font-weight:700;color:var(--gold-primary);letter-spacing:1px;text-transform:uppercase; }
        .action-sub { font-family:'Cormorant Garamond',serif;font-size:12px;color:var(--gray-mid); }

        .hist-slide { overflow:hidden;max-height:0;transition:max-height 0.35s ease;background:var(--surface);border-bottom:1px solid var(--border-color); }
        .hist-slide.open { max-height:260px; }
        .hist-list { padding:12px;display:flex;flex-direction:column;gap:7px;max-height:230px;overflow-y:auto; }
        .hist-list::-webkit-scrollbar { width:3px; }
        .hist-list::-webkit-scrollbar-thumb { background:var(--border-color);border-radius:2px; }
        .hist-item { display:flex;align-items:center;gap:9px;padding:9px 13px;background:var(--card-bg);border:1px solid var(--border-color);border-radius:11px; }
        .hist-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
        .hist-badge { font-family:'Montserrat',sans-serif;font-size:8px;font-weight:700;padding:2px 9px;border-radius:100px;border:1px solid;flex-shrink:0; }

        .new-visit-section { padding:16px 20px;border-top:1px solid var(--border-color); }
        .btn-new-visit { width:100%;padding:12px;background:transparent;border:1px solid var(--border-color);border-radius:50px;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:600;color:var(--gray-mid);letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:all 0.25s; }
        .btn-new-visit:hover { border-color:#e8503a;color:#e8503a; }

        .error-msg { color:#e8503a;font-family:'Montserrat',sans-serif;font-size:11px;margin-top:10px;padding:9px 13px;background:rgba(232,80,58,0.07);border-radius:11px;border:1px solid rgba(232,80,58,0.2); }

        .panel-card { background:var(--card-bg);border:1px solid var(--border-color);border-radius:24px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.1);height:calc(100vh - 120px);max-height:700px;display:flex;flex-direction:column;position:sticky;top:20px; }
        .panel-head { padding:13px 18px;background:var(--surface);border-bottom:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;flex-shrink:0; }
        .panel-title { font-family:'Montserrat',sans-serif;font-size:9px;font-weight:700;color:var(--gold-primary);letter-spacing:2px;text-transform:uppercase;display:flex;align-items:center;gap:7px; }
        .panel-close { width:26px;height:26px;border-radius:50%;border:1px solid var(--border-color);background:transparent;color:var(--gray-mid);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;transition:all 0.2s; }
        .panel-close:hover { color:#e8503a;border-color:rgba(232,80,58,0.3); }

        .queue-preview-body { flex:1;overflow-y:auto;padding:14px; }
        .queue-preview-body::-webkit-scrollbar { width:3px; }
        .queue-preview-body::-webkit-scrollbar-thumb { background:var(--border-color);border-radius:2px; }
        .queue-stat-row { display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px; }
        .queue-stat { background:var(--surface);border:1px solid var(--border-color);border-radius:11px;padding:10px 12px;text-align:center; }
        .queue-stat-val { font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:var(--text-primary);line-height:1; }
        .queue-stat-lbl { font-family:'Montserrat',sans-serif;font-size:7px;color:var(--gray-mid);letter-spacing:2px;text-transform:uppercase;margin-top:3px; }
        .queue-cards { display:flex;flex-direction:column;gap:7px; }
        .queue-section-label { font-family:'Montserrat',sans-serif;font-size:8px;font-weight:700;color:var(--gray-mid);letter-spacing:2px;text-transform:uppercase;margin:10px 0 6px; }
        .dist-row { display:flex;gap:4px;margin-bottom:14px;align-items:flex-end;height:36px; }
        .dist-col { flex:1;display:flex;flex-direction:column;align-items:center;gap:2px; }
        .dist-bar-inner { width:100%;border-radius:3px 3px 0 0;transition:height 0.5s ease;min-height:2px; }
        .dist-lbl-text { font-family:'Montserrat',sans-serif;font-size:6px;color:var(--gray-mid); }

        .chat-body-panel { flex:1;overflow-y:auto;padding:14px 14px 8px;display:flex;flex-direction:column;gap:4px; }
        .chat-body-panel::-webkit-scrollbar { width:3px; }
        .chat-body-panel::-webkit-scrollbar-thumb { background:var(--border-color);border-radius:2px; }
        .chat-msg-row { display:flex;gap:8px;align-items:flex-end;margin-bottom:6px;animation:msgIn 0.25s ease; }
        .chat-msg-row.user { flex-direction:row-reverse; }
        .chat-avatar { width:26px;height:26px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;background:var(--surface2);border:1px solid var(--border-color);font-family:'Montserrat',sans-serif;font-weight:700;color:var(--gold-primary); }
        .chat-bubble { max-width:78%;padding:10px 13px;border-radius:16px;font-family:'Cormorant Garamond',serif;font-size:14px;line-height:1.6;color:var(--text-secondary); }
        .chat-bubble.ai { background:var(--surface2);border:1px solid var(--border-color);border-bottom-left-radius:3px; }
        .chat-bubble.user { background:var(--gold-dim);border:1px solid rgba(212,175,55,0.2);border-bottom-right-radius:3px;color:var(--text-primary); }
        .chat-bubble.typing { padding:0;background:var(--surface2);border:1px solid var(--border-color);border-bottom-left-radius:3px; }
        .chat-time { font-family:'Montserrat',sans-serif;font-size:7px;color:var(--gray-mid);padding:0 3px;margin-top:2px; }
        .chat-input-row { padding:12px 14px;border-top:1px solid var(--border-color);display:flex;gap:8px;align-items:flex-end;flex-shrink:0; }
        .chat-input { flex:1;padding:10px 13px;background:var(--input-bg);border:1px solid var(--border-color);border-radius:13px;color:var(--text-primary);font-family:'Cormorant Garamond',serif;font-size:14px;outline:none;resize:none;min-height:40px;max-height:100px;transition:all 0.2s;line-height:1.5; }
        .chat-input:focus { border-color:var(--gold-primary);box-shadow:0 0 0 2px rgba(212,175,55,0.07); }
        .chat-input::placeholder { color:var(--gray-mid);opacity:0.7; }
        .chat-send-btn { width:40px;height:40px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--gold-primary),var(--gold-dark));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;transition:all 0.2s;color:#000;font-weight:700; }
        .chat-send-btn:hover:not(:disabled) { transform:scale(1.08);box-shadow:0 6px 18px var(--gold-glow); }
        .chat-send-btn:disabled { opacity:0.4;cursor:not-allowed; }
        .chat-quick-wrap { padding:8px 14px 0;display:flex;gap:5px;flex-wrap:wrap;flex-shrink:0; }
        .chat-quick-btn { padding:4px 10px;background:var(--surface2);border:1px solid var(--border-color);border-radius:100px;font-family:'Montserrat',sans-serif;font-size:8px;color:var(--gray-mid);cursor:pointer;transition:all 0.15s;white-space:nowrap; }
        .chat-quick-btn:hover { color:var(--gold-primary);border-color:var(--gold-primary);background:var(--gold-dim); }

        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{0%{transform:scale(0)}70%{transform:scale(1.2)}100%{transform:scale(1)}}
        @keyframes posFlash{0%{opacity:0.3;transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}
        @keyframes skelPulse{0%,100%{opacity:0.4}50%{opacity:0.8}}
        @keyframes typingBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
        @keyframes msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cardIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .pos-flash { animation:posFlash 0.8s ease; }

        @media(max-width:900px) {
          .side-panel.open { width:100%;position:fixed;bottom:0;left:0;right:0;z-index:200;height:60vh;border-radius:20px 20px 0 0;box-shadow:0 -8px 40px rgba(0,0,0,0.25); }
          .panel-card { height:100%;max-height:100%;border-radius:20px 20px 0 0; }
        }
        @media(max-width:480px) {
          .action-grid { grid-template-columns:1fr; }
          .queue-top { grid-template-columns:1fr;gap:8px; }
          .divider-v { display:none; }
          .token-number-display { font-size:52px; }
        }
      `}</style>

      <div className="bg-orb orb-1"/><div className="bg-orb orb-2"/>

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal
          patient={patient}
          history={history}
          onClose={() => setShowProfile(false)}
          onUpdate={p => { updatePatient(p); setProfilePhoto(localStorage.getItem("mq-profile-photo") || ""); }}
        />
      )}

      {/* Emergency Admit Modal */}
      {showEmergencyModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(10px)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"var(--card-bg)", border:"1px solid rgba(232,80,58,0.4)", borderRadius:24, maxWidth:420, width:"100%", padding:28, boxShadow:"0 40px 80px rgba(232,80,58,0.2)", animation:"fadeUp 0.25s ease" }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🚨</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:700, color:"#e8503a" }}>Emergency Admit</div>
              <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, color:"var(--gray-mid)", marginTop:6, letterSpacing:"1px" }}>
                You will be assigned Priority 5 — Critical and placed at the top of the queue.
              </div>
            </div>
            <label style={{ display:"block", fontFamily:"'Montserrat',sans-serif", fontSize:9, fontWeight:600, color:"var(--gray-mid)", letterSpacing:"2px", textTransform:"uppercase", marginBottom:8 }}>
              Patient Name (optional)
            </label>
            <input
              type="text"
              value={emergencyName}
              onChange={e => setEmergencyName(e.target.value)}
              placeholder={patient?.name ?? "Enter name…"}
              style={{ width:"100%", padding:"12px 15px", background:"var(--input-bg)", border:"1px solid var(--border-color)", borderRadius:13, color:"var(--text-primary)", fontFamily:"'Cormorant Garamond',serif", fontSize:16, outline:"none", marginBottom:16 }}
            />
            <button
              onClick={submitEmergency}
              disabled={emergencyLoading}
              style={{ width:"100%", padding:"13px", background:"linear-gradient(135deg,#e8503a,#c0392b)", border:"none", borderRadius:50, fontFamily:"'Montserrat',sans-serif", fontSize:12, fontWeight:800, color:"#fff", letterSpacing:"1.5px", cursor:"pointer", marginBottom:10, opacity: emergencyLoading ? 0.6 : 1 }}
            >
              {emergencyLoading ? "Admitting…" : "🚨 Confirm Emergency Admit"}
            </button>
            <button
              onClick={() => { setShowEmergencyModal(false); setEmergencyName(""); }}
              style={{ width:"100%", padding:"11px", background:"transparent", border:"1px solid var(--border-color)", borderRadius:50, fontFamily:"'Montserrat',sans-serif", fontSize:11, fontWeight:600, color:"var(--gray-mid)", cursor:"pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="page-shell">
        {/* HEADER */}
        <div className="header">
          <div>
            <div className="wordmark">MediQueue</div>
            <div className="tagline">Patient Portal</div>
          </div>
          <div className="header-right">
            <button className="avatar-btn" onClick={() => setShowProfile(true)} title="My Profile">
              {profilePhoto
                ? <img src={profilePhoto} alt="profile" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }}/>
                : initials
              }
            </button>
            <button className="btn-confirm-emergency" onClick={handleEmergencyEnter}>
              🚨 Emergency Portal
            </button>
            <button className={`panel-toggle-btn ${rightPanel==="queue"?"active":""}`} onClick={() => setRightPanel(p => p==="queue" ? null : "queue")}>
              👥 Live Queue {queueSize > 0 && `· ${queueSize}`}
            </button>
            <button className={`panel-toggle-btn ${rightPanel==="chat"?"active":""}`} onClick={openChat}>
              🤖 AI Buddy
            </button>
            <button className="btn-ghost" onClick={logout}>Logout</button>
          </div>
        </div>

        <div className="content-row">
          {/* ── MAIN COLUMN ── */}
          <div className="main-col">
            <div className="main-card">

              {/* ── PRE-QUEUE ── */}
              {!submitted && (
                <>
                  <div className="sec-head">
                    <div className="sec-title"><div className="sec-dot"/>Describe Your Symptoms</div>
                    <button className="btn-ghost" onClick={()=>setShowHistory(h=>!h)} style={{fontSize:8}}>
                      {showHistory?"Hide":"History"}{history.length>0&&` (${history.length})`}
                    </button>
                  </div>

                  <div className={`hist-slide ${showHistory?"open":""}`}>
                    <div className="hist-list">
                      {history.length===0
                        ? <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"var(--gray-mid)",textAlign:"center",padding:20}}>No previous visits</div>
                        : history.map((v,i)=>(
                          <div key={i} className="hist-item">
                            <div className="hist-dot" style={{background:SEV[v.priority].color}}/>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:14,fontWeight:600,color:"var(--text-primary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{v.condition}</div>
                              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,color:"var(--gray-mid)",marginTop:1}}>{v.date}</div>
                            </div>
                            <div className="hist-badge" style={{color:SEV[v.priority].color,borderColor:SEV[v.priority].border,background:SEV[v.priority].bg}}>{SEV[v.priority].label}</div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="form-body">
                    <div style={{position:"relative",marginBottom:14}}>
                      <label className="field-label">What brings you in today?</label>
                      <textarea ref={textareaRef} className="field-input"
                        placeholder="e.g. severe chest pain, difficulty breathing, dizziness since 2 hours..."
                        value={condition} onChange={e=>handleConditionChange(e.target.value)}
                        onBlur={()=>setTimeout(()=>setShowSuggestions(false),150)}
                        onFocus={()=>{ if(filteredSuggs.length>0) setShowSuggestions(true); }}
                        disabled={aiLoading}/>
                      {showSuggestions && (
                        <div className="sugg-dropdown">
                          {filteredSuggs.map((s,i)=>(
                            <div key={i} className="sugg-item" onMouseDown={()=>{ setCondition(s); setShowSuggestions(false); textareaRef.current?.focus(); }}>
                              <span style={{opacity:0.5}}>🔍</span>{s}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {!condition && (
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                        {["Chest pain","Difficulty breathing","High fever","Headache","Nausea"].map(s=>(
                          <button key={s} className="quick-chip" onClick={()=>handleConditionChange(s)}>{s}</button>
                        ))}
                      </div>
                    )}

                    <div style={{marginBottom:16}}>
                      <button onClick={()=>setShowSymptomsPanel(p=>!p)} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",padding:0,marginBottom:showSymptomsPanel?10:0}}>
                        <span style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"var(--gray-mid)",letterSpacing:"1px"}}>
                          {showSymptomsPanel ? "▲ Hide quick symptoms" : "▼ Add quick symptoms"}
                        </span>
                        {checkedSymptoms.length>0 && (
                          <span style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,fontWeight:700,color:"#fff",background:"var(--gold-primary)",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{checkedSymptoms.length}</span>
                        )}
                      </button>
                      {showSymptomsPanel && (
                        <div style={{display:"flex",flexWrap:"wrap",gap:6,animation:"fadeUp 0.2s ease"}}>
                          {QUICK_SYMPTOMS.map(s=>(
                            <button key={s} className={`quick-chip ${checkedSymptoms.includes(s)?"active":""}`} onClick={()=>toggleSymptom(s)}>{s}</button>
                          ))}
                        </div>
                      )}
                    </div>

                    {!aiResult && (
                      <>
                        <button className="btn-assess" onClick={assessAndSubmit} disabled={aiLoading||(!condition.trim()&&checkedSymptoms.length===0)}>
                          {aiLoading?"Analysing…":"Get AI Assessment →"}
                        </button>
                        <div style={{ marginTop: 10, position: "relative" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                            <div style={{ flex:1, height:1, background:"var(--border-color)" }}/>
                            <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, color:"var(--gray-mid)", letterSpacing:"2px", textTransform:"uppercase" }}>or</span>
                            <div style={{ flex:1, height:1, background:"var(--border-color)" }}/>
                          </div>
                          <button
                            onClick={() => setShowEmergencyModal(true)}
                            style={{
                              width:"100%", padding:"13px",
                              background:"linear-gradient(135deg,#e8503a,#c0392b)",
                              border:"none", borderRadius:50,
                              fontFamily:"'Montserrat',sans-serif", fontSize:12, fontWeight:800,
                              color:"#fff", letterSpacing:"1.5px", textTransform:"uppercase",
                              cursor:"pointer", transition:"all 0.3s",
                              boxShadow:"0 6px 24px rgba(232,80,58,0.35)",
                              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
                          >
                            🚨 Emergency Admit
                          </button>
                          <div style={{ textAlign:"center", marginTop:6, fontFamily:"'Montserrat',sans-serif", fontSize:8, color:"var(--gray-mid)" }}>
                            Critical — skip triage, admit immediately
                          </div>
                        </div>
                      </>
                    )}
                    {aiLoading && (
                      <div className="scan-row">
                        <div className="scan-bar"><div className="scan-fill"/></div>
                        <span className="scan-txt">AI triage in progress…</span>
                      </div>
                    )}

                    {aiResult && (
                      <div className="ai-result" style={{borderColor:SEV[aiResult.priority].border,background:SEV[aiResult.priority].bg}}>
                        <div className="ai-top">
                          <span className="ai-sev" style={{color:SEV[aiResult.priority].color}}>{SEV[aiResult.priority].label}</span>
                          <span className="ai-badge">MediQueue AI</span>
                        </div>
                        <div className="ai-body">
                          <p className="ai-reasoning">"{aiResult.reasoning}"</p>
                          <div className="ai-kws">{aiResult.keywords.map((k,i)=><span key={i} className="kw">{k}</span>)}</div>
                          <div className="ai-actions">
                            <button className="btn-redo" onClick={()=>setAiResult(null)}>Redo</button>
                            <button className="btn-join" onClick={confirmSubmit}>Join Queue →</button>
                          </div>
                        </div>
                      </div>
                    )}
                    {error && <div className="error-msg">{error}</div>}
                  </div>
                </>
              )}

              {/* ── IN-QUEUE ── */}
              {submitted && (
                <>
                  <div className="sec-head">
                    <div className="sec-title">
                      <div className="sec-dot"/>
                      <span className="live-dot" style={{marginLeft:2}}/>
                      Live Queue Status
                    </div>
                    {myEntry?.boosted && <span style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"#c4a832",background:"rgba(196,168,50,0.07)",border:"1px solid rgba(196,168,50,0.2)",padding:"4px 13px",borderRadius:100,letterSpacing:"1.5px",fontWeight:600}}>⚡ Priority Boosted</span>}
                  </div>

                  {/* Token Hero — shows as soon as tokenStr is available */}
                  <div className="token-hero-banner">
                    <div>
                      <div className="token-eyebrow">Your Token Number</div>
                      {tokenStr ? (
                        <div className={`token-number-display ${posFlash?"pos-flash":""}`}>{tokenStr}</div>
                      ) : (
                        <div style={{ display:"flex", alignItems:"center", gap:10, height:72 }}>
                          <div className="scan-bar" style={{ width:80, height:3 }}><div className="scan-fill"/></div>
                          <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, color:"var(--gray-mid)" }}>Assigning token…</span>
                        </div>
                      )}
                      <div className="token-subline">
                        <span className="live-dot"/>
                        Show this number to reception
                      </div>
                    </div>
                    {myEntry && (
                      <PriorityDial priority={myEntry.priority} prevPriority={prevPriority.current !== myEntry.priority ? prevPriority.current : null}/>
                    )}
                  </div>

                  {/* Queue stats */}
                  {myEntry ? (
                    <div className="queue-hero">
                      <div className="queue-top">
                        <BigCountdownClock initialSeconds={waitSecs}/>
                        <div className="divider-v"/>
                        <div className="stats-grid" style={{marginBottom:0}}>
                          <div className="s-box">
                            <div className={`s-val ${posFlash?"pos-flash":""}`} style={{color:SEV[myEntry.priority].color}}>{myEntry.position}</div>
                            <div className="s-lbl">Position</div>
                          </div>
                          <div className="s-box">
                            <div className="s-val">{queueSize}</div>
                            <div className="s-lbl">In Queue</div>
                          </div>
                          <div className="s-box">
                            <div className="s-val" style={{color:"var(--gold-primary)"}}>{waitDisp}</div>
                            <div className="s-lbl">Wait</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="pos-bar-labels">
                          <span>← Ahead ({myEntry.position-1})</span>
                          <span>Behind ({queueSize-myEntry.position}) →</span>
                        </div>
                        <div className="pos-bar">
                          {myEntry.position>1 && <div style={{width:`${((myEntry.position-1)/queueSize)*100}%`,background:"linear-gradient(90deg,#e8503a,#d4873a)",height:"100%"}}/>}
                          <div style={{width:`${(1/Math.max(queueSize,1))*100}%`,background:SEV[myEntry.priority].color,height:"100%",position:"relative"}}>
                            <div style={{position:"absolute",top:-14,left:"50%",transform:"translateX(-50%)",fontSize:7,fontWeight:"bold",color:SEV[myEntry.priority].color,whiteSpace:"nowrap",fontFamily:"'Montserrat',sans-serif"}}>YOU</div>
                          </div>
                          {myEntry.position<queueSize && <div style={{width:`${((queueSize-myEntry.position)/queueSize)*100}%`,background:"linear-gradient(90deg,#3aaa6e,#3a82c4)",height:"100%"}}/>}
                        </div>
                      </div>

                      {myEntry.position===1 && (
                        <div className="next-alert">
                          <span style={{fontSize:14,fontWeight:700,color:"#3aaa6e",fontFamily:"'Montserrat',sans-serif"}}>🔔 You are NEXT — please proceed to reception</span>
                        </div>
                      )}
                      {myEntry.position===2 && (
                        <div style={{marginTop:10,background:"rgba(196,168,50,0.07)",border:"1px solid rgba(196,168,50,0.2)",borderRadius:12,padding:9,textAlign:"center"}}>
                          <span style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,fontWeight:600,color:"#c4a832"}}>⚡ You're 2nd in line — please be ready</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Waiting for first poll to return the entry */
                    <div style={{padding:"20px 22px 18px"}}>
                      <div className="stats-grid">
                        {["Position","In Queue","Wait"].map(lbl => (
                          <div key={lbl} className="s-box">
                            <div style={{height:26,width:"50%",margin:"0 auto",background:"var(--border-color)",borderRadius:4,animation:"skelPulse 1.4s ease-in-out infinite"}}/>
                            <div className="s-lbl">{lbl}</div>
                          </div>
                        ))}
                      </div>
                      <div className="scan-row">
                        <div className="scan-bar"><div className="scan-fill"/></div>
                        <span className="scan-txt">Fetching your position…</span>
                      </div>
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="tab-bar">
                    {[{id:"status",label:"Timeline"},{id:"tips",label:"Health Tips"},{id:"actions",label:"Quick Help"}].map(t=>(
                      <button key={t.id} className={`tab-btn ${activeTab===t.id?"active":""}`} onClick={()=>setActiveTab(t.id as any)}>{t.label}</button>
                    ))}
                  </div>
                  <div className="tab-content">
                    {activeTab==="status" && <PriorityTimeline events={priorityEvents}/>}
                    {activeTab==="tips" && (
                      <div>{healthTips.map((tip,i)=>(
                        <div key={i} className="tip-item"><span className="tip-num">{i+1}</span><span className="tip-text">{tip}</span></div>
                      ))}</div>
                    )}
                    {activeTab==="actions" && (
                      <div className="action-grid">
                        {[
                          {icon:"💊",label:"Medication Safety",sub:"Drug interaction info"},
                          {icon:"🩺",label:"ER Process",sub:"What to expect next"},
                          {icon:"🚨",label:"Warning Signs",sub:"When to alert staff"},
                          {icon:"🧾",label:"Doctor Questions",sub:"Prepare for consult"},
                        ].map((a,i)=>(
                          <button key={i} className="action-btn" onClick={()=>{ if(rightPanel!=="chat") openChat(); sendChat(a.label); }}>
                            <span className="action-icon">{a.icon}</span>
                            <div><div className="action-label">{a.label}</div><div className="action-sub">{a.sub}</div></div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="new-visit-section">
                    <button className="btn-new-visit" onClick={startNewVisit}>+ Start New Visit</button>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className={`side-panel ${rightPanel?"open":""}`}>
            {rightPanel === "queue" && (
              <div className="panel-card">
                <div className="panel-head">
                  <div className="panel-title"><span className="live-dot"/>Live Queue Preview</div>
                  <button className="panel-close" onClick={()=>setRightPanel(null)}>✕</button>
                </div>
                <div className="queue-preview-body">
                  <div className="queue-stat-row">
                    <div className="queue-stat">
                      <div className="queue-stat-val" style={{color:"var(--gold-primary)"}}>{queueSize}</div>
                      <div className="queue-stat-lbl">Total Waiting</div>
                    </div>
                    <div className="queue-stat">
                      <div className="queue-stat-val" style={{color:"#e8503a"}}>{allPatients.filter(p=>p.priority>=4).length}</div>
                      <div className="queue-stat-lbl">Critical/Severe</div>
                    </div>
                  </div>

                  {queueSize > 0 && (
                    <>
                      <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,fontWeight:700,color:"var(--gray-mid)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>Priority Mix</div>
                      <div className="dist-row">
                        {[1,2,3,4,5].map(p => {
                          const count = allPatients.filter(x=>x.priority===p).length;
                          const maxCount = Math.max(...[1,2,3,4,5].map(pp=>allPatients.filter(x=>x.priority===pp).length),1);
                          return (
                            <div key={p} className="dist-col">
                              <div className="dist-bar-inner" style={{height:`${count>0?(count/maxCount)*28:2}px`,background:SEV[p].color,opacity:count>0?1:0.25}}/>
                              <div className="dist-lbl-text">{SEV[p].label.slice(0,3).toUpperCase()}</div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {queueSize === 0 ? (
                    <div style={{textAlign:"center",padding:"40px 20px",fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:"var(--gray-mid)"}}>Queue is empty</div>
                  ) : (
                    <div className="queue-cards">
                      {myEntry && (
                        <>
                          <div className="queue-section-label">Your Position</div>
                          {queuePreview.filter(p=>p.patientUserId===patient?.id).map(p => (
                            <LiveQueueCard key={p.id} p={p} isMe={true}/>
                          ))}
                        </>
                      )}
                      <div className="queue-section-label">Full Queue</div>
                      {queuePreview.map(p => (
                        <LiveQueueCard key={p.id} p={p} isMe={p.patientUserId===patient?.id}/>
                      ))}
                      {allPatients.length > queuePreview.length && (
                        <div style={{textAlign:"center",padding:"8px",fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"var(--gray-mid)"}}>
                          +{allPatients.length - queuePreview.length} more patients
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {rightPanel === "chat" && (
              <div className="panel-card">
                <div className="panel-head">
                  <div className="panel-title">
                    <span className="live-dot" style={{background:"#3aaa6e",boxShadow:"0 0 5px #3aaa6e"}}/>
                    MediQueue Buddy
                  </div>
                  <button className="panel-close" onClick={()=>setRightPanel(null)}>✕</button>
                </div>
                <div className="chat-body-panel">
                  {chatMsgs.map(msg => (
                    <div key={msg.id}>
                      <div className={`chat-msg-row ${msg.role==="user"?"user":""}`}>
                        <div className="chat-avatar" style={msg.role==="assistant"?{fontSize:14}:{}}>
                          {msg.role==="assistant" ? "🤖" : (patient?.name?.charAt(0)?.toUpperCase() ?? "?")}
                        </div>
                        <div className={`chat-bubble ${msg.role==="assistant"?"ai":"user"} ${msg.typing?"typing":""}`}>
                          {msg.typing ? <TypingIndicator/> : msg.content}
                        </div>
                      </div>
                      {!msg.typing && (
                        <div className="chat-time" style={msg.role==="user"?{textAlign:"right"}:{}}>
                          {msg.ts.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef}/>
                </div>

                {chatMsgs.length <= 1 && (
                  <div className="chat-quick-wrap">
                    {CHAT_QUICK_Qs.map((q,i)=>(
                      <button key={i} className="chat-quick-btn" onClick={()=>sendChat(q)}>{q}</button>
                    ))}
                  </div>
                )}

                <div className="chat-input-row">
                  <textarea ref={chatInputRef} className="chat-input"
                    placeholder="Ask about your health or visit…"
                    value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendChat(); } }}
                    disabled={chatLoading} rows={1}
                    onInput={e => { const t=e.currentTarget; t.style.height="auto"; t.style.height=Math.min(t.scrollHeight,100)+"px"; }}
                  />
                  <button className="chat-send-btn" onClick={()=>sendChat()} disabled={chatLoading||!chatInput.trim()}>
                    {chatLoading ? "…" : "↑"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
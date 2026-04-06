import { useState, useCallback, useMemo, useEffect, useRef } from "react";

// Generate anonymous user ID
function getUserId() {
  let id = localStorage.getItem("okonom-uid");
  if (!id) {
    id = "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("okonom-uid", id);
  }
  return id;
}

async function track(event_type, question = null, metadata = null) {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type, user_id: getUserId(), question, metadata }),
    });
  } catch {}
}

const ACCOUNT_TYPES = [
  { id: "loen", label: "Lønkonto", icon: "💰" },
  { id: "opsparing", label: "Opsparingskonto", icon: "🏦" },
  { id: "budget", label: "Budgetkonto", icon: "📊" },
  { id: "faelles", label: "Fælles konto", icon: "👫" },
  { id: "laan", label: "Lån", icon: "📋" },
];

const CATEGORY_RULES = [
  // Mad & Restauranter FIRST
  { keywords: ["restaurant","cafe ","ruby,","ruby ","the dubliner","café","vinstue","espresso","coffee","starbucks","baresso","lagkagehuset","kebab","thai","wok","tapas","brunch","smørrebrød","vivaldi","fisketorvet","me and me","sushi","pizza","burger","mcdonalds","kfc","subway","takeaway","bistro","grill","brasserie","bodega","bageri","enlil","arkadens isbod","petersens","poelser","spiseriet","palmehaven","taste of fortune","ved stranden","the dubliner","rosengaarden","whisky in the jar","fleisch","marv & ben","mikkeller","logen","lord nelson","bruun & stengade","tasteat","zoku","wolt","wolt ","bread & co","gatsby","pigi","pierogarnia","zjedz","zabka","sjofolket"], category: "Mad & Restauranter", icon: "🍽️", color: "#E91E63" },
  // Dagligvarer
  { keywords: ["netto","fakta","rema 1000","rema1000","aldi","lidl","meny","irma","bilka","føtex","kvickly","superbrugsen","dagligbrugsen","coop","jem & fix","jem&fix","normal aps","nemlig.com","willys","teglholm marked"], category: "Dagligvarer", icon: "🛒", color: "#4CAF50" },
  // Kiosk & Benzin
  { keywords: ["seven eleven","7-eleven","q8","shell","circle k","ok benzin","esso","st1","uno-x","benzin","tankstation","select service par"], category: "Kiosk & Benzin", icon: "⛽", color: "#FF9800" },
  // Streaming & Abonnementer
  { keywords: ["netflix","spotify","hbo","disney","viaplay","youtube","apple music","deezer","claude.ai","anthropic","google one","playstation","xbox","adobe","dropbox","icloud","tidal","mofibo","storytel","visma","logbuy","tv2","tv 2","abonnement","subscription","blockbuster","openai","chatgpt","podimo","paddle.net","n8n"], category: "Streaming & Abonnementer", icon: "📺", color: "#9C27B0" },
  // Transport
  { keywords: ["dsb","rejsekort","movia","metro","uber","bolt","flixbus","molslinjen","færge","parkering","parking","brobizz","taxa","lufthavn","airport","abildskou","atpcard","dantaxi","dot app","easypark","easy park","rejsebillet","mob.pay","kk.mitpas","ssp emirates"], category: "Transport", icon: "🚌", color: "#2196F3" },
  // Bolig & Regninger
  { keywords: ["husleje","boligindskud","el ","elregning","vand ","varme","forsikring","ejendom","tryg ","codan","alka ","topdanmark","grundejer","fjernvarme","fællesudgift","almenbrand","gebyr","rente af","shipmondo","relatel","til vvs","enhavns kommune","lauridsensmoebler","moebelkompagniet"], category: "Bolig & Regninger", icon: "🏠", color: "#795548" },
  // Sundhed & Fitness
  { keywords: ["apotek","apteka","læge","hospital","tandlæge","medicin","fitness","gym","træning","sats ","crossfit","health","optiker","fysio","kiroprak","hvidovresport","sport24","hair & beauty","sport 24","eventyrsport","running","løbesko","sportmaster","intersport","unisport","bodylab","drywear"], category: "Sundhed & Fitness", icon: "💊", color: "#00BCD4" },
  // Tøj & Mode
  { keywords: ["zalando","h&m","zara","matas","sephora","søstrene grene","tiger","dressmann","jack & jones","vero moda","only ","bestseller","magasin","illum","skechers","nike ","adidas ","sp bahne","sp bono","bahne","ganni","neye","boozt","monki","weekday","arket","cos ","pieces","vila ","selected","noisy may","about you","adidasdk","jwlry","kids-world","kjær & sommerfeldt","sprd.net","temu"], category: "Tøj & Mode", icon: "👗", color: "#FF5722" },
  // Shopping & Elektronik
  { keywords: ["amazon","ebay","coolshop","proshop","elgiganten","power.dk","power ","expert ","imerco","saxo","thansen","bauhaus","silvan","stark ","clasohlson","pop mart","komplett","fiskegrej","bog & idé","bog&idé","normal a/s","kystfisken","ifiske","sharewine","vivino","sommeliervine","vivino","vin ","vin ","whisky"], category: "Shopping & Elektronik", icon: "🛍️", color: "#607D8B" },
  // Spil & Betting
  { keywords: ["bet365","danskespil","danske spil","lotteri","unibet","betsson","mrgreen","mr green","888casino","888*","casino","poker","bingo","gambling","buckaroo","game over","spilnu","spionspil","nordicbet","tsg platforms"], category: "Spil & Betting", icon: "🎲", color: "#F59E0B" },
  // Oplevelser & Fritid
  { keywords: ["airbnb","booking.com","hotels.com","biograf","kino","teater","museum","zoo","tivoli","legoland","escape room","bowling","koncert","festival","ticketmaster","billetlugen","rundetaarn","illusions","paintball","getyourguide","billetten","aire ancient","camping","rødovre kulturhus","dba danser","loge","udgift loge","udlæg loge","til fisketur","svea","sjofolket"], category: "Oplevelser & Fritid", icon: "🎭", color: "#8B5CF6" },
  // Lønindtægt
  { keywords: ["fk-feriepenge","feriepenge","gevinst","medarbejderfordele","udbetaling","løn","lønudbetaling","lønoverførsel","salary"], category: "Lønindtægt", icon: "💵", color: "#22c55e" },
  // Opsparing & Overførsler
  { keywords: ["til egen opsparing","til fælles budget","fiskeopsparing","opsparing"], category: "Opsparing & Overførsler", icon: "🔄", color: "#6B7280" },
  // Kontanter
  { keywords: ["hæveautomat","kontanthævning","pengeautomat","atm "], category: "Kontanter", icon: "💵", color: "#9E9E9E" },
];

// Clean transaction description before categorizing
function cleanDescription(desc) {
  return (desc || "")
    .replace(/Dankort-køb/gi, "")
    .replace(/Visa\/Dankort/gi, "")
    .replace(/MobilePay køb/gi, "")
    .replace(/MobilePay:\s*/gi, "")
    .replace(/Notanr?\s*[\w\d]+/gi, "")
    .replace(/Nota\s*[\w\d]+/gi, "")
    .replace(/(USD|EUR|GBP|DKK)\s*[\d.,]+/gi, "")
    .replace(/Kurs\s*[\d.,]+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isMobilePayPerson(desc) {
  return /MobilePay\s+[A-ZÆØÅ][a-zæøå]/i.test(desc) && !/køb|MobilePay MobilePay/i.test(desc);
}

function categorize(description) {
  if (isMobilePayPerson(description)) {
    return { category: "Overførsler", icon: "🔄", color: "#6B7280" };
  }
  const cleaned = cleanDescription(description);
  const lower = cleaned.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => lower.includes(k)))
      return { category: rule.category, icon: rule.icon, color: rule.color };
  }
  // Generic "Overførsel" 
  if (/^overf/i.test(description.trim()) || /^fra\d/i.test(description.trim()) || /^forbrug på/i.test(description.trim())) {
    return { category: "Overførsler", icon: "🔄", color: "#6B7280" };
  }
  return { category: "Andet", icon: "📌", color: "#78909C" };
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const sep = lines[0].split(";").length >= lines[0].split(",").length ? ";" : ",";
  const firstCols = lines[0].split(sep);
  const startIdx = firstCols.some(c => /^-?[\d,.]+$/.test(c.trim())) ? 0 : 1;
  const transactions = [];
  for (let i = startIdx; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = lines[i].split(sep).map(c => c.replace(/^["']|["']$/g, "").trim());
    if (cols.length < 2) continue;
    let date = null, description = "", amount = null;
    for (const col of cols) {
      const dm = col.match(/^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})$/);
      if (dm && !date) {
        let [,d,m,y] = dm;
        if (y.length === 2) y = "20" + y;
        const dt = new Date(`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`);
        if (!isNaN(dt)) { date = dt; continue; }
      }
      if (/^-?[\d.]+,\d{2}$/.test(col) || /^-?[\d,]+\.\d{2}$/.test(col) || /^-?\d+$/.test(col)) {
        const num = parseFloat(col.replace(/\./g,"").replace(",","."));
        if (!isNaN(num) && amount === null) { amount = num; continue; }
      }
    }
    for (const col of cols) {
      if (!/^\d{1,2}[.\-\/]/.test(col) && !/^-?[\d.,]+$/.test(col) && col.length > description.length)
        description = col;
    }
    if (amount !== null && (date || description)) {
      const cat = categorize(description);
      transactions.push({
        id: i, date, amount, description,
        dateStr: date ? date.toLocaleDateString("da-DK", { day:"2-digit", month:"short", year:"numeric" }) : "–",
        ...cat, isIncome: amount > 0,
      });
    }
  }
  return transactions;
}

const MDA = ["Jan","Feb","Mar","Apr","Maj","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

// AI categorize transactions that landed in "Andet"
async function aiCategorize(transactions, onProgress) {
  const uncategorized = transactions.filter(t => t.category === "Andet");
  if (!uncategorized.length) return transactions;

  try {
    const res = await fetch("/api/categorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactions: uncategorized.map(t => cleanDescription(t.description))
      }),
    });
    const data = await res.json();
    if (!data.categories?.length) return transactions;

    // Build lookup map
    const catMap = {};
    data.categories.forEach(({ id, category }) => {
      catMap[id] = category;
    });

    // Map back to original transactions
    let uncatIdx = 0;
    const result = transactions.map(t => {
      if (t.category !== "Andet") return t;
      const newCat = catMap[uncatIdx++];
      if (onProgress) onProgress(uncatIdx, Object.keys(catMap).length);
      if (!newCat || newCat === "Andet") return t;
      const rule = CATEGORY_RULES.find(r => r.category === newCat);
      return { ...t, category: newCat, icon: rule?.icon || "📌", color: rule?.color || "#78909C" };
    });
    return result;
  } catch {
    return transactions;
  }
}
const fmt = n => Math.abs(n).toLocaleString("da-DK", { minimumFractionDigits:0, maximumFractionDigits:0 }) + " kr.";

function renderMessage(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

// ── Shared row components ─────────────────────────────────────────────────────
function MonthRow({ m, max, onClick, S }) {
  const net = (m.income || 0) - m.total;
  return (
    <div style={{ ...S.row, cursor: onClick ? "pointer" : "default", flexDirection:"column", alignItems:"stretch", gap:6 }} onClick={onClick}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ minWidth: 80 }}>
          <div style={S.rowTitle}>{MDA[m.month]} {m.year}</div>
          <div style={S.rowSub}>{m.items.length} udgifter</div>
        </div>
        <div style={S.barTrack}><div style={{ ...S.barFill, width:((m.total/max)*100) + "%", background: "linear-gradient(90deg,#8b2fc9,#e040fb)" }} /></div>
        <span style={S.rowAmt}>-{fmt(m.total)}</span>
      </div>
      {(m.income || 0) > 0 && (
        <div style={{ display:"flex", justifyContent:"space-between", paddingLeft:90, paddingRight:0 }}>
          <div style={{ display:"flex", gap:12 }}>
            <span style={{ fontSize:10, color:"#22c55e" }}>↑ +{fmt(m.income)}</span>
            <span style={{ fontSize:10, color: net >= 0 ? "#22c55e" : "#ef4444", fontWeight:600 }}>
              Netto: {net >= 0 ? "+" : "-"}{fmt(Math.abs(net))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function CatRow({ c, max, onClick, count, S }) {
  return (
    <div style={{ ...S.row, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div style={{ ...S.catIcon, background: c.color + "22", border: "1.5px solid " + c.color }}>{c.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.rowTitle}>{c.category}</div>
        <div style={S.barTrack}><div style={{ ...S.barFill, width:((c.total/max)*100) + "%", background: c.color }} /></div>
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ ...S.rowAmt, color: c.category === "Lønindtægt" ? "#22c55e" : "#ef4444" }}>
          {c.category === "Lønindtægt" ? "+" : "-"}{fmt(c.total)}
        </div>
        <div style={S.rowSub}>{(count ?? c.items.length)} stk.</div>
      </div>
    </div>
  );
}

function TRow({ t, S, onEdit }) {
  return (
    <div style={{ ...S.row, cursor: onEdit ? "pointer" : "default" }} onClick={() => onEdit && onEdit(t)}>
      <div style={{ ...S.catIcon, background: t.color + "22", border: "1.5px solid " + t.color, fontSize: 15 }}>{t.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...S.rowTitle, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cleanDescription(t.description) || t.description || "–"}</div>
        <div style={S.rowSub}>{t.dateStr}</div>
      </div>
      <span style={{ fontSize:13, fontWeight:700, color: t.isIncome ? "#4ade80" : "#ef4444", flexShrink:0 }}>
        {t.isIncome ? "+" : "-"}{fmt(t.amount)}
      </span>
    </div>
  );
}

function Nav({ view, setView, isDark, S, hasPlan }) {
  const tabs = [
    ["overview","📊","Overblik"],
    ["months","📅","Måneder"],
    ["categories","🏷️","Kategorier"],
    ["ai","👴🏼","Holger"],
    ...(hasPlan ? [["savings","📈","Sparplan"]] : []),
  ];
  return (
    <div style={{ ...S.nav, justifyContent: tabs.length === 5 ? "space-around" : "space-around" }}>
      {tabs.map(([id,icon,label]) => (
        <button key={id} style={S.navBtn} onClick={() => setView(id)}>
          <span style={{ fontSize: tabs.length === 5 ? 18 : 20 }}>{icon}</span>
          <span style={{ fontSize:9, color: view===id ? "#9333ea" : (isDark ? "#555" : "#999") }}>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Account Setup Screen ──────────────────────────────────────────────────────
function AccountSetup({ onComplete, isDark }) {
  const [accounts, setAccounts] = useState([{ id: Date.now(), type: "loen", name: "" }]);

  const addAccount = () => {
    if (accounts.length >= 5) return;
    setAccounts(prev => [...prev, { id: Date.now(), type: "andet", name: "" }]);
  };

  const removeAccount = (id) => {
    if (accounts.length <= 1) return;
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  const updateAccount = (id, field, value) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const bg = isDark ? "#0f0f13" : "#fff";
  const fg = isDark ? "#fff" : "#111";
  const sub = isDark ? "#888" : "#999";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"24px 20px", gap:20, overflowY:"auto", background: bg }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:44, marginBottom:8 }}>🏦</div>
        <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:fg }}>Dine konti</h1>
        <p style={{ margin:"6px 0 0", fontSize:13, color:sub, lineHeight:1.5 }}>
          Tilføj de konti du vil analysere.<br/>Du uploader CSV-filer i næste trin.
        </p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {accounts.map((acc, idx) => (
          <div key={acc.id} style={{ background: inputBg, border: "1px solid " + border, borderRadius:16, padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:12, fontWeight:600, color:sub }}>KONTO {idx+1}</span>
              {accounts.length > 1 && (
                <button onClick={() => removeAccount(acc.id)} style={{ background:"none", border:"none", color:"#ef4444", fontSize:16, cursor:"pointer" }}>✕</button>
              )}
            </div>
            <select
              value={acc.type}
              onChange={e => updateAccount(acc.id, "type", e.target.value)}
              style={{ background: isDark ? "#1a1a2e" : "#fff", border: "1px solid " + border, borderRadius:10, padding:"10px 12px", color:fg, fontSize:13, width:"100%", colorScheme: isDark ? "dark" : "light" }}>
              {ACCOUNT_TYPES.map(t => (
                <option key={t.id} value={t.id} style={{ background: isDark ? "#1a1a2e" : "#fff", color: isDark ? "#fff" : "#111" }}>{t.icon} {t.label}</option>
              ))}
            </select>
            <input
              placeholder="Valgfrit kaldenavn (fx 'Min løn')"
              value={acc.name}
              onChange={e => updateAccount(acc.id, "name", e.target.value)}
              style={{ background: inputBg, border: "1px solid " + border, borderRadius:10, padding:"10px 12px", color:fg, fontSize:13, width:"100%", boxSizing:"border-box" }}
            />
          </div>
        ))}
      </div>

      {accounts.length < 5 && (
        <button onClick={addAccount} style={{ background:"none", border: "2px dashed " + border, borderRadius:14, padding:"12px", color:sub, fontSize:13, cursor:"pointer" }}>
          + Tilføj konto
        </button>
      )}

      <button
        onClick={() => onComplete(accounts)}
        style={{ background:"linear-gradient(135deg,#8b2fc9,#e040fb)", border:"none", borderRadius:14, padding:"16px", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", marginTop:"auto" }}>
        Fortsæt →
      </button>
    </div>
  );
}

// ── CSV Upload Screen ─────────────────────────────────────────────────────────
function CSVUpload({ accounts, isDark, onComplete, onFileLoad }) {
  const [uploads, setUploads] = useState({});

  const processFile = (accountId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const transactions = parseCSV(e.target.result);
      const uncategorized = transactions.filter(t => t.category === "Andet").length;
      // Set as uploaded immediately
      setUploads(prev => ({ ...prev, [accountId]: { fileName: file.name, transactions, done: uncategorized === 0 } }));
      if (uncategorized > 0 && onFileLoad) {
        onFileLoad(accountId, file.name, transactions, (improved) => {
          setUploads(prev => ({ ...prev, [accountId]: { fileName: file.name, transactions: improved, done: true } }));
        });
      } else if (uncategorized === 0 && onFileLoad) {
        onFileLoad(accountId, file.name, transactions, (improved) => {
          setUploads(prev => ({ ...prev, [accountId]: { fileName: file.name, transactions: improved, done: true } }));
        });
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const uploadedCount = Object.keys(uploads).length;
  const allDone = uploadedCount > 0 && Object.values(uploads).every(u => u.done);
  const fg = isDark ? "#fff" : "#111";
  const sub = isDark ? "#888" : "#999";
  const bg = isDark ? "#0f0f13" : "#fff";

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"24px 20px", gap:16, overflowY:"auto", background:bg }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:44, marginBottom:8 }}>📁</div>
        <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:fg }}>Upload kontoudtog</h1>
        <p style={{ margin:"6px 0 0", fontSize:13, color:sub }}>Upload CSV-fil for hver konto</p>
      </div>

      {accounts.map(acc => {
        const type = ACCOUNT_TYPES.find(t => t.id === acc.type);
        const uploaded = uploads[acc.id];
        const label = acc.name || type?.label || "Konto";
        const inputId = "file-input-" + acc.id;

        return (
          <div key={acc.id} style={{ borderRadius:16, overflow:"hidden" }}>
            <label
              htmlFor={inputId}
              style={{
                display:"block", border: "2px dashed " + (uploaded ? "#4CAF50" : "rgba(139,47,201,0.4)"),
                borderRadius:16, padding:"18px 16px",
                background: uploaded ? "rgba(76,175,80,0.05)" : "rgba(139,47,201,0.04)",
                cursor:"pointer"
              }}>
              <input
                id={inputId}
                type="file"
                accept=".csv,.txt"
                style={{ display:"none" }}
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    processFile(acc.id, e.target.files[0]);
                  }
                }}
              />
              <div style={{ display:"flex", alignItems:"center", gap:12, pointerEvents:"none" }}>
                <span style={{ fontSize:28 }}>{type?.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:fg }}>{label}</div>
                  {uploaded ? (
                    uploaded.done
                      ? <div style={{ fontSize:12, color:"#4CAF50", marginTop:2 }}>✓ {uploaded.fileName} · {uploaded.transactions.length} transaktioner</div>
                      : <div style={{ fontSize:12, color:"#c084fc", marginTop:2 }}>✨ AI kategoriserer...</div>
                  ) : (
                    <div style={{ fontSize:12, color:sub, marginTop:2 }}>Tryk for at vælge CSV-fil</div>
                  )}
                </div>
                {uploaded && uploaded.done && <span style={{ fontSize:20 }}>✅</span>}
              </div>
            </label>
          </div>
        );
      })}

      <button
        onClick={() => allDone && onComplete(uploads)}
        style={{
          background: allDone ? "linear-gradient(135deg,#8b2fc9,#e040fb)" : "rgba(128,128,128,0.3)",
          border:"none", borderRadius:14, padding:"16px", color:"#fff",
          fontSize:15, fontWeight:700, cursor: allDone ? "pointer" : "default",
          marginTop:"auto", opacity: allDone ? 1 : 0.6
        }}>
        {uploadedCount === 0 ? "Upload mindst én CSV-fil" : !allDone ? "✨ AI kategoriserer..." : "Se overblik (" + uploadedCount + "/" + accounts.length + " konti) →"}
      </button>
    </div>
  );
}



// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState("intro");
  const [authView, setAuthView] = useState("login"); // login | signup
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [session, setSession] = useState(() => localStorage.getItem("okonom-session") || null);
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem("okonom-refresh") || null);
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("okonom-email") || null);
  const [dataLoading, setDataLoading] = useState(false); // setup | upload | app
  const [accounts, setAccounts] = useState([]);
  const [uploads, setUploads] = useState({});
  const [activeAccount, setActiveAccount] = useState("all"); // "all" or account id
  const [view, setView] = useState("overview");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedMonthCategory, setSelectedMonthCategory] = useState(null);
  const [selectedCategoryMonth, setSelectedCategoryMonth] = useState(null);
  const [conversations, setConversations] = useState(() => {
    try { return JSON.parse(localStorage.getItem("okonom-conversations") || "[]"); } catch { return []; }
  });
  const [activeConvId, setActiveConvId] = useState(null); // null = conversation list
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("okonom-conversations", JSON.stringify(conversations));
  }, [conversations]);

  const activeConv = conversations.find(c => c.id === activeConvId);
  const aiMessages = activeConv?.messages || [];

  const createNewConversation = () => {
    if (conversations.length >= 10) return;
    const id = Date.now();
    const newConv = { id, title: "Ny samtale", createdAt: new Date().toLocaleDateString("da-DK"), messages: [] };
    setConversations(prev => [newConv, ...prev]);
    setActiveConvId(id);
  };

  const deleteConversation = (id) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) setActiveConvId(null);
  };

  const updateConvMessages = (id, messages) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== id) return c;
      // Auto-title from first user message
      const title = messages.find(m => m.role === "user")?.content?.slice(0, 40) || "Ny samtale";
      return { ...c, messages, title };
    }));
  };
  const [privacyAccepted, setPrivacyAccepted] = useState(() => localStorage.getItem("okonom-privacy") === "true");
  const [customRules, setCustomRules] = useState(() => {
    try { return JSON.parse(localStorage.getItem("okonom-rules") || "{}"); } catch { return {}; }
  });

  // Extract a fuzzy key: strip month names, numbers, and trailing words
  // "Elregning Oktober 2024" → "elregning"
  // "Husleje Januar" → "husleje"
  // "Netflix abonnement" → "netflix abonnement"
  const getRuleKey = useCallback((description) => {
    const months = ["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december","jan","feb","mar","apr","jun","jul","aug","sep","okt","nov","dec"];
    const words = (description || "").toLowerCase().trim().split(/\s+/);
    // Remove words that are months, pure numbers, or year-like (4 digits)
    const filtered = words.filter(w => !months.includes(w) && !/^\d+$/.test(w));
    // Take first 2 significant words as key
    return filtered.slice(0, 2).join(" ") || words[0] || "";
  }, []);

  const applyCustomRule = useCallback((description) => {
    // First try exact match, then fuzzy key
    const exact = (description || "").toLowerCase().trim();
    const fuzzy = getRuleKey(description);
    return customRules[exact] || customRules[fuzzy] || null;
  }, [customRules, getRuleKey]);

  const saveCustomRule = useCallback((description, newCategory) => {
    // Save both exact and fuzzy key so both match
    const exact = (description || "").toLowerCase().trim();
    const fuzzy = getRuleKey(description);
    const updated = { ...customRules, [exact]: newCategory, [fuzzy]: newCategory };
    setCustomRules(updated);
    localStorage.setItem("okonom-rules", JSON.stringify(updated));
  }, [customRules, getRuleKey]);
  const [isDark, setIsDark] = useState(() => (localStorage.getItem("okonom-theme") || "dark") === "dark");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [categoryEditorTx, setCategoryEditorTx] = useState(null);
  const [aiCategorizing, setAiCategorizing] = useState(false);
  const [categorizingProgress, setCategorizingProgress] = useState({ done: 0, total: 0 });
  const [savingsPlan, setSavingsPlan] = useState(null); // { monthlyAmount, goal, months, tips } // transaction being recategorized
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subscriptionPopup, setSubscriptionPopup] = useState(false);
  const chatEndRef = useRef(null);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("okonom-theme", next ? "dark" : "light");
  };

  // Auth functions
  const authFetch = async (action, extra = {}) => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email: authEmail, password: authPassword, ...extra }),
      });
      const data = await r.json();
      if (data.error) { setAuthError(data.error); return false; }
      localStorage.setItem("okonom-session", data.session);
      localStorage.setItem("okonom-refresh", data.refresh);
      localStorage.setItem("okonom-email", authEmail || userEmail);
      setSession(data.session);
      setRefreshToken(data.refresh);
      setUserEmail(authEmail || userEmail);
      return data.session;
    } catch (e) {
      setAuthError("Netværksfejl — prøv igen");
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const login = async () => {
    const s = await authFetch("login");
    if (s) { await loadUserData(s); }
  };

  const signup = async () => {
    if (authPassword !== authConfirmPassword) {
      setAuthError("Adgangskoderne matcher ikke");
      return;
    }
    if (authPassword.length < 6) {
      setAuthError("Adgangskoden skal være mindst 6 tegn");
      return;
    }
    const s = await authFetch("signup");
    if (s) setStep("setup");
  };

  const logout = () => {
    localStorage.removeItem("okonom-session");
    localStorage.removeItem("okonom-refresh");
    localStorage.removeItem("okonom-email");
    setSession(null); setRefreshToken(null); setUserEmail(null);
    setUploads({}); setAccounts([]);
    setStep("intro");
  };

  const loadUserData = async (token) => {
    setDataLoading(true);
    try {
      const r = await fetch("/api/userdata", {
        headers: { "Authorization": "Bearer " + token }
      });
      const data = await r.json();
      if (data.accounts?.length > 0 && data.transactions?.length > 0) {
        // Rebuild accounts and uploads from saved data
        const savedAccounts = data.accounts;
        const savedUploads = {};
        data.transactions.forEach(t => {
          // Dates need to be restored as Date objects
          const txns = (t.transactions || []).map(tx => ({
            ...tx,
            date: tx.date ? new Date(tx.date) : null,
            isIncome: tx.amount > 0,
          }));
          savedUploads[t.account_id] = { fileName: "gemt", transactions: txns, done: true };
        });
        setAccounts(savedAccounts);
        setUploads(savedUploads);
        setActiveAccount("all");
        setStep("app");
      } else {
        setStep("setup");
      }
    } catch (e) {
      setStep("setup");
    } finally {
      setDataLoading(false);
    }
  };

  const saveUserData = async () => {
    if (!session) return;
    try {
      const accountData = accounts
        .filter(a => uploads[a.id])
        .map(a => {
          const type = ACCOUNT_TYPES.find(t => t.id === a.type);
          return {
            account_id: String(a.id),
            account_label: a.name || type?.label || "Konto",
            account_type: a.type,
            transactions: uploads[a.id].transactions,
          };
        });
      await fetch("/api/userdata", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + session },
        body: JSON.stringify({ accounts, accountData }),
      });
    } catch {}
  };

  // Auto-login if session exists
  useEffect(() => {
    if (session && step === "intro") {
      loadUserData(session);
    }
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  // Get active transactions
  const activeTransactions = useMemo(() => {
    let txns;
    if (activeAccount === "all") {
      txns = Object.values(uploads).flatMap(u => u.transactions);
    } else {
      txns = uploads[activeAccount]?.transactions || [];
    }
    // Apply custom rules using both exact and fuzzy matching
    const months = ["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december","jan","feb","mar","apr","jun","jul","aug","sep","okt","nov","dec"];
    const getFuzzyKey = (desc) => {
      const words = (desc || "").toLowerCase().trim().split(/\s+/);
      const filtered = words.filter(w => !months.includes(w) && !/^\d+$/.test(w));
      return filtered.slice(0,2).join(" ") || words[0] || "";
    };
    return txns.map(t => {
      const exact = (t.description || "").toLowerCase().trim();
      const fuzzy = getFuzzyKey(t.description);
      const custom = customRules[exact] || customRules[fuzzy];
      if (!custom) return t;
      const rule = CATEGORY_RULES.find(r => r.category === custom.category);
      return { ...t, category: custom.category, icon: rule?.icon || custom.icon || "📌", color: rule?.color || custom.color || "#78909C" };
    });
  }, [activeAccount, uploads, customRules]);

  const expenses = useMemo(() => activeTransactions.filter(t => t.amount < 0), [activeTransactions]);
  const income = useMemo(() => activeTransactions.filter(t => t.amount > 0), [activeTransactions]);
  const totalExpenses = useMemo(() => expenses.reduce((s,t) => s + Math.abs(t.amount), 0), [expenses]);
  const totalIncome = useMemo(() => income.reduce((s,t) => s + t.amount, 0), [income]);

  const byMonth = useMemo(() => {
    const map = {};
    // Only expenses for byMonth totals
    expenses.forEach(t => {
      if (!t.date) return;
      const key = t.date.getFullYear() + "-" + String(t.date.getMonth()).padStart(2,"0");
      if (!map[key]) map[key] = { key, year:t.date.getFullYear(), month:t.date.getMonth(), total:0, items:[], income:0 };
      map[key].total += Math.abs(t.amount);
      map[key].items.push(t);
    });
    // Add income per month
    income.forEach(t => {
      if (!t.date) return;
      const key = t.date.getFullYear() + "-" + String(t.date.getMonth()).padStart(2,"0");
      if (map[key]) map[key].income += t.amount;
    });
    return Object.values(map).sort((a,b) => b.key.localeCompare(a.key));
  }, [expenses, income]);

  const byCategory = useMemo(() => {
    const map = {};
    // Include all transactions (expenses + income) in categories
    activeTransactions.forEach(t => {
      if (!map[t.category]) map[t.category] = { category:t.category, icon:t.icon, color:t.color, total:0, items:[], isIncome: t.isIncome };
      map[t.category].total += Math.abs(t.amount);
      map[t.category].items.push(t);
    });
    return Object.values(map).sort((a,b) => b.total - a.total);
  }, [activeTransactions]);

  const maxMonthTotal = useMemo(() => Math.max(...byMonth.map(m => m.total), 1), [byMonth]);
  const maxCatTotal = useMemo(() => Math.max(...byCategory.map(c => c.total), 1), [byCategory]);

  const selMonth = byMonth.find(m => m.key === selectedMonth);
  const selCat = byCategory.find(c => c.category === selectedCategory);

  // Holger AI
  const buildContext = useCallback(() => {
    const allTransactions = Object.entries(uploads).flatMap(([accId, u]) => {
      const acc = accounts.find(a => String(a.id) === String(accId));
      const type = ACCOUNT_TYPES.find(t => t.id === acc?.type);
      const label = acc?.name || type?.label || "Konto";
      return u.transactions.map(t => ({ ...t, accountLabel: label }));
    });

    const accountSummaries = accounts.map(acc => {
      const type = ACCOUNT_TYPES.find(t => t.id === acc.type);
      const label = acc.name || type?.label || "Konto";
      const txns = uploads[acc.id]?.transactions || [];
      const inc = txns.filter(t => t.amount > 0).reduce((s,t) => s + t.amount, 0);
      const exp = txns.filter(t => t.amount < 0).reduce((s,t) => s + Math.abs(t.amount), 0);
      return label + ": Indkomst " + Math.round(inc) + " kr, Udgifter " + Math.round(exp) + " kr, Netto " + Math.round(inc-exp) + " kr";
    }).join("\n");

    const catLines = byCategory.map(c =>
      "- " + c.category + ": " + Math.round(c.total) + " kr (" + c.items.length + " køb)"
    ).join("\n");

    const transByCat = byCategory.map(cat => {
      const txLines = cat.items
        .sort((a,b) => (b.date||0)-(a.date||0))
        .slice(0,20)
        .map(t => "  * " + t.dateStr + ": " + t.description + " — " + Math.abs(t.amount) + " kr" + (t.accountLabel ? " [" + t.accountLabel + "]" : ""))
        .join("\n");
      return cat.category + " (" + Math.round(cat.total) + " kr):\n" + txLines;
    }).join("\n\n");

    return { accountSummaries, catLines, transByCat, totalIncome: Math.round(totalIncome), totalExpenses: Math.round(totalExpenses) };
  }, [uploads, accounts, byCategory, totalIncome, totalExpenses]);

  const sendAiMessage = useCallback(async (text) => {
    if (!text.trim() || aiLoading || !activeConvId) return;
    const userMsg = { role: "user", content: text };
    const newMessages = [...aiMessages, userMsg];
    updateConvMessages(activeConvId, newMessages);
    setAiInput("");
    setAiLoading(true);
    track("chat_message", text.slice(0, 200));

    const ctx = buildContext();
    const systemPrompt = `Du er Holger, dansk privatøkonomisk coach. Vær KORTFATTET - max 4 sætninger medmindre der bedes om en plan. Ingen hilsener. Ingen markdown. Svar på dansk.

HARD REGEL: Du må under INGEN omstændigheder vejlede om investeringer, aktier, fonde, ETF'er, kryptovaluta eller andre finansielle produkter. Hvis nogen spørger, skal du afvise høfligt og tilbyde at hjælpe med budget og opsparing i stedet.

Interne overførsler må IKKE tælles som udgifter.

KONTI OVERSIGT:
` + ctx.accountSummaries + `

SAMLEDE UDGIFTER PR. KATEGORI:
` + ctx.catLines + `

ALLE TRANSAKTIONER MED DATO, BELØB OG KONTO:
` + ctx.transByCat + `

Husk samtalehistorik. Brug aldrig ** eller markdown.`;

    try {
      const history = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 600, system: systemPrompt, messages: history }),
      });
      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); } catch(e) { throw new Error("Parse fejl: " + raw.slice(0,100)); }
      if (data.error) throw new Error(data.error.message);
      const reply = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "Intet svar.";
      updateConvMessages(activeConvId, [...newMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      updateConvMessages(activeConvId, [...newMessages, { role: "assistant", content: "Fejl: " + err.message }]);
    }
    setAiLoading(false);
  }, [aiMessages, aiLoading, buildContext, activeConvId]);

  const goBack = () => {
    if (view === "month-category") setView("month");
    else if (view === "category-month") setView("category");
    else if (view === "month") setView("months");
    else if (view === "category") setView("categories");
    else setView("overview");
  };

  const S = makeStyles(isDark);

  // ── SETUP STEP ──
  // ── INTRO STEP ──
  if (step === "intro") {
    const bg = isDark ? "#0f0f13" : "#fff";
    const fg = isDark ? "#fff" : "#111";
    const sub = isDark ? "#999" : "#666";
    return (
      <div style={S.shell}>
        <div style={{ ...S.phone, display:"flex", flexDirection:"column", position:"relative", overflow: aiCategorizing ? "visible" : "hidden" }}>
          <div style={{ padding:"16px 20px 0", display:"flex", justifyContent:"flex-end", flexShrink:0 }}>
            <button onClick={toggleTheme} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer" }}>{isDark ? "☀️" : "🌙"}</button>
          </div>
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 28px 40px", gap:0 }}>

            {/* Holger avatar */}
            <div style={{ fontSize:80, marginBottom:16, filter:"drop-shadow(0 8px 24px rgba(139,47,201,0.4))" }}>👴🏼</div>

            {/* App name */}
            <h1 style={{ margin:"0 0 4px", fontSize:32, fontWeight:800, color:fg, letterSpacing:-1 }}>Økonom</h1>
            <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(224,64,251,0.12)", border:"1px solid rgba(224,64,251,0.3)", borderRadius:20, padding:"4px 14px", marginBottom:28 }}>
              <span style={{ fontSize:11 }}>✨</span>
              <span style={{ fontSize:11, color:"#c084fc", fontWeight:600 }}>AI-drevet privatøkonomi</span>
            </div>

            {/* Holger speech bubble */}
            <div style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)", borderRadius:"4px 18px 18px 18px", padding:"16px 18px", marginBottom:32, position:"relative" }}>
              <p style={{ margin:0, fontSize:14, color:fg, lineHeight:1.7 }}>
                Hej! Jeg hedder <strong>Holger</strong> — din personlige privatøkonomiske coach.
              </p>
              <p style={{ margin:"10px 0 0", fontSize:13, color:sub, lineHeight:1.7 }}>
                Jeg kan hjælpe dig med at:
              </p>
              <div style={{ margin:"8px 0 0", display:"flex", flexDirection:"column", gap:6 }}>
                {[
                  "📊 Få overblik over dit forbrug",
                  "🔍 Finde mønstre i din økonomi",
                  "💡 Identificere hvor du kan spare",
                  "🏦 Analysere flere konti på én gang",
                  "📈 Lave en realistisk opsparingsplan",
                ].map(item => (
                  <div key={item} style={{ fontSize:13, color:sub, lineHeight:1.5 }}>{item}</div>
                ))}
              </div>
              <p style={{ margin:"12px 0 0", fontSize:13, color:sub, lineHeight:1.7 }}>
                Upload dit kontoudtog som CSV-fil, og jeg går i gang med det samme.
              </p>
            </div>

            {/* CTA button */}
            <button
              onClick={() => setStep("auth")}
              style={{ width:"100%", background:"linear-gradient(135deg,#8b2fc9,#e040fb)", border:"none", borderRadius:16, padding:"18px", color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer", boxShadow:"0 8px 24px rgba(139,47,201,0.4)", letterSpacing:0.3 }}>
              Kom i gang →
            </button>

            <p style={{ margin:"16px 0 0", fontSize:11, color: isDark ? "#555" : "#bbb", textAlign:"center" }}>
              Dine data forlader aldrig din enhed uden din tilladelse
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── AUTH STEP ──
  if (step === "auth") {
    const bg = isDark ? "#0f0f13" : "#fff";
    const fg = isDark ? "#fff" : "#111";
    const sub = isDark ? "#888" : "#666";
    const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
    const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
    const isLogin = authView === "login";

    if (dataLoading) return (
      <div style={S.shell}>
        <div style={{ ...S.phone, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20, background:bg }}>
          <div style={{ fontSize:64 }}>👴🏼</div>
          <div style={{ fontSize:16, fontWeight:700, color:fg }}>Henter dine data...</div>
          <div style={{ width:200, height:6, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:"60%", background:"linear-gradient(90deg,#8b2fc9,#e040fb)", borderRadius:3, animation:"pulse 1s infinite" }} />
          </div>
        </div>
      </div>
    );

    return (
      <div style={S.shell}>
        <div style={{ ...S.phone, display:"flex", flexDirection:"column", background:bg }}>
          <div style={{ padding:"16px 20px 0", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <button onClick={() => setStep("intro")} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:fg }}>←</button>
          </div>
          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 28px 40px", gap:20 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:52, marginBottom:10 }}>👴🏼</div>
              <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:fg }}>{isLogin ? "Velkommen tilbage" : "Opret konto"}</h1>
              <p style={{ margin:"6px 0 0", fontSize:13, color:sub }}>{isLogin ? "Log ind for at hente dine data" : "Gem dine data og slip for at uploade igen"}</p>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (isLogin ? login() : signup())}
                style={{ background:inputBg, border:"1px solid "+border, borderRadius:12, padding:"13px 16px", color:fg, fontSize:14, outline:"none", width:"100%", boxSizing:"border-box" }}
              />
              <input
                type="password"
                placeholder="Adgangskode"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (isLogin ? login() : signup())}
                style={{ background:inputBg, border:"1px solid "+border, borderRadius:12, padding:"13px 16px", color:fg, fontSize:14, outline:"none", width:"100%", boxSizing:"border-box" }}
              />
              {!isLogin && (
                <input
                  type="password"
                  placeholder="Bekræft adgangskode"
                  value={authConfirmPassword}
                  onChange={e => setAuthConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && signup()}
                  style={{ background:inputBg, border:"1px solid "+(authConfirmPassword && authConfirmPassword !== authPassword ? "#ef4444" : border), borderRadius:12, padding:"13px 16px", color:fg, fontSize:14, outline:"none", width:"100%", boxSizing:"border-box" }}
                />
              )}
              {authError && <div style={{ fontSize:13, color:"#ef4444", textAlign:"center" }}>{authError}</div>}
            </div>

            <button
              onClick={isLogin ? login : signup}
              disabled={authLoading || !authEmail || !authPassword}
              style={{ background: authLoading || !authEmail || !authPassword ? "rgba(128,128,128,0.3)" : "linear-gradient(135deg,#8b2fc9,#e040fb)", border:"none", borderRadius:14, padding:"16px", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer" }}>
              {authLoading ? "Vent..." : isLogin ? "Log ind" : "Opret konto"}
            </button>

            <div style={{ textAlign:"center" }}>
              <button onClick={() => { setAuthView(isLogin ? "signup" : "login"); setAuthError(""); setAuthConfirmPassword(""); }}
                style={{ background:"none", border:"none", color:"#9333ea", fontSize:13, cursor:"pointer" }}>
                {isLogin ? "Har du ikke en konto? Opret her" : "Har du allerede en konto? Log ind"}
              </button>
            </div>

            <div style={{ borderTop:"1px solid "+border, paddingTop:16, textAlign:"center" }}>
              <button onClick={() => setStep("setup")}
                style={{ background:"none", border:"none", color:sub, fontSize:12, cursor:"pointer" }}>
                Fortsæt uden konto →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "setup") {
    return (
      <div style={S.shell}>
        <div style={{ ...S.phone, display:"flex", flexDirection:"column", position:"relative", overflow: aiCategorizing ? "visible" : "hidden" }}>
          <div style={{ padding:"20px 20px 0", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
            <h2 style={{ margin:0, fontSize:22, fontWeight:800, color: isDark ? "#fff" : "#111" }}>Økonom</h2>
            <button onClick={toggleTheme} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer" }}>{isDark ? "☀️" : "🌙"}</button>
          </div>
          <AccountSetup isDark={isDark} onComplete={accs => { setAccounts(accs); setStep("upload"); }} />
        </div>
      </div>
    );
  }

  // ── UPLOAD STEP ──
  if (step === "upload") {
    return (
      <div style={S.shell}>
        <div style={{ ...S.phone, display:"flex", flexDirection:"column", position:"relative", overflow: aiCategorizing ? "visible" : "hidden" }}>

          <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <button onClick={() => setStep("setup")} style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border:"none", borderRadius:10, width:32, height:32, cursor:"pointer", color: isDark ? "#fff" : "#333" }}>←</button>
            <h2 style={{ margin:0, fontSize:20, fontWeight:800, color: isDark ? "#fff" : "#111" }}>Upload kontoudtog</h2>
          </div>
          <CSVUpload accounts={accounts} isDark={isDark}
            onFileLoad={(accountId, fileName, transactions, onDone) => {
              const uncategorizedCount = transactions.filter(t => t.category === "Andet").length;
              track("csv_upload", null, { transactions: transactions.length });
              if (uncategorizedCount > 0) {
                setAiCategorizing(true);
                setCategorizingProgress({ done: 0, total: uncategorizedCount });
                aiCategorize(transactions, (done, total) => {
                  setCategorizingProgress({ done, total });
                }).then(improved => {
                  onDone(improved);
                  setAiCategorizing(false);
                }).catch(() => {
                  onDone(transactions);
                  setAiCategorizing(false);
                });
              } else {
                // No uncategorized transactions — mark as done immediately
                onDone(transactions);
              }
            }}
            onComplete={ups => {
            setUploads(ups);
            setActiveAccount("all");
            setStep("app");
            track("session_start", null, { accounts: Object.keys(ups).length });
            // Save to cloud if logged in
            if (session) {
              const accountData = accounts.filter(a => ups[a.id]).map(a => {
                const type = ACCOUNT_TYPES.find(t => t.id === a.type);
                return { account_id: String(a.id), account_label: a.name || type?.label || "Konto", account_type: a.type, transactions: ups[a.id].transactions };
              });
              fetch("/api/userdata", { method:"POST", headers:{"Content-Type":"application/json","Authorization":"Bearer "+session}, body: JSON.stringify({ accounts, accountData }) }).catch(()=>{});
            }
          }} />
        </div>
      </div>
    );
  }

  // ── APP ──
  const accountTabs = [
    { id: "all", label: "Alle", icon: "📊" },
    ...accounts.filter(a => uploads[a.id]).map(a => {
      const type = ACCOUNT_TYPES.find(t => t.id === a.type);
      return { id: String(a.id), label: a.name || type?.label || "Konto", icon: type?.icon || "🏦" };
    })
  ];

  const showBack = ["month","category","months","categories","month-category","category-month"].includes(view);
  const titles = {
    overview:"Overblik", months:"Måneder", categories:"Kategorier", ai:"Holger",
    month: selMonth ? MDA[selMonth.month] + " " + selMonth.year : "",
    category: selectedCategory || "",
    "month-category": selectedMonthCategory || "",
    "category-month": selectedCategoryMonth ? MDA[byMonth.find(m=>m.key===selectedCategoryMonth)?.month??0] + " " + (byMonth.find(m=>m.key===selectedCategoryMonth)?.year??"") : "",
  };

  return (
    <div style={S.shell}>
      <div style={S.phone}>
        {/* ACCOUNT TABS */}
        <div style={{ flexShrink:0, overflowX:"auto", display:"flex", gap:6, padding:"10px 14px 6px", borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)", scrollbarWidth:"none" }}>
          {accountTabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveAccount(tab.id); setView("overview"); }}
              style={{ flexShrink:0, background: activeAccount===tab.id ? "linear-gradient(135deg,#8b2fc9,#e040fb)" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"), border:"none", borderRadius:20, padding:"5px 12px", color: activeAccount===tab.id ? "#fff" : (isDark ? "#aaa" : "#666"), fontSize:12, fontWeight: activeAccount===tab.id ? 700 : 400, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
          <button onClick={() => setSettingsOpen(true)}
            style={{ flexShrink:0, marginLeft:"auto", background:"none", border:"none", color: isDark ? "#888" : "#999", fontSize:20, cursor:"pointer", padding:"0 4px" }}>⚙️</button>
        </div>

        <div style={S.appLayout}>
          {/* HEADER */}
          <div style={S.header}>
            {showBack && <button style={S.backBtn} onClick={goBack}>←</button>}
            <div style={{ flex:1, minWidth:0 }}>
              <h2 style={S.headerTitle}>{titles[view]}</h2>
            </div>

            {view === "ai" && activeConvId && (
              <button style={S.resetBtn} onClick={() => setActiveConvId(null)} title="Samtaler">💬</button>
            )}
          </div>

          {/* SCROLL AREA */}
          <div style={{ ...S.scroll, display: (view === "ai" || view === "savings") ? "none" : "flex" }}>

            {view === "overview" && (() => {
              const net = totalIncome - totalExpenses;
              return <>
                <div style={S.heroCard}>
                  <span style={S.heroLabel}>Nettoresultat</span>
                  <span style={{ ...S.heroAmount, color: net >= 0 ? "#4ade80" : "#ef4444" }}>
                    {net >= 0 ? "+" : "-"}{fmt(Math.abs(net))}
                  </span>
                  <div style={S.heroRow}>
                    <span style={S.heroSub}>↑ {fmt(totalIncome)}</span>
                    <span style={{ width:1, alignSelf:"stretch", background:"rgba(255,255,255,0.15)" }} />
                    <span style={S.heroSub}>↓ {fmt(totalExpenses)}</span>
                  </div>
                </div>
                <div style={S.section}>
                  <span style={S.sectionTitle}>🔥 Største udgifter</span>
                  {byCategory.slice(0,3).map(c => <CatRow key={c.category} c={c} max={maxCatTotal} onClick={() => { setSelectedCategory(c.category); setView("category"); }} S={S} />)}
                </div>
                <div style={S.section}>
                  <span style={S.sectionTitle}>📅 Seneste måneder</span>
                  {byMonth.slice(0,3).map(m => <MonthRow key={m.key} m={m} max={maxMonthTotal} onClick={() => { setSelectedMonth(m.key); setView("month"); }} S={S} />)}
                </div>
                <div style={S.statRow}>
                  {[[activeTransactions.length,"Transaktioner"],[byMonth.length,"Måneder"],[byCategory.length,"Kategorier"]].map(([n,l]) => (
                    <div key={l} style={S.statBox}>
                      <span style={S.statNum}>{n}</span>
                      <span style={S.statLabel}>{l}</span>
                    </div>
                  ))}
                </div>
              </>;
            })()}

            {view === "months" && (
              <div style={S.section}>
                <span style={S.sectionTitle}>Alle måneder</span>
                {byMonth.map(m => <MonthRow key={m.key} m={m} max={maxMonthTotal} onClick={() => { setSelectedMonth(m.key); setView("month"); }} S={S} />)}
              </div>
            )}

            {view === "categories" && (
              <div style={S.section}>
                <span style={S.sectionTitle}>Alle kategorier</span>
                {byCategory.map(c => <CatRow key={c.category} c={c} max={maxCatTotal} onClick={() => { setSelectedCategory(c.category); setView("category"); }} S={S} />)}
              </div>
            )}

            {view === "month" && selMonth && (() => {
              const cats = {};
              // Only expense transactions for category breakdown
              selMonth.items.filter(t => t.amount < 0).forEach(t => {
                if (!cats[t.category]) cats[t.category] = { ...t, total:0, count:0 };
                cats[t.category].total += Math.abs(t.amount);
                cats[t.category].count++;
              });
              const sorted = Object.values(cats).sort((a,b) => b.total-a.total);
              const max = sorted[0]?.total || 1;
              return <>
                {/* Month income vs expenses summary */}
                <div style={{ background: isDark ? "linear-gradient(135deg,#1a0a2e,#2d1060)" : "linear-gradient(135deg,#f3e8ff,#ede9fe)", border: isDark ? "1px solid rgba(224,64,251,0.2)" : "1px solid rgba(139,47,201,0.15)", borderRadius:18, padding:"16px 20px", flexShrink:0, display:"flex", flexDirection:"column", gap:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ textAlign:"center", flex:1 }}>
                      <div style={{ fontSize:11, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)", fontWeight:500, letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>Indkomst</div>
                      <div style={{ fontSize:22, fontWeight:800, color:"#22c55e", letterSpacing:-0.5 }}>+{fmt(selMonth.income || 0)}</div>
                    </div>
                    <div style={{ width:1, height:40, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }} />
                    <div style={{ textAlign:"center", flex:1 }}>
                      <div style={{ fontSize:11, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)", fontWeight:500, letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>Udgifter</div>
                      <div style={{ fontSize:22, fontWeight:800, color:"#ef4444", letterSpacing:-0.5 }}>-{fmt(selMonth.total)}</div>
                    </div>
                  </div>
                  {/* Net result bar */}
                  <div style={{ borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)", paddingTop:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:12, color: isDark ? "#aaa" : "#777" }}>Nettoresultat</span>
                    <span style={{ fontSize:16, fontWeight:800, color: (selMonth.income||0) - selMonth.total >= 0 ? "#22c55e" : "#ef4444", letterSpacing:-0.3 }}>
                      {(selMonth.income||0) - selMonth.total >= 0 ? "+" : "-"}{fmt(Math.abs((selMonth.income||0) - selMonth.total))}
                    </span>
                  </div>
                </div>
                <div style={S.section}>
                  <span style={S.sectionTitle}>Fordeling</span>
                  {sorted.map(c => <CatRow key={c.category} c={c} max={max} count={c.count} onClick={() => { setSelectedMonthCategory(c.category); setView("month-category"); }} S={S} />)}
                </div>
                <div style={S.section}>
                  <span style={S.sectionTitle}>Alle transaktioner</span>
                  {[...selMonth.items].filter(t => t.amount < 0).sort((a,b) => (b.date||0)-(a.date||0)).map(t => <TRow key={t.id} t={t} S={S} onEdit={setCategoryEditorTx} />)}
                </div>
              </>;
            })()}

            {view === "category" && selCat && (() => {
              const mmap = {};
              selCat.items.forEach(t => {
                if (!t.date) return;
                const k = t.date.getFullYear() + "-" + String(t.date.getMonth()).padStart(2,"0");
                if (!mmap[k]) mmap[k] = { k, year:t.date.getFullYear(), month:t.date.getMonth(), total:0 };
                mmap[k].total += Math.abs(t.amount);
              });
              const months = Object.values(mmap).sort((a,b) => b.k.localeCompare(a.k));
              const maxM = months[0]?.total || 1;
              return <>
                <div style={S.detailHero}>
                  <span style={{ fontSize:36 }}>{selCat.icon}</span>
                  <span style={{ ...S.detailTotal, color: selCat.category === "Lønindtægt" ? "#22c55e" : "#ef4444" }}>
                    {selCat.category === "Lønindtægt" ? "+" : "-"}{fmt(selCat.total)}
                  </span>
                  <span style={S.detailSub}>{selCat.items.length} transaktioner</span>
                </div>
                {months.length > 0 && (
                  <div style={S.section}>
                    <span style={S.sectionTitle}>Per måned</span>
                    {months.map(m => (
                      <div key={m.k} style={{ ...S.row, cursor:"pointer" }} onClick={() => { setSelectedCategoryMonth(m.k); setView("category-month"); }}>
                        <div style={{ minWidth:80 }}><div style={S.rowTitle}>{MDA[m.month]} {m.year}</div></div>
                        <div style={S.barTrack}><div style={{ ...S.barFill, width:((m.total/maxM)*100) + "%", background:selCat.color }} /></div>
                        <span style={{ ...S.rowAmt, color: selCat.category === "Lønindtægt" ? "#22c55e" : "#ef4444" }}>
                          {selCat.category === "Lønindtægt" ? "+" : "-"}{fmt(m.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={S.section}>
                  <span style={S.sectionTitle}>Alle transaktioner</span>
                  {[...selCat.items].sort((a,b) => (b.date||0)-(a.date||0)).map(t => <TRow key={t.id} t={t} S={S} onEdit={setCategoryEditorTx} />)}
                </div>
              </>;
            })()}

            {view === "month-category" && selMonth && (() => {
              const items = selMonth.items.filter(t => t.category === selectedMonthCategory);
              const cat = byCategory.find(c => c.category === selectedMonthCategory);
              const total = items.reduce((s,t) => s + Math.abs(t.amount), 0);
              return <>
                <div style={S.detailHero}>
                  {cat && <span style={{ fontSize:32 }}>{cat.icon}</span>}
                  <span style={S.detailTotal}>-{fmt(total)}</span>
                  <span style={S.detailSub}>{items.length} transaktioner · {MDA[selMonth.month]} {selMonth.year}</span>
                </div>
                <div style={S.section}>
                  <span style={S.sectionTitle}>Transaktioner</span>
                  {items.sort((a,b) => (b.date||0)-(a.date||0)).map(t => <TRow key={t.id} t={t} S={S} onEdit={setCategoryEditorTx} />)}
                </div>
              </>;
            })()}

            {view === "category-month" && selCat && (() => {
              const mKey = selectedCategoryMonth;
              const mData = byMonth.find(m => m.key === mKey);
              const items = selCat.items.filter(t => {
                if (!t.date) return false;
                return (t.date.getFullYear() + "-" + String(t.date.getMonth()).padStart(2,"0")) === mKey;
              });
              const total = items.reduce((s,t) => s + Math.abs(t.amount), 0);
              return <>
                <div style={S.detailHero}>
                  <span style={{ fontSize:32 }}>{selCat.icon}</span>
                  <span style={{ ...S.detailTotal, color: selCat.category === "Lønindtægt" ? "#22c55e" : "#ef4444" }}>
                    {selCat.category === "Lønindtægt" ? "+" : "-"}{fmt(total)}
                  </span>
                  <span style={S.detailSub}>{items.length} transaktioner · {mData ? MDA[mData.month] + " " + mData.year : ""}</span>
                </div>
                <div style={S.section}>
                  <span style={S.sectionTitle}>Transaktioner</span>
                  {items.sort((a,b) => (b.date||0)-(a.date||0)).map(t => <TRow key={t.id} t={t} S={S} onEdit={setCategoryEditorTx} />)}
                </div>
              </>;
            })()}

          </div>

          {/* HOLGER AI */}
          {/* HOLGER AI */}
          {view === "ai" && !privacyAccepted && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", padding:"24px 20px", gap:16 }}>
              <div style={{ fontSize:48 }}>🔒</div>
              <div style={{ fontSize:18, fontWeight:700, color: isDark ? "#fff" : "#111", textAlign:"center" }}>Inden du starter</div>
              <div style={{ fontSize:13, color: isDark ? "#aaa" : "#555", lineHeight:1.7, textAlign:"center", maxWidth:300 }}>
                Når du spørger Holger, sendes et sammendrag af dine transaktioner til Anthropics AI-service.<br/><br/>
                <strong style={{ color: isDark ? "#ddd" : "#333" }}>Dine data:</strong><br/>
                ✓ Læses kun lokalt i din browser<br/>
                ✓ Uploades aldrig til nogen server<br/>
                ✓ Sendes kun til Anthropic når du spørger Holger<br/>
                ✓ Bruges ikke til at træne AI-modeller
              </div>
              <button onClick={() => { setPrivacyAccepted(true); localStorage.setItem("okonom-privacy","true"); }}
                style={{ background:"linear-gradient(135deg,#8b2fc9,#e040fb)", border:"none", borderRadius:14, padding:"14px 32px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", width:"100%" }}>
                Jeg forstår og accepterer
              </button>
              <button onClick={() => setView("overview")} style={{ background:"none", border:"none", color: isDark ? "#666" : "#999", fontSize:13, cursor:"pointer" }}>Gå tilbage</button>
            </div>
          )}

          {view === "ai" && privacyAccepted && !activeConvId && (
            /* CONVERSATION LIST */
            <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
              <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:10, scrollbarWidth:"none" }}>
                <div style={{ textAlign:"center", padding:"16px 0 8px" }}>
                  <div style={{ fontSize:40, marginBottom:6 }}>👴🏼</div>
                  <div style={{ fontSize:15, fontWeight:700, color: isDark ? "#fff" : "#111" }}>Holger</div>
                  <div style={{ fontSize:12, color: isDark ? "#666" : "#999", marginTop:2 }}>Din privatøkonomiske coach</div>
                </div>

                {conversations.length < 10 && (
                  <button onClick={createNewConversation}
                    style={{ background:"linear-gradient(135deg,#8b2fc9,#e040fb)", border:"none", borderRadius:14, padding:"14px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    <span>✏️</span> Ny samtale
                  </button>
                )}

                {conversations.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"24px 0", color: isDark ? "#555" : "#bbb", fontSize:13 }}>
                    Ingen samtaler endnu.<br/>Start en ny samtale med Holger.
                  </div>
                ) : (
                  <div style={S.section}>
                    <span style={S.sectionTitle}>Tidligere samtaler</span>
                    {conversations.map(conv => (
                      <div key={conv.id} style={{ ...S.row, cursor:"pointer", justifyContent:"space-between" }}>
                        <div style={{ flex:1, minWidth:0 }} onClick={() => setActiveConvId(conv.id)}>
                          <div style={{ ...S.rowTitle, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{conv.title}</div>
                          <div style={S.rowSub}>{conv.createdAt} · {conv.messages.length} beskeder</div>
                        </div>
                        <button onClick={() => deleteConversation(conv.id)}
                          style={{ background:"none", border:"none", color:"#ef4444", fontSize:16, cursor:"pointer", padding:"0 4px", flexShrink:0 }}>🗑️</button>
                      </div>
                    ))}
                  </div>
                )}

                {conversations.length >= 10 && (
                  <div style={{ fontSize:12, color: isDark ? "#666" : "#999", textAlign:"center", padding:"8px 0" }}>
                    Max 10 samtaler nået. Slet en samtale for at oprette ny.
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "ai" && privacyAccepted && activeConvId && (
            /* ACTIVE CONVERSATION */
            <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
              {aiMessages.length === 0 ? (
                <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 14px", gap:10 }}>
                  <div style={{ textAlign:"center", paddingBottom:8 }}>
                    <div style={{ fontSize:44, marginBottom:8 }}>👴🏼</div>
                    <div style={{ fontSize:16, fontWeight:700, color: isDark ? "#fff" : "#111", marginBottom:4 }}>Holger</div>
                    <div style={{ fontSize:12, color: isDark ? "#666" : "#999", lineHeight:1.5 }}>Hej! Hvad kan jeg hjælpe dig med?</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {["Hvad bruger jeg flest penge på?","Opsummer mine abonnementer","Hvor kan jeg spare penge?","Lav en visuel opsparingsplan for mig"].map(p => (
                      <button key={p} onClick={() => sendAiMessage(p)}
                        style={{ background:"rgba(224,64,251,0.12)", border:"1px solid rgba(224,64,251,0.35)", borderRadius:14, padding:"13px 16px", color: isDark ? "#fff" : "#333", fontSize:13, fontWeight:500, cursor:"pointer", textAlign:"left", width:"100%" }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ flex:1, overflowY:"auto", minHeight:0, display:"flex", flexDirection:"column", gap:10, padding:"12px 14px", scrollbarWidth:"none" }}>
                  {aiMessages.map((m, i) => (
                    <div key={i} style={{ display:"flex", justifyContent: m.role==="user" ? "flex-end" : "flex-start" }}>
                      <div style={m.role==="user"
                        ? { background:"linear-gradient(135deg,#6a0dad,#e040fb)", color:"#fff", borderRadius:"18px 18px 4px 18px", padding:"10px 14px", fontSize:13, lineHeight:1.5, maxWidth:"78%", whiteSpace:"pre-wrap" }
                        : { background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", color: isDark ? "#e8e8e8" : "#222", borderRadius:"18px 18px 18px 4px", padding:"10px 14px", fontSize:13, lineHeight:1.6, maxWidth:"84%", whiteSpace:"pre-wrap" }}>
                        {m.role==="assistant" ? renderMessage(m.content) : m.content}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div style={{ display:"flex", justifyContent:"flex-start" }}>
                      <div style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", color:"#888", borderRadius:"18px 18px 18px 4px", padding:"10px 14px", fontSize:13 }}>👴🏼 Tænker...</div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
              {/* Generate plan button - shown when Holger has given savings advice */}
              {aiMessages.length >= 2 && (savingsPlan || aiMessages.some(m => m.role === "assistant" && (m.content.toLowerCase().includes("opsparing") || m.content.toLowerCase().includes("spare") || m.content.toLowerCase().includes("spar ")))) && (
                <div style={{ padding:"8px 14px 0", flexShrink:0 }}>
                  <button
                    onClick={() => {
                      // Generate plan from conversation context
                      const allText = aiMessages.map(m => m.content).join(" ");
                      const numMatches = [...allText.matchAll(/(\d[\d.]*\.?\d*)\s*kr/g)];
                      const amounts = numMatches.map(m => parseFloat(m[1].replace(/\./g,""))).filter(n => n >= 500 && n <= 100000);
                      const monthlyAmount = amounts.length > 0
                        ? amounts.sort((a,b) => a-b)[Math.floor(amounts.length/2)]
                        : Math.max(Math.round((totalIncome - totalExpenses) / 12 * 0.8), 1000);
                      const tipLines = allText.split("\n")

                        .filter(l => /^[-*•–]/.test(l.trim()))
                        .map(l => l.replace(/^[-*•–]\s*/, "").trim())
                        .filter(l => l.length > 8 && l.length < 120)
                        .slice(0, 5);
                      setSavingsPlan({
                        monthlyAmount: Math.round(monthlyAmount),
                        months: 24,
                        tips: tipLines,
                        createdAt: new Date().toLocaleDateString("da-DK"),
                      });
                      setView("savings");
                    }}
                    style={{ width:"100%", background:"linear-gradient(135deg,#052e16,#14532d)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:12, padding:"10px 14px", color:"#4ade80", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    <span>📈</span> Se personlig opsparingsplan
                  </button>
                </div>
              )}
              <div style={{ display:"flex", gap:8, padding:"10px 14px 14px", flexShrink:0, borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)", background: isDark ? "#0f0f13" : "#ffffff" }}>
                <input
                  style={{ flex:1, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.15)", borderRadius:22, padding:"11px 16px", color: isDark ? "#fff" : "#111", fontSize:13, outline:"none" }}
                  placeholder="Spørg Holger..."
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendAiMessage(aiInput)}
                />
                <button
                  style={{ width:40, height:40, borderRadius:"50%", border:"none", cursor:"pointer", background:"linear-gradient(135deg,#8b2fc9,#e040fb)", color:"#fff", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, opacity: aiLoading || !aiInput.trim() ? 0.4 : 1 }}
                  onClick={() => sendAiMessage(aiInput)} disabled={aiLoading || !aiInput.trim()}>↑</button>
              </div>
            </div>
          )}

      
          {/* SAVINGS PLAN — full screen outside scroll */}
          {view === "savings" && savingsPlan && (() => {
            const { monthlyAmount, months, tips, createdAt } = savingsPlan;
            const totalGoal = monthlyAmount * months;
            const planData = [];
            let cumulative = 0;
            const now = new Date();
            for (let i = 0; i < months; i++) {
              cumulative += monthlyAmount;
              const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
              planData.push({ label: MDA[d.getMonth()] + " " + String(d.getFullYear()).slice(2), value: cumulative });
            }
            const maxVal = planData[planData.length - 1]?.value || 1;
            const milestones = [0.25, 0.5, 0.75, 1].map((pct, i) => ({
              pct, label: Math.round(totalGoal * pct).toLocaleString("da-DK") + " kr.",
              month: planData.findIndex(p => p.value >= totalGoal * pct) + 1,
              icon: ["🌱","🌿","🌳","🎯"][i], name: ["25% nået","Halvvejs","75% nået","Mål nået!"][i],
            }));

            return (
              <div style={{ flex:1, overflowY:"auto", minHeight:0, scrollbarWidth:"none", display:"flex", flexDirection:"column", gap:10, padding:"12px 14px 8px" }}>
                {/* Hero card */}
                <div style={{ background:"linear-gradient(135deg,#052e16,#14532d)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:20, padding:"20px", display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0 }}>
                  <span style={{ fontSize:11, color:"rgba(255,255,255,0.45)", fontWeight:600, letterSpacing:1.2, textTransform:"uppercase" }}>Din opsparingsplan</span>
                  <span style={{ fontSize:34, fontWeight:800, color:"#4ade80", letterSpacing:-1 }}>{totalGoal.toLocaleString("da-DK")} kr.</span>
                  <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>↑ {monthlyAmount.toLocaleString("da-DK")} kr./md.</span>
                    <span style={{ width:1, height:14, background:"rgba(255,255,255,0.2)" }} />
                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>📅 {months} måneder</span>
                  </div>
                </div>

                {/* Bar chart */}
                <div style={S.section}>
                  <span style={S.sectionTitle}>📈 Vækst måned for måned</span>
                  <div style={{ padding:"8px 12px 16px" }}>
                    <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:100, marginBottom:4 }}>
                      {planData.filter((_, i) => months <= 12 || i % 2 === 0).map((d, i) => (
                        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                          <div style={{ width:"100%", background:"linear-gradient(180deg,#4ade80,#16a34a)", borderRadius:"3px 3px 0 0", height:((d.value/maxVal)*94) + "px", minHeight:3 }} />
                          <span style={{ fontSize:7, color: isDark ? "#555" : "#bbb", whiteSpace:"nowrap" }}>{d.label}</span>
                        </div>
                      ))}
                    </div>
                    {/* Y-axis labels */}
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                      <span style={{ fontSize:10, color: isDark ? "#555" : "#bbb" }}>0 kr.</span>
                      <span style={{ fontSize:10, color:"#4ade80", fontWeight:600 }}>{totalGoal.toLocaleString("da-DK")} kr.</span>
                    </div>
                  </div>
                </div>

                {/* Milestones */}
                <div style={S.section}>
                  <span style={S.sectionTitle}>🏆 Milepæle</span>
                  {milestones.map((m, i) => (
                    <div key={i} style={S.row}>
                      <div style={{ width:36, height:36, borderRadius:10, background:"rgba(34,197,94,0.12)", border:"1.5px solid #22c55e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{m.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={S.rowTitle}>{m.name}</div>
                        <div style={S.rowSub}>{m.label} · måned {m.month}</div>
                      </div>
                      <div style={{ width:50, height:5, background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:(m.pct*100) + "%", background:"#22c55e", borderRadius:3 }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Holgers tips */}
                {tips && tips.length > 0 && (
                  <div style={S.section}>
                    <span style={S.sectionTitle}>👴🏼 Holgers sparetips</span>
                    {tips.map((tip, i) => (
                      <div key={i} style={S.row}>
                        <div style={{ width:26, height:26, borderRadius:8, background:"rgba(147,51,234,0.15)", border:"1px solid rgba(147,51,234,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#c084fc", flexShrink:0 }}>{i+1}</div>
                        <div style={{ ...S.rowTitle, fontWeight:400, fontSize:13 }}>{tip}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ textAlign:"center", paddingBottom:4 }}>
                  <span style={{ fontSize:11, color: isDark ? "#555" : "#bbb" }}>Lavet af Holger · {createdAt}</span>
                </div>

                <button onClick={() => { setSavingsPlan(null); setView("ai"); }}
                  style={{ background:"none", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", borderRadius:12, padding:"11px", color: isDark ? "#888" : "#999", fontSize:13, cursor:"pointer", flexShrink:0 }}>
                  ↩ Tilbage til Holger
                </button>
              </div>
            );
          })()}

          <Nav view={view} setView={setView} isDark={isDark} S={S} hasPlan={!!savingsPlan} />
        </div>

        {/* CATEGORY EDITOR MODAL */}
        {categoryEditorTx && (
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"flex-end", zIndex:100 }} onClick={() => setCategoryEditorTx(null)}>
            <div style={{ width:"100%", background: isDark ? "#1a1a2e" : "#fff", borderRadius:"24px 24px 0 0", padding:"20px 20px 40px", display:"flex", flexDirection:"column", gap:12 }} onClick={e => e.stopPropagation()}>
              <div style={{ width:36, height:4, background:"rgba(128,128,128,0.3)", borderRadius:2, margin:"0 auto 4px" }} />
              <h3 style={{ margin:0, fontSize:16, fontWeight:700, color: isDark ? "#fff" : "#111" }}>Flyt til kategori</h3>
              <div style={{ fontSize:13, color: isDark ? "#888" : "#999", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", borderRadius:10, padding:"10px 12px" }}>
                {categoryEditorTx.description}
              </div>
              <div style={{ fontSize:11, color:"#9333ea", fontWeight:600, marginTop:4 }}>
                Alle transaktioner med samme navn flyttes automatisk
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:340, overflowY:"auto", scrollbarWidth:"none" }}>
                {CATEGORY_RULES.map(rule => (
                  <button key={rule.category}
                    onClick={() => {
                      saveCustomRule(categoryEditorTx.description, { category: rule.category, icon: rule.icon, color: rule.color });
                      setCategoryEditorTx(null);
                    }}
                    style={{ display:"flex", alignItems:"center", gap:12, background: categoryEditorTx.category === rule.category ? "rgba(147,51,234,0.15)" : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"), border: categoryEditorTx.category === rule.category ? "1px solid rgba(147,51,234,0.5)" : (isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.07)"), borderRadius:12, padding:"11px 14px", cursor:"pointer", textAlign:"left" }}>
                    <span style={{ fontSize:20 }}>{rule.icon}</span>
                    <span style={{ fontSize:13, fontWeight:500, color: isDark ? "#ddd" : "#222" }}>{rule.category}</span>
                    {categoryEditorTx.category === rule.category && <span style={{ marginLeft:"auto", fontSize:11, color:"#9333ea" }}>Nuværende</span>}
                  </button>
                ))}
              </div>
              <button onClick={() => setCategoryEditorTx(null)}
                style={{ background:"none", border:"none", color: isDark ? "#666" : "#999", fontSize:13, cursor:"pointer", marginTop:4 }}>
                Annuller
              </button>
            </div>
          </div>
        )}

        {/* SETTINGS MODAL */}
        {settingsOpen && (
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"flex-end", zIndex:100 }} onClick={() => setSettingsOpen(false)}>
            <div style={{ width:"100%", background: isDark ? "#1a1a2e" : "#fff", borderRadius:"24px 24px 0 0", padding:"24px 20px 40px", display:"flex", flexDirection:"column", gap:12 }} onClick={e => e.stopPropagation()}>
              <div style={{ width:36, height:4, background:"rgba(128,128,128,0.3)", borderRadius:2, margin:"0 auto 8px" }} />
              <h3 style={{ margin:0, fontSize:18, fontWeight:700, color: isDark ? "#fff" : "#111" }}>Indstillinger</h3>

              <button onClick={() => { setSettingsOpen(false); setStep("upload"); }}
                style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)", borderRadius:14, padding:"14px 16px", color: isDark ? "#ddd" : "#333", fontSize:14, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:22 }}>📁</span>
                <div>
                  <div style={{ fontWeight:600 }}>Upload flere konti</div>
                  <div style={{ fontSize:11, color: isDark ? "#888" : "#999", marginTop:2 }}>Tilføj eller skift kontoudtog</div>
                </div>
              </button>

              <button onClick={() => { setSettingsOpen(false); setSubscriptionOpen(true); }}
                style={{ background:"linear-gradient(135deg,#1a0a2e,#2d1060)", border:"1px solid rgba(224,64,251,0.3)", borderRadius:14, padding:"14px 16px", color:"#fff", fontSize:14, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:22 }}>⭐</span>
                <div>
                  <div style={{ fontWeight:600 }}>Køb abonnement</div>
                  <div style={{ fontSize:11, color:"#c084fc", marginTop:2 }}>Kun 29 kr. pr. måned</div>
                </div>
              </button>

              <button onClick={() => { setSettingsOpen(false); toggleTheme(); }}
                style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)", borderRadius:14, padding:"14px 16px", color: isDark ? "#ddd" : "#333", fontSize:14, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:22 }}>{isDark ? "☀️" : "🌙"}</span>
                <div>
                  <div style={{ fontWeight:600 }}>{isDark ? "Skift til lys tilstand" : "Skift til mørk tilstand"}</div>
                </div>
              </button>

              {userEmail && (
                <div style={{ fontSize:12, color: isDark ? "#666" : "#999", textAlign:"center", padding:"4px 0" }}>
                  Logget ind som {userEmail}
                </div>
              )}

              <button onClick={() => { setSettingsOpen(false); logout(); }}
                style={{ background:"none", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", borderRadius:14, padding:"12px 16px", color:"#ef4444", fontSize:13, cursor:"pointer" }}>
                {userEmail ? "Log ud" : "Start forfra"}
              </button>

              <button onClick={() => setSettingsOpen(false)}
                style={{ background:"none", border:"none", color: isDark ? "#666" : "#999", fontSize:14, cursor:"pointer", marginTop:4 }}>
                Luk
              </button>
            </div>
          </div>
        )}

        {/* SUBSCRIPTION PAGE */}
        {subscriptionOpen && (
          <div style={{ position:"absolute", inset:0, background: isDark ? "#0f0f13" : "#fff", display:"flex", flexDirection:"column", zIndex:100, overflowY:"auto" }}>
            <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:10, flexShrink:0, borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)" }}>
              <button onClick={() => setSubscriptionOpen(false)} style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border:"none", borderRadius:10, width:32, height:32, cursor:"pointer", color: isDark ? "#fff" : "#333", fontSize:16 }}>←</button>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color: isDark ? "#fff" : "#111" }}>Økonom Premium</h2>
            </div>

            <div style={{ flex:1, padding:"28px 20px 40px", display:"flex", flexDirection:"column", gap:20 }}>
              {/* Hero */}
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:64, marginBottom:12 }}>👴🏼</div>
                <h2 style={{ margin:0, fontSize:26, fontWeight:800, color: isDark ? "#fff" : "#111", letterSpacing:-0.5 }}>Få fuld adgang til Holger</h2>
                <p style={{ margin:"8px 0 0", fontSize:14, color: isDark ? "#999" : "#666" }}>Din personlige privatøkonomiske coach — altid klar</p>
              </div>

              {/* Price */}
              <div style={{ background:"linear-gradient(135deg,#1a0a2e,#2d1060)", border:"1px solid rgba(224,64,251,0.3)", borderRadius:20, padding:"20px", textAlign:"center" }}>
                <div style={{ fontSize:13, color:"#c084fc", fontWeight:600, marginBottom:4 }}>MÅNEDLIG PRIS</div>
                <div style={{ fontSize:48, fontWeight:800, color:"#fff", letterSpacing:-1 }}>29 kr.</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginTop:2 }}>pr. måned · ingen binding</div>
              </div>

              {/* Features */}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  ["🤖", "Ubegrænset adgang til Holger", "Stil så mange spørgsmål du vil"],
                  ["📊", "Op til 5 konti på én gang", "Analyser hele din økonomi samlet"],
                  ["💡", "Personlige besparelsesforslag", "Konkrete råd baseret på dit forbrug"],
                  ["📈", "Opsparingsplaner", "Skræddersyet til dine mål"],
                  ["🔒", "Dine data er altid private", "Ingen data deles eller gemmes"],
                ].map(([icon, title, sub]) => (
                  <div key={title} style={{ display:"flex", gap:12, alignItems:"flex-start", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)", borderRadius:14, padding:"12px 14px" }}>
                    <span style={{ fontSize:22, flexShrink:0 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color: isDark ? "#fff" : "#111" }}>{title}</div>
                      <div style={{ fontSize:12, color: isDark ? "#888" : "#999", marginTop:2 }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button onClick={() => setSubscriptionPopup(true)}
                style={{ background:"linear-gradient(135deg,#8b2fc9,#e040fb)", border:"none", borderRadius:16, padding:"18px", color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer", boxShadow:"0 8px 24px rgba(139,47,201,0.4)" }}>
                Tilmeld dig nu — 29 kr./md.
              </button>
              <p style={{ margin:"-10px 0 0", fontSize:11, color: isDark ? "#555" : "#bbb", textAlign:"center" }}>Ingen binding · Opsig når som helst</p>
            </div>
          </div>
        )}

        {/* COMING SOON POPUP */}
        {subscriptionPopup && (
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:24 }} onClick={() => setSubscriptionPopup(false)}>
            <div style={{ background: isDark ? "#1a1a2e" : "#fff", borderRadius:24, padding:"32px 24px", textAlign:"center", maxWidth:300, width:"100%" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize:52, marginBottom:12 }}>🚀</div>
              <h3 style={{ margin:"0 0 8px", fontSize:20, fontWeight:800, color: isDark ? "#fff" : "#111" }}>Abonnement kommer snart!</h3>
              <p style={{ margin:"0 0 20px", fontSize:13, color: isDark ? "#999" : "#666", lineHeight:1.6 }}>Vi arbejder på at gøre Holger endnu bedre. Du hører fra os når det er klar!</p>
              <button onClick={() => setSubscriptionPopup(false)}
                style={{ background:"linear-gradient(135deg,#8b2fc9,#e040fb)", border:"none", borderRadius:12, padding:"12px 28px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                Forstået!
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const makeStyles = (isDark) => ({
  shell: {
    minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center",
    background: isDark ? "radial-gradient(ellipse at 30% 20%, #1a0a2e 0%, #0d0d0d 60%)" : "#f0f0f5",
    fontFamily:"'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", padding:0,
  },
  phone: {
    width:"100%", maxWidth:430, height:"100dvh", background: isDark ? "#0f0f13" : "#ffffff",
    borderRadius:0, overflow:"hidden",
    boxShadow: isDark ? "0 40px 80px rgba(0,0,0,0.8)" : "0 4px 24px rgba(0,0,0,0.12)",
    display:"flex", flexDirection:"column",
  },
  appLayout: { flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minHeight:0 },
  header: {
    padding:"10px 18px", display:"flex", alignItems:"center", gap:10,
    flexShrink:0, borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)",
  },
  headerTitle: { margin:0, fontSize:18, fontWeight:700, color: isDark ? "#fff" : "#111" },
  backBtn: { background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border:"none", borderRadius:12, color: isDark ? "#fff" : "#333", fontSize:18, width:36, height:36, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  resetBtn: { background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border:"none", borderRadius:12, color: isDark ? "#aaa" : "#666", fontSize:16, width:36, height:36, cursor:"pointer", flexShrink:0 },
  themeBtn: { background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border:"none", borderRadius:12, color: isDark ? "#aaa" : "#666", fontSize:16, width:36, height:36, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" },
  scroll: { flex:1, minHeight:0, overflowY:"auto", overflowX:"hidden", padding:"12px 14px", flexDirection:"column", gap:10, scrollbarWidth:"none" },
  nav: { flexShrink:0, display:"flex", justifyContent:"space-around", padding:"10px 0 env(safe-area-inset-bottom, 16px)", background: isDark ? "#0f0f13" : "#ffffff", borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)" },
  navBtn: { background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"4px 16px" },
  heroCard: { background: isDark ? "linear-gradient(135deg,#1a0a2e,#2d1060)" : "linear-gradient(135deg,#f3e8ff,#ede9fe)", border: isDark ? "1px solid rgba(224,64,251,0.2)" : "1px solid rgba(139,47,201,0.2)", borderRadius:20, padding:"20px 20px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0 },
  heroLabel: { fontSize:11, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", fontWeight:500, letterSpacing:1.2, textTransform:"uppercase" },
  heroAmount: { fontSize:36, fontWeight:800, letterSpacing:-1.5 },
  heroRow: { display:"flex", gap:16, alignItems:"center" },
  heroSub: { fontSize:11, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)" },
  statRow: { display:"flex", gap:8, flexShrink:0 },
  statBox: { flex:1, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.07)", borderRadius:14, padding:"12px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:2 },
  statNum: { fontSize:20, fontWeight:700, color:"#9333ea" },
  statLabel: { fontSize:9, color: isDark ? "#666" : "#999" },
  section: { background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.08)", borderRadius:16, overflow:"hidden", flexShrink:0 },
  sectionTitle: { fontSize:12, fontWeight:600, color: isDark ? "#888" : "#999", padding:"12px 14px 4px", display:"block" },
  row: { display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderTop: isDark ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,0,0,0.05)" },
  rowTitle: { fontSize:13, fontWeight:600, color: isDark ? "#ddd" : "#222" },
  rowSub: { fontSize:10, color: isDark ? "#666" : "#999", marginTop:1 },
  rowAmt: { fontSize:12, color:"#ef4444", fontWeight:700, flexShrink:0, minWidth:65, textAlign:"right" },
  barTrack: { flex:1, height:5, background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)", borderRadius:3, overflow:"hidden", margin:"4px 0" },
  barFill: { height:"100%", borderRadius:3 },
  catIcon: { width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 },
  detailHero: { padding:"12px 0 4px", display:"flex", flexDirection:"column", alignItems:"center", gap:4, flexShrink:0 },
  detailTotal: { fontSize:32, fontWeight:800, color:"#ef4444", letterSpacing:-1 },
  detailSub: { fontSize:12, color: isDark ? "#666" : "#999" },
});

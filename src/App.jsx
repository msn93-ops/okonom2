import { useState, useCallback, useMemo, useEffect, useRef } from "react";

const ACCOUNT_TYPES = [
  { id: "loen", label: "Lønkonto", icon: "💰" },
  { id: "opsparing", label: "Opsparingskonto", icon: "🏦" },
  { id: "budget", label: "Budgetkonto", icon: "📊" },
  { id: "faelles", label: "Fælles konto", icon: "👫" },
  { id: "laan", label: "Lån", icon: "📋" },
];

const CATEGORY_RULES = [
  { keywords: ["netto","fakta","rema","aldi","lidl","meny","irma","bilka","føtex","kvickly","superbrugsen","dagligbrugsen","spar","coop","daglig"], category: "Dagligvarer", icon: "🛒", color: "#4CAF50" },
  { keywords: ["seven eleven","7-eleven","kiosk","q8","shell","circle k","ok benzin","esso"], category: "Kiosk & Benzin", icon: "⛽", color: "#FF9800" },
  { keywords: ["restaurant","cafe","pizza","burger","mcdonalds","kfc","subway","sushi","takeaway","bistro","grill"], category: "Mad & Restauranter", icon: "🍽️", color: "#E91E63" },
  { keywords: ["netflix","spotify","hbo","disney","viaplay","youtube","apple music","deezer","abonnement","subscription"], category: "Streaming & Abonnementer", icon: "📺", color: "#9C27B0" },
  { keywords: ["dsb","rejsekort","bus","metro","tog","fly","airport","taxa","uber","bolt"], category: "Transport", icon: "🚌", color: "#2196F3" },
  { keywords: ["husleje","bolig","el ","vand ","varme","forsikring","ejendom"], category: "Bolig & Regninger", icon: "🏠", color: "#795548" },
  { keywords: ["apotek","læge","hospital","tandlæge","medicin","fitness","gym","træning"], category: "Sundhed & Fitness", icon: "💊", color: "#00BCD4" },
  { keywords: ["zalando","h&m","zara","tøj","sko","mode","fashion","matas","sephora"], category: "Tøj & Mode", icon: "👗", color: "#FF5722" },
  { keywords: ["amazon","ebay","coolshop","proshop","elgiganten","power","expert"], category: "Shopping & Elektronik", icon: "🛍️", color: "#607D8B" },
  { keywords: ["løn","salary","indkomst","overførsel fra","betaling fra","lønoverførsel","udbetaling"], category: "Lønindtægt", icon: "💵", color: "#22c55e" },
  { keywords: ["hæveautomat","kontant","kontanthævning"], category: "Kontanter", icon: "💵", color: "#9E9E9E" },
  { keywords: ["overførsel til","overf. til","intern overførsel"], category: "Intern overførsel", icon: "🔄", color: "#607D8B" },
];

function categorize(description) {
  const lower = (description || "").toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => lower.includes(k)))
      return { category: rule.category, icon: rule.icon, color: rule.color };
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

function TRow({ t, S }) {
  return (
    <div style={S.row}>
      <div style={{ ...S.catIcon, background: t.color + "22", border: "1.5px solid " + t.color, fontSize: 15 }}>{t.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...S.rowTitle, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.description || "–"}</div>
        <div style={S.rowSub}>{t.dateStr}</div>
      </div>
      <span style={{ fontSize:13, fontWeight:700, color: t.isIncome ? "#4ade80" : "#ef4444", flexShrink:0 }}>
        {t.isIncome ? "+" : "-"}{fmt(t.amount)}
      </span>
    </div>
  );
}

function Nav({ view, setView, isDark, S }) {
  const tabs = [["overview","📊","Overblik"],["months","📅","Måneder"],["categories","🏷️","Kategorier"],["ai","👴🏼","Holger"]];
  return (
    <div style={S.nav}>
      {tabs.map(([id,icon,label]) => (
        <button key={id} style={S.navBtn} onClick={() => setView(id)}>
          <span style={{ fontSize:20 }}>{icon}</span>
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
function CSVUpload({ accounts, onComplete, isDark }) {
  const [uploads, setUploads] = useState({});
  const [draggingId, setDraggingId] = useState(null);

  const handleFile = (accountId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const transactions = parseCSV(e.target.result);
      setUploads(prev => ({ ...prev, [accountId]: { fileName: file.name, transactions } }));
    };
    reader.readAsText(file, "UTF-8");
  };

  const uploadedCount = Object.keys(uploads).length;
  const canContinue = uploadedCount > 0;

  const bg = isDark ? "#0f0f13" : "#fff";
  const fg = isDark ? "#fff" : "#111";
  const sub = isDark ? "#888" : "#999";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";

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
        const isDragging = draggingId === acc.id;

        return (
          <div key={acc.id}
            style={{ border: "2px dashed " + (isDragging ? "#e040fb" : (uploaded ? "#4CAF50" : "rgba(139,47,201,0.4)")), borderRadius:16, padding:"18px 16px", background: uploaded ? "rgba(76,175,80,0.05)" : (isDragging ? "rgba(224,64,251,0.08)" : "rgba(139,47,201,0.04)"), cursor:"pointer", transition:"all 0.2s" }}
            onDragOver={e => { e.preventDefault(); setDraggingId(acc.id); }}
            onDragLeave={() => setDraggingId(null)}
            onDrop={e => { e.preventDefault(); setDraggingId(null); handleFile(acc.id, e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById("csv-" + acc.id).click()}>
            <input id={"csv-" + acc.id} type="file" accept=".csv,.txt" style={{ display:"none" }} onChange={e => handleFile(acc.id, e.target.files[0])} />
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:28 }}>{type?.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:fg }}>{label}</div>
                {uploaded ? (
                  <div style={{ fontSize:12, color:"#4CAF50", marginTop:2 }}>✓ {uploaded.fileName} · {uploaded.transactions.length} transaktioner</div>
                ) : (
                  <div style={{ fontSize:12, color:sub, marginTop:2 }}>Tryk eller træk CSV-fil hertil</div>
                )}
              </div>
              {uploaded && <span style={{ fontSize:20 }}>✅</span>}
            </div>
          </div>
        );
      })}

      <button
        onClick={() => canContinue && onComplete(uploads)}
        style={{ background: canContinue ? "linear-gradient(135deg,#8b2fc9,#e040fb)" : "rgba(128,128,128,0.3)", border:"none", borderRadius:14, padding:"16px", color:"#fff", fontSize:15, fontWeight:700, cursor: canContinue ? "pointer" : "default", marginTop:"auto", opacity: canContinue ? 1 : 0.6 }}>
        {canContinue ? "Se overblik (" + uploadedCount + "/" + accounts.length + " konti) →" : "Upload mindst én CSV-fil"}
      </button>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState("intro"); // setup | upload | app
  const [accounts, setAccounts] = useState([]);
  const [uploads, setUploads] = useState({});
  const [activeAccount, setActiveAccount] = useState("all"); // "all" or account id
  const [view, setView] = useState("overview");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedMonthCategory, setSelectedMonthCategory] = useState(null);
  const [selectedCategoryMonth, setSelectedCategoryMonth] = useState(null);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(() => localStorage.getItem("okonom-privacy") === "true");
  const [isDark, setIsDark] = useState(() => (localStorage.getItem("okonom-theme") || "dark") === "dark");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subscriptionPopup, setSubscriptionPopup] = useState(false);
  const chatEndRef = useRef(null);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("okonom-theme", next ? "dark" : "light");
  };

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  // Get active transactions
  const activeTransactions = useMemo(() => {
    if (activeAccount === "all") {
      return Object.values(uploads).flatMap(u => u.transactions);
    }
    return uploads[activeAccount]?.transactions || [];
  }, [activeAccount, uploads]);

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
    if (!text.trim() || aiLoading) return;
    const userMsg = { role: "user", content: text };
    const newMessages = [...aiMessages, userMsg];
    setAiMessages(newMessages);
    setAiInput("");
    setAiLoading(true);

    const ctx = buildContext();
    const systemPrompt = `Du er Holger, en erfaren dansk privatøkonomisk coach.
Din rolle er IKKE at give finansiel eller investeringsrådgivning, men at hjælpe brugeren med at forstå, strukturere og forbedre deres privatøkonomi.

Du har adgang til brugerens data på TVÆRS af alle konti. Interne overførsler mellem konti må IKKE tælles som udgifter.

KONTI OVERSIGT:
` + ctx.accountSummaries + `

SAMLEDE UDGIFTER PR. KATEGORI:
` + ctx.catLines + `

ALLE TRANSAKTIONER MED DATO, BELØB OG KONTO:
` + ctx.transByCat + `

SAMTALEREGLER:
- Start ALDRIG med "Hej" eller andre hilsener
- Husk alt fra samtalen og brug brugerens svar aktivt
- Brug ALDRIG ** eller markdown-formatering
- Svar altid på dansk, konkret og handlingsorienteret`;

    try {
      const history = newMessages.slice(-12).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1000, system: systemPrompt, messages: history }),
      });
      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); } catch(e) { throw new Error("Parse fejl: " + raw.slice(0,100)); }
      if (data.error) throw new Error(data.error.message);
      const reply = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "Intet svar.";
      setAiMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setAiMessages(prev => [...prev, { role: "assistant", content: "Fejl: " + err.message }]);
    }
    setAiLoading(false);
  }, [aiMessages, aiLoading, buildContext]);

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
        <div style={{ ...S.phone, display:"flex", flexDirection:"column" }}>
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
              onClick={() => setStep("setup")}
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

  if (step === "setup") {
    return (
      <div style={S.shell}>
        <div style={{ ...S.phone, display:"flex", flexDirection:"column" }}>
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
        <div style={{ ...S.phone, display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <button onClick={() => setStep("setup")} style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border:"none", borderRadius:10, width:32, height:32, cursor:"pointer", color: isDark ? "#fff" : "#333" }}>←</button>
            <h2 style={{ margin:0, fontSize:20, fontWeight:800, color: isDark ? "#fff" : "#111" }}>Upload kontoudtog</h2>
          </div>
          <CSVUpload accounts={accounts} isDark={isDark} onComplete={ups => {
            setUploads(ups);
            setActiveAccount("all");
            setStep("app");
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

            {view === "ai" && aiMessages.length > 0 && (
              <button style={S.resetBtn} onClick={() => setAiMessages([])}>🗑️</button>
            )}
          </div>

          {/* SCROLL AREA */}
          <div style={{ ...S.scroll, display: view === "ai" ? "none" : "flex" }}>

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
                  {[...selMonth.items].filter(t => t.amount < 0).sort((a,b) => (b.date||0)-(a.date||0)).map(t => <TRow key={t.id} t={t} S={S} />)}
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
                  <span style={S.detailTotal}>-{fmt(selCat.total)}</span>
                  <span style={S.detailSub}>{selCat.items.length} transaktioner</span>
                </div>
                {months.length > 0 && (
                  <div style={S.section}>
                    <span style={S.sectionTitle}>Per måned</span>
                    {months.map(m => (
                      <div key={m.k} style={{ ...S.row, cursor:"pointer" }} onClick={() => { setSelectedCategoryMonth(m.k); setView("category-month"); }}>
                        <div style={{ minWidth:80 }}><div style={S.rowTitle}>{MDA[m.month]} {m.year}</div></div>
                        <div style={S.barTrack}><div style={{ ...S.barFill, width:((m.total/maxM)*100) + "%", background:selCat.color }} /></div>
                        <span style={S.rowAmt}>-{fmt(m.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={S.section}>
                  <span style={S.sectionTitle}>Alle transaktioner</span>
                  {[...selCat.items].sort((a,b) => (b.date||0)-(a.date||0)).map(t => <TRow key={t.id} t={t} S={S} />)}
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
                  {items.sort((a,b) => (b.date||0)-(a.date||0)).map(t => <TRow key={t.id} t={t} S={S} />)}
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
                  <span style={S.detailTotal}>-{fmt(total)}</span>
                  <span style={S.detailSub}>{items.length} transaktioner · {mData ? MDA[mData.month] + " " + mData.year : ""}</span>
                </div>
                <div style={S.section}>
                  <span style={S.sectionTitle}>Transaktioner</span>
                  {items.sort((a,b) => (b.date||0)-(a.date||0)).map(t => <TRow key={t.id} t={t} S={S} />)}
                </div>
              </>;
            })()}

          </div>

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

          {view === "ai" && privacyAccepted && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
              {aiMessages.length === 0 ? (
                <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 14px", gap:10 }}>
                  <div style={{ textAlign:"center", paddingBottom:8 }}>
                    <div style={{ fontSize:44, marginBottom:8 }}>👴🏼</div>
                    <div style={{ fontSize:16, fontWeight:700, color: isDark ? "#fff" : "#111", marginBottom:4 }}>Holger</div>
                    <div style={{ fontSize:12, color: isDark ? "#666" : "#999", lineHeight:1.5 }}>Hej! Jeg er Holger, din personlige økonom.<br/>Hvad kan jeg hjælpe dig med?</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {["Hvad bruger jeg flest penge på?","Opsummer mine abonnementer","Hvor kan jeg spare penge?","Lav en opsparingsplan for mig"].map(p => (
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

          <Nav view={view} setView={setView} isDark={isDark} S={S} />
        </div>

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

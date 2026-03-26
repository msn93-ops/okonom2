import { useState, useCallback, useMemo, useEffect } from "react";

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
  { keywords: ["løn","salary","indkomst","overførsel fra","betaling fra"], category: "Indkomst", icon: "💰", color: "#8BC34A" },
  { keywords: ["hæveautomat","kontant","kontanthævning"], category: "Kontanter", icon: "💵", color: "#9E9E9E" },
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

function MonthRow({ m, max, onClick, S }) {
  return (
    <div style={{ ...S.row, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div style={{ minWidth: 80 }}>
        <div style={S.rowTitle}>{MDA[m.month]} {m.year}</div>
        <div style={S.rowSub}>{m.items.length} udgifter</div>
      </div>
      <div style={S.barTrack}><div style={{ ...S.barFill, width: `${(m.total/max)*100}%`, background: "linear-gradient(90deg,#8b2fc9,#e040fb)" }} /></div>
      <span style={S.rowAmt}>-{fmt(m.total)}</span>
    </div>
  );
}

function CatRow({ c, max, onClick, count, S }) {
  return (
    <div style={{ ...S.row, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div style={{ ...S.catIcon, background: c.color + "22", border: `1.5px solid ${c.color}` }}>{c.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.rowTitle}>{c.category}</div>
        <div style={S.barTrack}><div style={{ ...S.barFill, width: `${(c.total/max)*100}%`, background: c.color }} /></div>
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={S.rowAmt}>{fmt(c.total)}</div>
        <div style={S.rowSub}>{(count ?? c.items.length)} stk.</div>
      </div>
    </div>
  );
}

function TRow({ t, S }) {
  return (
    <div style={S.row}>
      <div style={{ ...S.catIcon, background: t.color + "22", border: `1.5px solid ${t.color}`, fontSize: 15 }}>{t.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...S.rowTitle, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.description || "–"}</div>
        <div style={S.rowSub}>{t.dateStr}</div>
      </div>
      <span style={{ fontSize:13, fontWeight:700, color: t.isIncome ? "#4ade80" : "#f87171", flexShrink:0 }}>
        {t.isIncome ? "+" : "-"}{fmt(t.amount)}
      </span>
    </div>
  );
}

function Nav({ view, setView, isDark, S }) {
  const tabs = [["overview","📊","Overblik"],["months","📅","Måneder"],["categories","🏷️","Kategorier"],["ai","👴🏼","Holger"]];
  const activeTab = tabs.find(([id]) => id === view)?.[0] ?? null;
  return (
    <div style={S.nav}>
      {tabs.map(([id,icon,label]) => (
        <button key={id} style={S.navBtn} onClick={() => setView(id)}>
          <span style={{ fontSize:20 }}>{icon}</span>
          <span style={{ fontSize:9, color: activeTab===id ? "#e040fb" : "#555" }}>{label}</span>
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [view, setView] = useState("upload");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedMonthCategory, setSelectedMonthCategory] = useState(null); // category clicked inside a month
  const [selectedCategoryMonth, setSelectedCategoryMonth] = useState(null); // month clicked inside a category
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("okonom-theme") || "dark";
  });
  const isDark = theme === "dark";
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("okonom-theme", next);
  };
  const [fileName, setFileName] = useState("");

  const handleFile = useCallback((file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => { setTransactions(parseCSV(e.target.result)); setView("overview"); };
    reader.readAsText(file, "UTF-8");
  }, []);

  const expenses      = useMemo(() => transactions.filter(t => t.amount < 0), [transactions]);
  const income        = useMemo(() => transactions.filter(t => t.amount > 0), [transactions]);
  const totalExpenses = useMemo(() => expenses.reduce((s,t) => s + Math.abs(t.amount), 0), [expenses]);
  const totalIncome   = useMemo(() => income.reduce((s,t) => s + t.amount, 0), [income]);

  const byMonth = useMemo(() => {
    const map = {};
    expenses.forEach(t => {
      if (!t.date) return;
      const key = `${t.date.getFullYear()}-${String(t.date.getMonth()).padStart(2,"0")}`;
      if (!map[key]) map[key] = { key, year:t.date.getFullYear(), month:t.date.getMonth(), total:0, items:[] };
      map[key].total += Math.abs(t.amount);
      map[key].items.push(t);
    });
    return Object.values(map).sort((a,b) => b.key.localeCompare(a.key));
  }, [expenses]);

  const byCategory = useMemo(() => {
    const map = {};
    expenses.forEach(t => {
      if (!map[t.category]) map[t.category] = { category:t.category, icon:t.icon, color:t.color, total:0, items:[] };
      map[t.category].total += Math.abs(t.amount);
      map[t.category].items.push(t);
    });
    return Object.values(map).sort((a,b) => b.total - a.total);
  }, [expenses]);

  const maxMonthTotal = useMemo(() => Math.max(...byMonth.map(m => m.total), 1), [byMonth]);

  const buildFinancialContext = useCallback(() => {
    const catSummary = byCategory.map(c => ({
      kategori: c.category,
      total: Math.round(c.total),
      antal: c.items.length,
      månedligt_gennemsnit: Math.round(c.total / Math.max(byMonth.length, 1)),
    }));
    const monthSummary = byMonth.map(m => ({
      måned: `${MDA[m.month]} ${m.year}`,
      udgifter: Math.round(m.total),
      antal_transaktioner: m.items.length,
    }));
    const subscriptions = expenses.filter(t => t.category === "Streaming & Abonnementer");
    const subList = [...new Map(subscriptions.map(t => [t.description.toLowerCase().slice(0,20), t])).values()]
      .map(t => ({ navn: t.description, beløb: Math.abs(t.amount) }));
    return {
      periode: `${monthSummary[monthSummary.length-1]?.måned ?? ""} – ${monthSummary[0]?.måned ?? ""}`,
      total_indkomst: Math.round(totalIncome),
      total_udgifter: Math.round(totalExpenses),
      nettoresultat: Math.round(totalIncome - totalExpenses),
      månedlig_indkomst: Math.round(totalIncome / Math.max(byMonth.length, 1)),
      månedlige_udgifter: Math.round(totalExpenses / Math.max(byMonth.length, 1)),
      kategorier: catSummary,
      måneder: monthSummary,
      abonnementer: subList,
      antal_transaktioner: transactions.length,
    };
  }, [byCategory, byMonth, expenses, totalIncome, totalExpenses, transactions]);

  const sendAiMessage = useCallback(async (text) => {
    if (!text.trim() || aiLoading) return;
    const userMsg = { role: "user", content: text };
    const newMessages = [...aiMessages, userMsg];
    setAiMessages(newMessages);
    setAiInput("");
    setAiLoading(true);
    // newMessages already contains full history including this new message

    const ctx = buildFinancialContext();

    const catLines = ctx.kategorier.slice(0,8).map(c =>
      `- ${c.kategori}: ${c.total} kr (${c.antal} køb)`
    ).join("\n");
    const monthLines = ctx.måneder.slice(0,4).map(m =>
      `- ${m.måned}: ${m.udgifter} kr`
    ).join("\n");
    const subLines = ctx.abonnementer.slice(0,6).map(s =>
      `- ${s.navn}: ${s.beløb} kr`
    ).join("\n");

    const systemPrompt = `Du er Holger, en erfaren dansk privatøkonomisk rådgiver. Du husker ALT hvad der er blevet sagt tidligere i samtalen og følger altid op på det. Hvis brugeren svarer "ja", "ok", "fortæl mere" eller lignende, fortsætter du præcis dér hvor I slap. Svar på dansk. Brug kr ved beløb.

Økonomidata:
Indkomst: ${ctx.total_indkomst} kr | Udgifter: ${ctx.total_udgifter} kr | Netto: ${ctx.nettoresultat} kr
Månedligt: ~${ctx.månedlig_indkomst} kr ind, ~${ctx.månedlige_udgifter} kr ud

Kategorier:
${catLines}

Måneder:
${monthLines}

Abonnementer:
${subLines}`;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: text }],
        }),
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text || "Intet svar.";
      setAiMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setAiMessages(prev => [...prev, { role: "assistant", content: "Fejl: " + err.message }]);
    }
    setAiLoading(false);
  }, [aiMessages, aiLoading, buildFinancialContext]);
  const maxCatTotal   = useMemo(() => Math.max(...byCategory.map(c => c.total), 1), [byCategory]);

  const selMonth = byMonth.find(m => m.key === selectedMonth);
  const selCat   = byCategory.find(c => c.category === selectedCategory);

  const goBack = () => {
    if (view === "month-category") setView("month");
    else if (view === "category-month") setView("category");
    else if (view === "month") setView("months");
    else if (view === "category") setView("categories");
    else setView("overview");
  };

  const selMonthCat = selectedMonthCategory;
  const selCatMonth = selectedCategoryMonth;

  const titles = { overview:"Overblik", months:"Måneder", categories:"Kategorier",
    month: selMonth ? `${MDA[selMonth.month]} ${selMonth.year}` : "",
    category: selectedCategory || "",
    "month-category": selMonthCat || "",
    "ai": "Holger",
    "category-month": selCatMonth ? `${MDA[byMonth.find(m=>m.key===selCatMonth)?.month ?? 0]} ${byMonth.find(m=>m.key===selCatMonth)?.year ?? ""}` : "",
  };

  const S = makeStyles(isDark);

  return (
    <div style={S.shell}>
      <div style={S.phone}>


        {view === "upload" ? (
          <div style={S.uploadScreen}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
              <div style={S.logoCircle}>👴🏼</div>
              <h1 style={{ margin:0, fontSize:28, fontWeight:800, color:"#fff", letterSpacing:-0.5 }}>Økonom</h1>
              <button onClick={toggleTheme} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:20, padding:"4px 14px", color:"#fff", fontSize:12, cursor:"pointer", marginTop:4 }}>
                {isDark ? "☀️ Lys tilstand" : "🌙 Mørk tilstand"}
              </button>
              <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(224,64,251,0.12)", border:"1px solid rgba(224,64,251,0.3)", borderRadius:20, padding:"4px 12px" }}>
                <span style={{ fontSize:12 }}>✨</span>
                <span style={{ fontSize:11, color:"#c084fc", fontWeight:600 }}>AI-drevet privatøkonomi</span>
              </div>
              <p style={{ margin:"6px 0 0", fontSize:13, color:"#999", textAlign:"center", lineHeight:1.6, maxWidth:260 }}>
                Hej, jeg er <span style={{ color:"#fff", fontWeight:600 }}>Holger</span> — din personlige AI-rådgiver inden for privatøkonomi. Upload dit kontoudtog, og jeg hjælper dig med at få styr på forbruget.
              </p>
            </div>
            <div
              style={{ ...S.dropZone, ...(dragging ? S.dropActive : {}) }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f=e.dataTransfer.files[0]; if(f) handleFile(f); }}
              onClick={() => document.getElementById("fi").click()}
            >
              <span style={{ fontSize:38 }}>{dragging ? "📂" : "📁"}</span>
              <p style={{ margin:0, color:"#ddd", fontSize:14, fontWeight:600 }}>Tryk eller træk CSV-fil hertil</p>
              <p style={{ margin:0, color:"#666", fontSize:12 }}>Understøtter de fleste bankers eksportformat</p>
              <input id="fi" type="file" accept=".csv,.txt" style={{ display:"none" }} onChange={e => handleFile(e.target.files[0])} />
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
              {["Danske Bank","Nordea","Jyske Bank","Sydbank"].map(b => <span key={b} style={S.bankTag}>{b}</span>)}
            </div>
          </div>
        ) : (
          <div style={S.appLayout}>
            {/* HEADER */}
            <div style={S.header}>
              {["month","category","months","categories","month-category","category-month"].includes(view) && view !== "ai" && (
                <button style={S.backBtn} onClick={goBack}>←</button>
              )}
              <div style={{ flex:1, minWidth:0 }}>
                <h2 style={S.headerTitle}>{titles[view]}</h2>
                {view === "overview" && <p style={S.headerSub}>{fileName}</p>}
              </div>
              <button style={S.themeBtn} onClick={toggleTheme} title="Skift tema">
                {isDark ? "☀️" : "🌙"}
              </button>
              {view === "ai" && aiMessages.length > 0 && (
                <button style={S.resetBtn} onClick={() => setAiMessages([])} title="Nulstil chat">
                  🗑️
                </button>
              )}
              {view === "overview" && (
                <button style={S.resetBtn} onClick={() => { setTransactions([]); setView("upload"); }}>↩</button>
              )}
            </div>

            {/* SCROLL AREA - hidden when AI is active */}
            <div style={{ ...S.scroll, ...(view === 'ai' ? { display:'none' } : {}) }}>

              {view === "overview" && (() => {
                const net = totalIncome - totalExpenses;
                return <>
                  <div style={S.heroCard}>
                    <span style={S.heroLabel}>Nettoresultat</span>
                    <span style={{ ...S.heroAmount, color: net >= 0 ? "#4ade80" : "#f87171" }}>
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
                    {[[transactions.length,"Transaktioner"],[byMonth.length,"Måneder"],[byCategory.length,"Kategorier"]].map(([n,l]) => (
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
                selMonth.items.forEach(t => {
                  if (!cats[t.category]) cats[t.category] = { ...t, total:0, count:0 };
                  cats[t.category].total += Math.abs(t.amount);
                  cats[t.category].count++;
                });
                const sorted = Object.values(cats).sort((a,b) => b.total-a.total);
                const max = sorted[0]?.total || 1;
                return <>
                  <div style={S.detailHero}>
                    <span style={S.detailTotal}>-{fmt(selMonth.total)}</span>
                    <span style={S.detailSub}>{selMonth.items.length} udgifter denne måned</span>
                  </div>
                  <div style={S.section}>
                    <span style={S.sectionTitle}>Fordeling</span>
                    {sorted.map(c => <CatRow key={c.category} c={c} max={max} count={c.count} onClick={() => { setSelectedMonthCategory(c.category); setView("month-category"); }} S={S} />)}
                  </div>
                  <div style={S.section}>
                    <span style={S.sectionTitle}>Alle transaktioner</span>
                    {[...selMonth.items].sort((a,b) => (b.date||0)-(a.date||0)).map(t => <TRow key={t.id} t={t} S={S} />)}
                  </div>
                </>;
              })()}

              {view === "category" && selCat && (() => {
                const mmap = {};
                selCat.items.forEach(t => {
                  if (!t.date) return;
                  const k = `${t.date.getFullYear()}-${String(t.date.getMonth()).padStart(2,"0")}`;
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
                          <div style={{ minWidth:80 }}>
                            <div style={S.rowTitle}>{MDA[m.month]} {m.year}</div>
                          </div>
                          <div style={S.barTrack}><div style={{ ...S.barFill, width:`${(m.total/maxM)*100}%`, background:selCat.color }} /></div>
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
                  const k = `${t.date.getFullYear()}-${String(t.date.getMonth()).padStart(2,"0")}`;
                  return k === mKey;
                });
                const total = items.reduce((s,t) => s + Math.abs(t.amount), 0);
                return <>
                  <div style={S.detailHero}>
                    <span style={{ fontSize:32 }}>{selCat.icon}</span>
                    <span style={S.detailTotal}>-{fmt(total)}</span>
                    <span style={S.detailSub}>{items.length} transaktioner · {mData ? `${MDA[mData.month]} ${mData.year}` : ""}</span>
                  </div>
                  <div style={S.section}>
                    <span style={S.sectionTitle}>Transaktioner</span>
                    {items.sort((a,b) => (b.date||0)-(a.date||0)).map(t => <TRow key={t.id} t={t} S={S} />)}
                  </div>
                </>;
              })()}


            </div>{/* end scroll */}

            {/* AI VIEW - outside scroll so it can manage its own layout */}
            {view === "ai" && (() => {
              const quickPrompts = [
                "Hvad bruger jeg flest penge på?",
                "Opsummer mine abonnementer",
                "Hvor kan jeg spare penge?",
                "Lav en opsparingsplan for mig",
              ];
              return (
                <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
                  {aiMessages.length === 0 ? (
                    <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 14px", gap:10 }}>
                      <div style={{ textAlign:"center", paddingBottom:8 }}>
                        <div style={{ fontSize:44, marginBottom:8 }}>👴🏼</div>
                        <div style={{ fontSize:16, fontWeight:700, color:"#fff", marginBottom:4 }}>Holger</div>
                        <div style={{ fontSize:12, color:"#666", lineHeight:1.5 }}>Hej! Jeg er Holger, din personlige økonom.<br/>Hvad kan jeg hjælpe dig med?</div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {quickPrompts.map(p => (
                          <button key={p} style={{ background:"rgba(224,64,251,0.15)", border:"1px solid rgba(224,64,251,0.4)", borderRadius:14, padding:"13px 16px", color:"#fff", fontSize:13, fontWeight:500, cursor:"pointer", textAlign:"left", width:"100%" }} onClick={() => sendAiMessage(p)}>{p}</button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex:1, overflowY:"auto", minHeight:0, display:"flex", flexDirection:"column", gap:10, padding:"12px 14px", scrollbarWidth:"none", msOverflowStyle:"none" }}>
                      {aiMessages.map((m, i) => (
                        <div key={i} style={{ display:"flex", justifyContent: m.role==="user" ? "flex-end" : "flex-start" }}>
                          <div style={m.role==="user" ? { background:"linear-gradient(135deg,#6a0dad,#e040fb)", color:"#fff", borderRadius:"18px 18px 4px 18px", padding:"10px 14px", fontSize:13, lineHeight:1.5, maxWidth:"78%", whiteSpace:"pre-wrap" } : { background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", color: isDark ? "#e8e8e8" : "#222", borderRadius:"18px 18px 18px 4px", padding:"10px 14px", fontSize:13, lineHeight:1.6, maxWidth:"84%", whiteSpace:"pre-wrap" }}>{m.content}</div>
                        </div>
                      ))}
                      {aiLoading && (
                        <div style={{ display:"flex", justifyContent:"flex-start" }}>
                          <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)", color:"#888", borderRadius:"18px 18px 18px 4px", padding:"10px 14px", fontSize:13 }}>✨ Tænker...</div>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ display:"flex", gap:8, padding:"10px 14px 14px", flexShrink:0, borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)", background: isDark ? "#0f0f13" : "#ffffff" }}>
                    <input
                      style={{ flex:1, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.15)", borderRadius:22, padding:"11px 16px", color: isDark ? "#fff" : "#111", fontSize:13, outline:"none" }}
                      placeholder="Stil et spørgsmål..."
                      value={aiInput}
                      onChange={e => setAiInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendAiMessage(aiInput)}
                    />
                    <button
                      style={{ width:40, height:40, borderRadius:"50%", border:"none", cursor:"pointer", background:"linear-gradient(135deg,#8b2fc9,#e040fb)", color:"#fff", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, opacity: aiLoading || !aiInput.trim() ? 0.4 : 1 }}
                      onClick={() => sendAiMessage(aiInput)}
                      disabled={aiLoading || !aiInput.trim()}>
                      ↑
                    </button>
                  </div>
                </div>
              );
            })()}

            <Nav view={view} setView={setView} isDark={isDark} S={S} />
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
    fontFamily:"'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    padding:0,
  },
  phone: {
    width:"100%", maxWidth:430, height:"100dvh", 
    background: isDark ? "#0f0f13" : "#ffffff", borderRadius:0,
    overflow:"hidden",
    boxShadow: isDark ? "0 40px 80px rgba(0,0,0,0.8)" : "0 4px 24px rgba(0,0,0,0.12)",
    display:"flex", flexDirection:"column",
  },
  appLayout: {
    flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minHeight:0,
  },
  header: {
    padding:"12px 18px 10px", display:"flex", alignItems:"center", gap:10,
    flexShrink:0, borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)",
  },
  headerTitle: { margin:0, fontSize:20, fontWeight:700, color: isDark ? "#fff" : "#111" },
  headerSub: { margin:0, fontSize:11, color: isDark ? "#666" : "#999", marginTop:1 },
  backBtn: {
    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border:"none", borderRadius:12,
    color: isDark ? "#fff" : "#333", fontSize:18, width:36, height:36, cursor:"pointer",
    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
  },
  resetBtn: {
    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border:"none", borderRadius:12,
    color: isDark ? "#aaa" : "#666", fontSize:16, width:36, height:36, cursor:"pointer", flexShrink:0,
  },
  themeBtn: {
    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border:"none", borderRadius:12,
    color: isDark ? "#aaa" : "#666", fontSize:16, width:36, height:36, cursor:"pointer", flexShrink:0,
    display:"flex", alignItems:"center", justifyContent:"center",
  },
  scroll: {
    flex:1, minHeight:0, overflowY:"auto", overflowX:"hidden",
    padding:"12px 14px", display:"flex", flexDirection:"column", gap:10,
    scrollbarWidth:"none", msOverflowStyle:"none",
  },
  nav: {
    flexShrink:0, display:"flex", justifyContent:"space-around",
    padding:"10px 0 env(safe-area-inset-bottom, 16px)",
    background: isDark ? "#0f0f13" : "#ffffff",
    borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
  },
  navBtn: {
    background:"none", border:"none", cursor:"pointer",
    display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"4px 16px",
  },
  uploadScreen: {
    flex:1, display:"flex", flexDirection:"column",
    alignItems:"center", justifyContent:"center", padding:24, gap:24,
  },
  logoCircle: {
    fontSize:48, background:"linear-gradient(135deg,#1a0a2e,#4a0080)", borderRadius:24,
    width:84, height:84, display:"flex", alignItems:"center", justifyContent:"center",
    boxShadow:"0 8px 32px rgba(139,47,201,0.5)",
  },
  dropZone: {
    width:"100%", border:"2px dashed rgba(139,47,201,0.5)", borderRadius:20,
    padding:"28px 20px", display:"flex", flexDirection:"column",
    alignItems:"center", gap:8, cursor:"pointer",
    background: isDark ? "rgba(139,47,201,0.05)" : "rgba(139,47,201,0.04)",
  },
  dropActive: { background:"rgba(139,47,201,0.15)", borderColor:"#e040fb" },
  bankTag: {
    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
    borderRadius:20, padding:"4px 12px", fontSize:11,
    color: isDark ? "#aaa" : "#666",
  },
  heroCard: {
    background: isDark ? "linear-gradient(135deg,#1a0a2e,#2d1060)" : "linear-gradient(135deg,#f3e8ff,#ede9fe)",
    border: isDark ? "1px solid rgba(224,64,251,0.2)" : "1px solid rgba(139,47,201,0.2)",
    borderRadius:20, padding:"20px 20px 16px", display:"flex", flexDirection:"column",
    alignItems:"center", gap:6, flexShrink:0,
  },
  heroLabel: { fontSize:11, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", fontWeight:500, letterSpacing:1.2, textTransform:"uppercase" },
  heroAmount: { fontSize:36, fontWeight:800, letterSpacing:-1.5 },
  heroRow: { display:"flex", gap:16, alignItems:"center" },
  heroSub: { fontSize:11, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)" },
  statRow: { display:"flex", gap:8, flexShrink:0 },
  statBox: {
    flex:1, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.07)",
    borderRadius:14, padding:"12px 8px", display:"flex", flexDirection:"column",
    alignItems:"center", gap:2,
  },
  statNum: { fontSize:20, fontWeight:700, color:"#9333ea" },
  statLabel: { fontSize:9, color: isDark ? "#666" : "#999" },
  section: {
    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.08)",
    borderRadius:16, overflow:"hidden", flexShrink:0,
  },
  sectionTitle: { fontSize:12, fontWeight:600, color: isDark ? "#888" : "#999", padding:"12px 14px 4px", display:"block" },
  row: {
    display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
    borderTop: isDark ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,0,0,0.05)",
  },
  rowTitle: { fontSize:13, fontWeight:600, color: isDark ? "#ddd" : "#222" },
  rowSub: { fontSize:10, color: isDark ? "#666" : "#999", marginTop:1 },
  rowAmt: { fontSize:12, color:"#ef4444", fontWeight:700, flexShrink:0, minWidth:65, textAlign:"right" },
  barTrack: { flex:1, height:5, background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)", borderRadius:3, overflow:"hidden", margin:"4px 0" },
  barFill: { height:"100%", borderRadius:3 },
  catIcon: {
    width:36, height:36, borderRadius:10,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:18, flexShrink:0,
  },
  detailHero: {
    padding:"12px 0 4px", display:"flex", flexDirection:"column",
    alignItems:"center", gap:4, flexShrink:0,
  },
  detailTotal: { fontSize:32, fontWeight:800, color:"#ef4444", letterSpacing:-1 },
  detailSub: { fontSize:12, color: isDark ? "#666" : "#999" },
});

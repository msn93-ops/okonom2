// api/categorize.js - AI-powered batch categorization
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { transactions } = req.body;
  if (!transactions?.length) return res.status(400).json({ error: 'No transactions' });

  const categories = [
    "Dagligvarer", "Mad & Restauranter", "Kiosk & Benzin",
    "Transport", "Tøj & Mode", "Shopping & Elektronik",
    "Sundhed & Fitness", "Bolig & Regninger", "Streaming & Abonnementer",
    "Spil & Betting", "Oplevelser & Fritid", "Opsparing & Overførsler",
    "Lønindtægt", "Kontanter", "Modtaget MobilePay", "Andet"
  ];

  const prompt = `Du er en dansk bank-kategoriseringsassistent. Kategoriser disse transaktioner.

Tilgængelige kategorier:
${categories.join(", ")}

Regler:
- AIRBNB = Oplevelser & Fritid
- GANNI, NEYE, H&M, Zara, tøjmærker = Tøj & Mode  
- Sport24, sportsbutikker = Sundhed & Fitness
- TV2, streaming-tjenester = Streaming & Abonnementer
- RUBY, barer, natklubber = Mad & Restauranter
- Boozt = Tøj & Mode
- Overførsel uden kontekst = Opsparing & Overførsler
- DKK alene = Andet

Svar KUN med JSON array i denne præcise format (ingen forklaring):
[{"id":0,"category":"Dagligvarer"},{"id":1,"category":"Transport"}]

Transaktioner:
${transactions.map((t, i) => `${i}: ${t}`).join('\n')}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.VITE_ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    return res.status(200).json({ categories: result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

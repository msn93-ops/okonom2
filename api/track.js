// api/track.js - Vercel serverless function
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { event_type, user_id, question, metadata } = req.body;
  if (!event_type || !user_id) return res.status(400).json({ error: 'Missing fields' });

  const response = await fetch(
    'https://nxfcftjyrnlbyoxudemy.supabase.co/rest/v1/events',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SECRET_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SECRET_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ event_type, user_id, question: question || null, metadata: metadata || null }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return res.status(500).json({ error: err });
  }

  return res.status(200).json({ ok: true });
}

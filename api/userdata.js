// api/userdata.js - Save and load user transactions
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader === 'Bearer undefined' || authHeader === 'Bearer null') {
    return res.status(401).json({ error: 'No valid token' });
  }

  const base = 'https://nxfcftjyrnlbyoxudemy.supabase.co/rest/v1';
  // Use service key for DB operations, but verify user via auth endpoint first
  const serviceHeaders = {
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_SECRET_KEY,
    'Authorization': 'Bearer ' + process.env.SUPABASE_SECRET_KEY,
  };

  // Always verify the user token first
  const userRes = await fetch('https://nxfcftjyrnlbyoxudemy.supabase.co/auth/v1/user', {
    headers: {
      'apikey': process.env.SUPABASE_SECRET_KEY,
      'Authorization': authHeader,
    },
  });
  const user = await userRes.json();
  if (!user.id) return res.status(401).json({ error: 'Invalid token' });

  const userId = user.id;

  // GET - load user data
  if (req.method === 'GET') {
    const [accountsRes, txRes] = await Promise.all([
      fetch(`${base}/user_accounts?id=eq.${userId}&select=*`, { headers: serviceHeaders }),
      fetch(`${base}/user_transactions?user_id=eq.${userId}&select=*&order=created_at.desc`, { headers: serviceHeaders }),
    ]);
    const accounts = await accountsRes.json();
    const transactions = await txRes.json();
    return res.status(200).json({
      accounts: accounts[0]?.accounts || [],
      transactions: Array.isArray(transactions) ? transactions : [],
    });
  }

  // POST - save user data
  if (req.method === 'POST') {
    const { accounts, accountData } = req.body;
    if (!accountData?.length) return res.status(400).json({ error: 'No data' });

    // Upsert user_accounts
    await fetch(`${base}/user_accounts?on_conflict=id`, {
      method: 'POST',
      headers: { ...serviceHeaders, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ id: userId, accounts }),
    });

    // Upsert each account's transactions
    for (const ad of accountData) {
      const existing = await fetch(
        `${base}/user_transactions?user_id=eq.${userId}&account_id=eq.${encodeURIComponent(ad.account_id)}`,
        { headers: serviceHeaders }
      );
      const existingData = await existing.json();

      if (Array.isArray(existingData) && existingData.length > 0) {
        await fetch(
          `${base}/user_transactions?user_id=eq.${userId}&account_id=eq.${encodeURIComponent(ad.account_id)}`,
          {
            method: 'PATCH',
            headers: { ...serviceHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ transactions: ad.transactions, updated_at: new Date().toISOString() }),
          }
        );
      } else {
        await fetch(`${base}/user_transactions`, {
          method: 'POST',
          headers: { ...serviceHeaders, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ user_id: userId, ...ad }),
        });
      }
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}

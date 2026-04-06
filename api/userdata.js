// api/userdata.js - Save and load user transactions
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });

  const base = 'https://nxfcftjyrnlbyoxudemy.supabase.co/rest/v1';
  const headers = {
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_SECRET_KEY,
    'Authorization': authHeader,
  };

  // GET - load user data
  if (req.method === 'GET') {
    const [accountsRes, txRes] = await Promise.all([
      fetch(`${base}/user_accounts?select=*`, { headers }),
      fetch(`${base}/user_transactions?select=*&order=created_at.desc`, { headers }),
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
    // accountData = [{ account_id, account_label, account_type, transactions }]

    // Get user id from token
    const userRes = await fetch('https://nxfcftjyrnlbyoxudemy.supabase.co/auth/v1/user', {
      headers: { 'apikey': process.env.SUPABASE_SECRET_KEY, 'Authorization': authHeader },
    });
    const user = await userRes.json();
    if (!user.id) return res.status(401).json({ error: 'Invalid token' });

    // Upsert user_accounts
    await fetch(`${base}/user_accounts?on_conflict=id`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ id: user.id, accounts }),
    });

    // Upsert each account's transactions
    for (const ad of accountData) {
      // Check if exists
      const existing = await fetch(`${base}/user_transactions?user_id=eq.${user.id}&account_id=eq.${ad.account_id}`, { headers });
      const existingData = await existing.json();

      if (existingData.length > 0) {
        await fetch(`${base}/user_transactions?user_id=eq.${user.id}&account_id=eq.${ad.account_id}`, {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ transactions: ad.transactions, updated_at: new Date().toISOString() }),
        });
      } else {
        await fetch(`${base}/user_transactions`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ user_id: user.id, ...ad }),
        });
      }
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader.includes('undefined') || authHeader.includes('null')) {
    return res.status(401).json({ error: 'No valid token' });
  }

  const SUPABASE_URL = 'https://nxfcftjyrnlbyoxudemy.supabase.co';
  const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;

  // Verify user token
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': authHeader,
    },
  });
  const user = await userRes.json();
  if (!user.id) return res.status(401).json({ error: 'Invalid token', detail: user });

  const userId = user.id;
  const dbHeaders = {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': 'Bearer ' + SERVICE_KEY,
    'Prefer': 'return=representation',
  };
  const base = `${SUPABASE_URL}/rest/v1`;

  if (req.method === 'GET') {
    const [accRes, txRes] = await Promise.all([
      fetch(`${base}/user_accounts?id=eq.${userId}`, { headers: dbHeaders }),
      fetch(`${base}/user_transactions?user_id=eq.${userId}&order=created_at.desc`, { headers: dbHeaders }),
    ]);
    const accData = await accRes.json();
    const txData = await txRes.json();
    return res.status(200).json({
      accounts: accData[0]?.accounts || [],
      transactions: Array.isArray(txData) ? txData : [],
    });
  }

  if (req.method === 'POST') {
    const { accounts, accountData } = req.body;
    if (!Array.isArray(accountData) || accountData.length === 0) {
      return res.status(400).json({ error: 'No accountData' });
    }

    // Upsert user_accounts
    const accUpsertRes = await fetch(`${base}/user_accounts`, {
      method: 'POST',
      headers: { ...dbHeaders, 'Prefer': 'resolution=merge-duplicates,return=minimal', 'on_conflict': 'id' },
      body: JSON.stringify({ id: userId, accounts: accounts || [] }),
    });
    if (!accUpsertRes.ok) {
      const err = await accUpsertRes.text();
      console.error('user_accounts upsert error:', err);
    }

    // Upsert each account's transactions
    for (const ad of accountData) {
      const checkRes = await fetch(
        `${base}/user_transactions?user_id=eq.${userId}&account_id=eq.${encodeURIComponent(ad.account_id)}`,
        { headers: dbHeaders }
      );
      const existing = await checkRes.json();

      if (Array.isArray(existing) && existing.length > 0) {
        const patchRes = await fetch(
          `${base}/user_transactions?user_id=eq.${userId}&account_id=eq.${encodeURIComponent(ad.account_id)}`,
          {
            method: 'PATCH',
            headers: { ...dbHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              transactions: ad.transactions,
              account_label: ad.account_label,
              account_type: ad.account_type,
              updated_at: new Date().toISOString(),
            }),
          }
        );
        if (!patchRes.ok) console.error('PATCH error:', await patchRes.text());
      } else {
        const postRes = await fetch(`${base}/user_transactions`, {
          method: 'POST',
          headers: { ...dbHeaders, 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            user_id: userId,
            account_id: ad.account_id,
            account_label: ad.account_label,
            account_type: ad.account_type,
            transactions: ad.transactions,
          }),
        });
        if (!postRes.ok) console.error('POST error:', await postRes.text());
      }
    }

    return res.status(200).json({ ok: true, userId, accounts: accountData.length });
  }

  return res.status(405).end();
}

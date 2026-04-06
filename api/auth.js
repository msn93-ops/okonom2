export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { action, email, password } = req.body;
  const base = 'https://nxfcftjyrnlbyoxudemy.supabase.co/auth/v1';
  const headers = {
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_SECRET_KEY,
    'Authorization': 'Bearer ' + process.env.SUPABASE_SECRET_KEY,
  };

  if (action === 'signup') {
    const r = await fetch(`${base}/signup`, {
      method: 'POST', headers,
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();

    if (data.error) {
      const msg = data.error.message || data.msg || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        return res.status(400).json({ error: 'Der findes allerede en bruger med denne email' });
      }
      return res.status(400).json({ error: msg || 'Noget gik galt — prøv igen' });
    }

    // Track signup
    fetch('https://nxfcftjyrnlbyoxudemy.supabase.co/rest/v1/events', {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ event_type: 'user_signup', user_id: data.user?.id || email, metadata: { email } }),
    }).catch(() => {});

    // Auto-login to get session
    const loginRes = await fetch(`${base}/token?grant_type=password`, {
      method: 'POST', headers,
      body: JSON.stringify({ email, password }),
    });
    const loginData = await loginRes.json();

    if (!loginData.access_token) {
      return res.status(400).json({ error: 'Der findes allerede en bruger med denne email' });
    }

    return res.status(200).json({
      user: loginData.user,
      session: loginData.access_token,
      refresh: loginData.refresh_token,
    });
  }

  if (action === 'login') {
    const r = await fetch(`${base}/token?grant_type=password`, {
      method: 'POST', headers,
      body: JSON.stringify({ email, password }),
    });
    const raw = await r.text();
    let data;
    try { data = JSON.parse(raw); } catch { return res.status(500).json({ error: 'Server fejl' }); }

    if (data.error || data.error_description) {
      return res.status(400).json({ error: 'Forkert email eller adgangskode' });
    }
    if (!data.access_token) {
      return res.status(400).json({ error: 'Forkert email eller adgangskode' });
    }
    return res.status(200).json({
      user: data.user,
      session: data.access_token,
      refresh: data.refresh_token,
    });
  }

  if (action === 'refresh') {
    const r = await fetch(`${base}/token?grant_type=refresh_token`, {
      method: 'POST', headers,
      body: JSON.stringify({ refresh_token: req.body.refresh }),
    });
    const data = await r.json();
    if (!data.access_token) return res.status(401).json({ error: 'Session udløbet' });
    return res.status(200).json({ session: data.access_token, refresh: data.refresh_token });
  }

  return res.status(400).json({ error: 'Ukendt handling' });
}

// api/stats.js - Admin dashboard endpoint (password protected)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Simple password protection
  const { pw } = req.query;
  if (pw !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const headers = {
    'apikey': process.env.SUPABASE_SECRET_KEY,
    'Authorization': 'Bearer ' + process.env.SUPABASE_SECRET_KEY,
  };
  const base = 'https://nxfcftjyrnlbyoxudemy.supabase.co/rest/v1';

  // Fetch all events
  const [eventsRes] = await Promise.all([
    fetch(base + '/events?select=*&order=created_at.desc&limit=1000', { headers }),
  ]);

  const events = await eventsRes.json();

  // Calculate stats
  const uniqueUsers = new Set(events.map(e => e.user_id)).size;
  const totalChats = events.filter(e => e.event_type === 'chat_message').length;
  const totalUploads = events.filter(e => e.event_type === 'csv_upload').length;
  const totalSessions = events.filter(e => e.event_type === 'session_start').length;
  const totalSignups = events.filter(e => e.event_type === 'user_signup').length;

  // Top questions
  const questions = events
    .filter(e => e.question)
    .reduce((acc, e) => {
      acc[e.question] = (acc[e.question] || 0) + 1;
      return acc;
    }, {});
  const topQuestions = Object.entries(questions)
    .sort((a,b) => b[1]-a[1])
    .slice(0, 20)
    .map(([q, count]) => ({ question: q, count }));

  // Daily active users (last 30 days)
  const dailyStats = {};
  events.forEach(e => {
    const day = e.created_at?.slice(0, 10);
    if (!day) return;
    if (!dailyStats[day]) dailyStats[day] = new Set();
    dailyStats[day].add(e.user_id);
  });
  const dailyUsers = Object.entries(dailyStats)
    .sort((a,b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, users]) => ({ date, users: users.size }));

  return res.status(200).json({
    summary: { uniqueUsers, totalChats, totalUploads, totalSessions, totalSignups },
    topQuestions,
    dailyUsers,
    recentEvents: events.slice(0, 50),
  });
}

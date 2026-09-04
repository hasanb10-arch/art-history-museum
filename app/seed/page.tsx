'use client';
import { useState } from 'react';
import Link from 'next/link';

type Unit = { period: string; title: string };
type Line = { title: string; status: string; note?: string; paintings?: number };

export default function SeedPage() {
  const [secret, setSecret] = useState('');
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setRunning(true); setLines([]); setMsg(null);
    const h = { 'content-type': 'application/json', 'x-seed-secret': secret };
    const plan = await fetch('/api/seed', { headers: h });
    if (!plan.ok) { setMsg(plan.status === 401 ? 'Wrong secret.' : 'Seeder unavailable.'); setRunning(false); return; }
    const { artists, database } = await plan.json() as { artists: Unit[]; database: boolean };
    if (!database) { setMsg('DATABASE_URL is not set on the server.'); setRunning(false); return; }
    setMsg('Seeding periods from Wikipedia');
    const p = await fetch('/api/seed', { method: 'POST', headers: h, body: JSON.stringify({ step: 'periods' }) });
    if (!p.ok) { setMsg('Could not seed periods: ' + ((await p.json()).error || p.status)); setRunning(false); return; }
    for (const u of artists) {
      setMsg(`Fetching ${u.title}`);
      const r = await fetch('/api/seed', { method: 'POST', headers: h, body: JSON.stringify({ artist: u.title, period: u.period }) });
      const j = await r.json().catch(() => ({ status: 'error', note: String(r.status) }));
      setLines(l => [...l, { title: u.title, status: j.status || 'error', note: j.note, paintings: j.paintings }]);
    }
    setMsg('Done. Open the timeline.');
    setRunning(false);
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'start center', padding: '3rem 1rem' }}>
      <div className="placard" style={{ width: 'min(720px, 100%)', padding: '2rem 2.2rem' }}>
        <h2 style={{ fontSize: '1.6rem' }}>Fill the museum from Wikipedia</h2>
        <p>Pulls every period, artist and painting from Wikipedia, Wikidata and Wikimedia Commons into your Neon database. One artist per request, so it runs fine on Vercel. Takes 5 to 10 minutes. You can re-run it at any time.</p>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ display: 'block', fontSize: '.9rem', color: 'var(--fog)' }}>SEED_SECRET</span>
          <input type="password" value={secret} onChange={e => setSecret(e.target.value)} disabled={running}
            style={{ width: '100%', border: 0, borderBottom: '1px solid var(--brass)', background: 'transparent', padding: '.5rem 0', fontFamily: 'var(--serif)', fontSize: '1.05rem', color: 'var(--umber)' }} />
        </label>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn" onClick={run} disabled={running || !secret}>{running ? 'Seeding' : 'Seed the museum'}</button>
          <Link href="/" style={{ color: 'var(--fog)' }}>Back to the timeline</Link>
        </div>
        {msg && <p style={{ color: 'var(--brass)' }}>{msg}</p>}
        {lines.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.95rem', marginTop: '1rem' }}>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} style={{ borderTop: '1px solid rgba(59,46,37,.12)' }}>
                  <td style={{ padding: '.35rem 0' }}>{l.title}</td>
                  <td style={{ padding: '.35rem 0', color: l.status === 'ok' ? 'var(--umber)' : 'var(--oxblood)' }}>{l.status}</td>
                  <td style={{ padding: '.35rem 0', textAlign: 'right' }}>{l.paintings ?? ''}</td>
                  <td style={{ padding: '.35rem 0 .35rem 1rem', color: 'var(--fog)' }}>{l.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

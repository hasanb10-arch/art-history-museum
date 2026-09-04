'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Timeline from '@/components/Timeline';
import Filter from '@/components/Filter';
import ArtistCard from '@/components/ArtistCard';
import type { Artist, Period } from '@/lib/types';

export default function Home() {
  const [periods, setPeriods] = useState<Period[] | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [sel, setSel] = useState<{ a: Artist; p: Period } | null>(null);
  const [focusPeriod, setFocusPeriod] = useState<string | null>(null);
  const [focusArtist, setFocusArtist] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/periods').then(r => r.json()).then(d => { setPeriods(d.periods || []); setReason(d.reason || null); }).catch(() => { setPeriods([]); setReason('error'); });
  }, []);

  const empty = periods && periods.length === 0;

  return (
    <main style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <header style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '1.2rem 1.6rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }}>
          <h1 className="serif" style={{ margin: 0, fontWeight: 500, fontSize: '1.7rem', letterSpacing: '.01em' }}>Museum of Art History</h1>
          <div style={{ color: 'var(--fog)', fontSize: '.9rem', marginTop: 4 }}>Scroll to zoom into a period. Artists appear as you get closer.</div>
        </div>
        {periods && periods.length > 0 && (
          <div style={{ pointerEvents: 'auto' }}>
            <Filter periods={periods} onPeriod={s => { setFocusPeriod(null); setTimeout(() => setFocusPeriod(s), 0); }} onArtist={(a, p) => { setFocusArtist(a.id); setSel({ a, p }); }} />
          </div>
        )}
      </header>

      {periods && periods.length > 0 && (
        <Timeline periods={periods} onArtist={(a, p) => setSel({ a, p })} focusPeriod={focusPeriod} focusArtist={focusArtist} />
      )}

      {!periods && <div className="serif" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--fog)' }}>Opening the archive</div>}

      {empty && (
        <div className="placard" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', padding: '2rem 2.2rem', width: 'min(520px, 90vw)' }} data-testid="empty-state">
          <h2 style={{ fontSize: '1.5rem' }}>The galleries are empty</h2>
          <p>
            {reason === 'no-database'
              ? 'No database is connected. Add DATABASE_URL and SEED_SECRET to the environment, redeploy, then run the seeder.'
              : 'The database is connected but nothing has been seeded from Wikipedia yet.'}
          </p>
          <Link href="/seed" className="btn">Open the seeder</Link>
        </div>
      )}

      <ArtistCard artist={sel?.a || null} period={sel?.p || null} onClose={() => setSel(null)} />

      <footer style={{ position: 'absolute', left: '1.6rem', bottom: '1rem', color: 'var(--fog)', fontSize: '.8rem' }}>
        All text and images from Wikipedia and Wikimedia Commons.
      </footer>
    </main>
  );
}

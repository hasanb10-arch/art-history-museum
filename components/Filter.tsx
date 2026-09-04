'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Artist, Period } from '@/lib/types';

type Props = {
  periods: Period[];
  onPeriod: (slug: string) => void;
  onArtist: (a: Artist, p: Period) => void;
};

export default function Filter({ periods, onPeriod, onArtist }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'period' | 'artist'>('period');
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);

  const artists = periods.flatMap(p => p.artists.map(a => ({ a, p })))
    .filter(({ a }) => a.name.toLowerCase().includes(query.toLowerCase()))
    .sort((x, y) => (x.a.birth_year || 0) - (y.a.birth_year || 0));

  return (
    <div ref={ref} style={{ position: 'relative', fontFamily: 'var(--serif)' }}>
      <button className="btn btn-dark" aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen(o => !o)} data-testid="filter-toggle">
        Find a period or artist
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.6 }}
            style={{
              position: 'absolute', top: 'calc(100% + 10px)', left: 0, width: 360, background: 'var(--ivory)', color: 'var(--umber)',
              borderRadius: 2, boxShadow: '0 24px 60px rgba(0,0,0,.6)', overflow: 'hidden', zIndex: 20,
            }}
            role="dialog" aria-label="Filter the timeline"
          >
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(59,46,37,.15)' }}>
              {(['period', 'artist'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: '.8rem 0', border: 0, background: 'transparent', color: 'var(--umber)',
                  fontFamily: 'var(--serif)', fontSize: '1rem', position: 'relative',
                }} data-testid={`filter-mode-${m}`}>
                  {m === 'period' ? 'By period' : 'By artist'}
                  {mode === m && (
                    <motion.span layoutId="filter-underline" style={{ position: 'absolute', left: 16, right: 16, bottom: -1, height: 2, background: 'var(--brass)' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
                  )}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', minHeight: 320, maxHeight: 420, overflowY: 'auto' }}>
              <AnimatePresence mode="wait" initial={false}>
                {mode === 'period' ? (
                  <motion.ul key="period" role="listbox"
                    initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }}
                    transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                    style={{ listStyle: 'none', margin: 0, padding: '.5rem 0' }}>
                    {periods.map(p => (
                      <li key={p.slug}>
                        <button onClick={() => { onPeriod(p.slug); setOpen(false); }}
                          style={{ width: '100%', textAlign: 'left', border: 0, background: 'transparent', padding: '.6rem 1.1rem', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--serif)', fontSize: '1rem', color: 'var(--umber)' }}
                          data-testid={`period-${p.slug}`}>
                          <span>{p.name}</span>
                          <span style={{ color: 'var(--fog)', fontSize: '.85rem' }}>{p.start_year} to {p.end_year}</span>
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                ) : (
                  <motion.div key="artist"
                    initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
                    <div style={{ padding: '.7rem 1.1rem .3rem' }}>
                      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Type a name" autoFocus
                        style={{ width: '100%', border: 0, borderBottom: '1px solid var(--brass)', background: 'transparent', padding: '.4rem 0', fontFamily: 'var(--serif)', fontSize: '1rem', color: 'var(--umber)' }}
                        aria-label="Search artists" />
                    </div>
                    <ul role="listbox" style={{ listStyle: 'none', margin: 0, padding: '.3rem 0' }}>
                      {artists.map(({ a, p }) => (
                        <li key={a.id}>
                          <button onClick={() => { onArtist(a, p); setOpen(false); }}
                            style={{ width: '100%', textAlign: 'left', border: 0, background: 'transparent', padding: '.5rem 1.1rem', display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--serif)', fontSize: '1rem', color: 'var(--umber)' }}>
                            <span style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: 'var(--ivory-2)', flex: '0 0 auto' }}>
                              {a.portrait_url && <img src={a.portrait_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                            </span>
                            <span style={{ flex: 1 }}>{a.name}</span>
                            <span style={{ color: 'var(--fog)', fontSize: '.85rem' }}>{p.name}</span>
                          </button>
                        </li>
                      ))}
                      {artists.length === 0 && <li style={{ padding: '.8rem 1.1rem', color: 'var(--fog)' }}>No artist by that name yet.</li>}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

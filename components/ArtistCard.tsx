'use client';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { lifespan, type Artist, type Period } from '@/lib/types';

type Props = { artist: Artist | null; period: Period | null; onClose: () => void };

export default function ArtistCard({ artist, period, onClose }: Props) {
  return (
    <AnimatePresence>
      {artist && period && (
        <motion.div key="veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,17,15,.72)', zIndex: 25, display: 'grid', placeItems: 'center', padding: '1rem' }}>
          <motion.article
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="placard" style={{ width: 'min(760px, 100%)', display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) 1fr', gap: 0, overflow: 'hidden' }}
            role="dialog" aria-modal="true" aria-labelledby="artist-name" data-testid="artist-card">
            <div style={{ background: 'var(--ivory-2)', minHeight: 300, position: 'relative' }}>
              {artist.portrait_url
                ? <img src={artist.portrait_url} alt={`Portrait of ${artist.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'sepia(.12) contrast(1.02)' }} />
                : <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--fog)' }}>No portrait on Wikipedia</div>}
            </div>
            <div style={{ padding: '1.6rem 1.8rem 1.4rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '.85rem', color: 'var(--brass)', letterSpacing: '.03em' }}>{period.name}</div>
              <h2 id="artist-name" style={{ fontSize: '1.9rem', lineHeight: 1.1, marginTop: '.3rem' }}>{artist.name}</h2>
              <div style={{ color: 'var(--fog)', marginTop: '.25rem', fontSize: '1rem' }}>{lifespan(artist)}</div>
              <div className="brassline" style={{ margin: '1rem 0' }} />
              <p style={{ margin: 0, fontSize: '1rem', maxHeight: 190, overflow: 'auto', paddingRight: 4 }}>{clip(artist.bio || '', 700)}</p>
              <div style={{ marginTop: 'auto', paddingTop: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Link href={`/artist/${artist.id}`} className="btn" data-testid="enter-gallery">
                  Enter the gallery{typeof artist.painting_count === 'number' ? ` (${artist.painting_count} works)` : ''}
                </Link>
                {artist.wiki_url && <a href={artist.wiki_url} target="_blank" rel="noreferrer" style={{ color: 'var(--fog)', fontSize: '.9rem' }}>Source: Wikipedia</a>}
                <button onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: 'var(--fog)', fontSize: '1.3rem' }}>×</button>
              </div>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function clip(s: string, n: number) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, cut.lastIndexOf('. ') + 1) || cut;
}

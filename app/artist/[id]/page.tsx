'use client';
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import Inspect from '@/components/Inspect';
import { lifespan, type Artist, type Painting, type Period } from '@/lib/types';

const Gallery = dynamic(() => import('@/components/Gallery'), { ssr: false });

export default function ArtistMuseum({ params }: { params: { id: string } }) {
  const [data, setData] = useState<{ artist: Artist; period: Period; paintings: Painting[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [inspecting, setInspecting] = useState<Painting | null>(null);

  useEffect(() => {
    fetch(`/api/artist/${params.id}`).then(async r => { if (!r.ok) throw new Error((await r.json()).error || r.status); return r.json(); })
      .then(setData).catch(e => setError(String(e.message || e)));
  }, [params.id]);

  const onReady = useCallback(() => setTimeout(() => setReady(true), 600), []);
  const closeInspect = useCallback(() => setInspecting(null), []);

  return (
    <main>
      {data && data.paintings.length > 0 && (
        <Gallery paintings={data.paintings} onInspect={setInspecting} inspecting={!!inspecting} onReady={onReady} />
      )}

      <AnimatePresence>
        {(!ready || !data) && !error && (
          <motion.div key="veil" className="veil" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.1, ease: 'easeInOut' }} data-testid="veil">
            <div style={{ textAlign: 'center' }}>
              <div className="serif" style={{ fontSize: '2.4rem', fontWeight: 500 }}>{data?.artist.name || ''}</div>
              <div style={{ color: 'var(--fog)', marginTop: 6 }}>{data ? lifespan(data.artist) : 'Opening the gallery'}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {data && data.paintings.length === 0 && (
        <div className="veil">
          <div className="placard" style={{ padding: '2rem', maxWidth: 520 }}>
            <h2>{data.artist.name}</h2>
            <p>Wikimedia Commons has no public-domain images of this artist&apos;s paintings, so there is nothing to hang. Later periods are affected by copyright.</p>
            <Link href="/" className="btn">Back to the timeline</Link>
          </div>
        </div>
      )}

      {error && (
        <div className="veil"><div className="placard" style={{ padding: '2rem' }}><h2>Could not open this gallery</h2><p>{error}</p><Link href="/" className="btn">Back to the timeline</Link></div></div>
      )}

      {data && ready && (
        <>
          <div style={{ position: 'fixed', top: '1rem', left: '1.2rem', zIndex: 10, display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
            <Link href="/" className="serif" style={{ color: 'var(--ivory)', textDecoration: 'none', opacity: .8 }}>Timeline</Link>
            <span className="serif" style={{ color: 'var(--ivory)', fontSize: '1.2rem' }}>{data.artist.name}</span>
            <span style={{ color: 'var(--fog)', fontSize: '.85rem' }}>{data.period.name}</span>
          </div>
          {!inspecting && <div className="hud">W A S D to walk, mouse to look, click a painting to inspect, Esc to release the mouse</div>}
        </>
      )}

      <Inspect painting={inspecting} artistName={data?.artist.name || ''} onClose={closeInspect} />
    </main>
  );
}

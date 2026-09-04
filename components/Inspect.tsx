'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Painting } from '@/lib/types';

export default function Inspect({ painting, artistName, onClose }: { painting: Painting | null; artistName: string; onClose: () => void }) {
  const [hi, setHi] = useState(false);
  useEffect(() => {
    setHi(false);
    if (!painting) return;
    const img = new Image();
    img.onload = () => setHi(true);
    img.src = painting.image_url;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [painting, onClose]);

  return (
    <AnimatePresence>
      {painting && (
        <motion.div key="inspect" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(11,10,9,.92)', zIndex: 40, display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(320px, 440px)', gap: '2rem', padding: '2.5rem', alignItems: 'center' }}
          data-testid="inspect">
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            style={{ height: '100%', display: 'grid', placeItems: 'center', minHeight: 0 }}>
            <img src={hi ? painting.image_url : painting.thumb_url} alt={painting.title}
              style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 5rem)', boxShadow: '0 40px 90px rgba(0,0,0,.7)', outline: '10px solid #b8964f', outlineOffset: 0, transition: 'filter .4s', filter: hi ? 'none' : 'blur(.5px)' }} />
          </motion.div>
          <motion.aside initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 30, delay: 0.05 }}
            className="placard" style={{ padding: '1.6rem 1.7rem', maxHeight: 'calc(100vh - 5rem)', overflow: 'auto' }}>
            <div style={{ fontSize: '.85rem', color: 'var(--brass)' }}>{artistName}</div>
            <h2 style={{ fontSize: '1.6rem', lineHeight: 1.15, marginTop: '.3rem' }}>{painting.title}</h2>
            <div style={{ color: 'var(--fog)', marginTop: '.2rem' }}>{painting.year ?? ''}{painting.license ? `  ·  ${painting.license}` : ''}</div>
            <div className="brassline" style={{ margin: '1rem 0' }} />
            {painting.story ? <p style={{ marginTop: 0 }}>{painting.story}</p> : <p style={{ color: 'var(--fog)' }}>Wikipedia has no dedicated article for this work, so there is no story to show.</p>}
            {painting.fun_facts?.length > 0 && (
              <>
                <h3 style={{ fontWeight: 500, fontSize: '1.05rem', marginBottom: '.4rem' }}>From the article</h3>
                <ul style={{ paddingLeft: '1.1rem', margin: 0 }}>
                  {painting.fun_facts.map((f, i) => <li key={i} style={{ marginBottom: '.5rem', lineHeight: 1.5 }}>{f}</li>)}
                </ul>
              </>
            )}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1.3rem' }}>
              <button className="btn" onClick={onClose} data-testid="inspect-close">Back to the gallery</button>
              {painting.wiki_url && <a href={painting.wiki_url} target="_blank" rel="noreferrer" style={{ color: 'var(--fog)', fontSize: '.9rem' }}>Source: Wikipedia</a>}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

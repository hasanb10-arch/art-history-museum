'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, ZoomTransform, type ZoomBehavior } from 'd3-zoom';
import { scaleLinear } from 'd3-scale';
import 'd3-transition';
import { activeYear, type Artist, type Period } from '@/lib/types';

type Props = {
  periods: Period[];
  onArtist: (a: Artist, p: Period) => void;
  focusPeriod?: string | null;      // slug to zoom to
  focusArtist?: number | null;      // artist id to zoom to
};

const YEAR_MIN = 1200;
const YEAR_MAX = 2035;
const ROW_H = 92;
const ARTIST_ZOOM = 2.6;            // scale at which artists appear

export default function Timeline({ periods, onArtist, focusPeriod, focusArtist }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [size, setSize] = useState({ w: 1200, h: 700 });
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);

  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const pad = 48;
  const x = useMemo(() => scaleLinear().domain([YEAR_MIN, YEAR_MAX]).range([pad, size.w - pad]), [size.w]);
  const zx = useMemo(() => t.rescaleX(x), [t, x]);

  // lay periods on alternating rows so overlapping ranges don't collide
  const rows = useMemo(() => {
    const placed: { p: Period; row: number }[] = [];
    for (const p of periods) {
      let row = 0;
      while (placed.some(q => q.row === row && q.p.end_year > p.start_year - 8 && q.p.start_year < p.end_year + 8)) row++;
      placed.push({ p, row });
    }
    return placed;
  }, [periods]);
  const rowCount = Math.max(1, ...rows.map(r => r.row + 1));
  const top = Math.max(pad, (size.h - rowCount * ROW_H) / 2);

  useEffect(() => {
    if (!svgRef.current) return;
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.9, 40])
      .translateExtent([[-size.w * 2, -size.h], [size.w * 3, size.h * 2]])
      .on('zoom', ev => setT(ev.transform));
    zoomRef.current = z;
    select(svgRef.current).call(z as any).on('dblclick.zoom', null);
  }, [size.w, size.h]);

  function zoomToYears(a: number, b: number, ms = 900) {
    if (!svgRef.current || !zoomRef.current) return;
    const k = Math.min(40, Math.max(1, (size.w - pad * 2) / (x(b) - x(a)) * 0.82));
    const cx = (x(a) + x(b)) / 2;
    const tr = zoomIdentity.translate(size.w / 2 - k * cx, 0).scale(k);
    select(svgRef.current).transition().duration(ms).call(zoomRef.current.transform as any, tr);
  }

  useEffect(() => {
    if (!focusPeriod) return;
    const p = periods.find(q => q.slug === focusPeriod);
    if (p) zoomToYears(p.start_year, p.end_year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPeriod]);

  useEffect(() => {
    if (!focusArtist) return;
    for (const p of periods) {
      const a = p.artists.find(q => q.id === focusArtist);
      if (a) { const y = activeYear(a, p.start_year); zoomToYears(y - 14, y + 14); return; }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusArtist]);

  const k = t.k;
  const showArtists = k >= ARTIST_ZOOM;
  const fade = Math.min(1, Math.max(0, (k - ARTIST_ZOOM) / 1.2));

  // decade / century ticks depending on zoom
  const step = k > 12 ? 10 : k > 4 ? 25 : k > 1.8 ? 50 : 100;
  const ticks: number[] = [];
  for (let y = Math.ceil(zx.invert(0) / step) * step; y <= zx.invert(size.w); y += step) ticks.push(y);

  return (
    <svg ref={svgRef} className="timeline-svg" width={size.w} height={size.h} role="application" aria-label="Zoomable timeline of art history">
      <defs>
        <clipPath id="portrait-clip"><circle r="17" /></clipPath>
      </defs>

      {/* axis */}
      <g>
        {ticks.map(y => (
          <g key={y} transform={`translate(${zx(y)},0)`}>
            <line y1={top - 30} y2={top + rowCount * ROW_H + 10} stroke="rgba(239,233,220,.08)" />
            <text y={top - 38} textAnchor="middle" fill="var(--fog)" fontSize={12} className="serif">{y}</text>
          </g>
        ))}
      </g>

      {/* periods */}
      {rows.map(({ p, row }) => {
        const x0 = zx(p.start_year), x1 = zx(p.end_year);
        const y = top + row * ROW_H;
        const w = Math.max(2, x1 - x0);
        const labelFits = w > p.name.length * 8.5;
        return (
          <g key={p.slug} className="period-band" onClick={() => zoomToYears(p.start_year, p.end_year)} opacity={showArtists ? 0.55 : 1}>
            <rect x={x0} y={y + 16} width={w} height={ROW_H - 32} rx={2} fill="var(--ivory)" fillOpacity={0.08} stroke="var(--brass)" strokeOpacity={0.55} />
            <text x={x0 + 12} y={y + 16 + (ROW_H - 32) / 2} dominantBaseline="central" className="serif" fontSize={labelFits ? 16 : 12} fill="var(--ivory)" opacity={showArtists ? 0.7 : 1}>
              {labelFits ? p.name : p.name.split(' ')[0]}
            </text>
            <text x={x1 - 10} y={y + 16 + (ROW_H - 32) / 2} textAnchor="end" dominantBaseline="central" fontSize={11} fill="var(--fog)" opacity={labelFits ? 1 : 0}>
              {p.artists.length} artists
            </text>
          </g>
        );
      })}

      {/* artists (semantic zoom) */}
      {showArtists && rows.map(({ p, row }) => {
        const y = top + row * ROW_H + ROW_H / 2;
        const sorted = [...p.artists].sort((a, b) => activeYear(a, p.start_year) - activeYear(b, p.start_year));
        return sorted.map((a, i) => {
          const ax = zx(activeYear(a, p.start_year));
          // Only mount artists that are actually on screen: off-screen nodes are dead weight for the
          // browser and unreachable for anyone tabbing or clicking through the timeline.
          if (ax < -80 || ax > size.w + 80) return null;
          const stagger = (i % 2 === 0 ? -1 : 1) * 14;
          return (
            <g key={a.id} className="artist-node" transform={`translate(${ax},${y + stagger})`} opacity={fade}
               onClick={e => { e.stopPropagation(); onArtist(a, p); }} role="button" aria-label={`Open ${a.name}`}>
              <circle r={19} fill="var(--night-2)" stroke="var(--brass)" strokeWidth={1.2} />
              {a.portrait_url && <image href={a.portrait_url} x={-17} y={-17} width={34} height={34} preserveAspectRatio="xMidYMid slice" clipPath="url(#portrait-clip)" />}
              <text y={34} textAnchor="middle" fontSize={12} className="serif" fill="var(--ivory)">{a.name}</text>
              <text y={48} textAnchor="middle" fontSize={10} fill="var(--fog)">{a.birth_year ?? ''}{a.death_year ? ` to ${a.death_year}` : ''}</text>
            </g>
          );
        });
      })}
    </svg>
  );
}

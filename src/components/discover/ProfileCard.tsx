import { useRef, useState } from 'react';
import { BadgeCheck, ChevronLeft, ChevronRight, Heart, X } from 'lucide-react';
import type { Candidate } from '../../features/discovery/api';

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ProfileCard({ c, busy, onLike, onPass }: { c: Candidate; busy: boolean; onLike: () => void; onPass: () => void }) {
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  const [dx, setDx] = useState(0);
  const start = useRef<number | null>(null);
  const captured = useRef(false);
  const n = c.photoUrls.length;

  function down(e: React.PointerEvent) { if ((e.target as HTMLElement).closest('button')) return; start.current = e.clientX; captured.current = false; }
  function move(e: React.PointerEvent) {
    if (start.current === null || busy) return;
    const d = e.clientX - start.current;
    if (!captured.current && Math.abs(d) > 8) { e.currentTarget.setPointerCapture(e.pointerId); captured.current = true; }
    if (captured.current) setDx(d);
  }
  function up() {
    if (start.current !== null && captured.current && !busy) { if (dx > 110) onLike(); else if (dx < -110) onPass(); }
    start.current = null; captured.current = false; setDx(0);
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <article onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ transform: `translateX(${dx}px) rotate(${reduced() ? 0 : dx / 25}deg)`, touchAction: 'pan-y' }}
        className="card relative select-none overflow-hidden" aria-label={`${c.display_name}, ${c.age}`}>
        <div className="relative aspect-[3/4] bg-mist">
          {n > 0 && <img src={c.photoUrls[i]} alt={`${c.display_name}, photo ${i + 1} of ${n}`} draggable={false} className="h-full w-full object-cover" />}
          {n > 1 && (<>
            <button aria-label="Previous photo" disabled={i === 0} onClick={() => setI(i - 1)} className="absolute left-2 top-1/2 rounded-full bg-ink/60 p-2 text-white disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
            <button aria-label="Next photo" disabled={i === n - 1} onClick={() => setI(i + 1)} className="absolute right-2 top-1/2 rounded-full bg-ink/60 p-2 text-white disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
            <div className="absolute inset-x-0 top-2 flex justify-center gap-1.5" aria-hidden>{c.photoUrls.map((_, k) => <span key={k} className={`h-1.5 w-8 rounded ${k === i ? 'bg-white' : 'bg-white/40'}`} />)}</div></>)}
          {dx > 40 && <span className="absolute left-4 top-10 rounded border-2 border-ok px-3 py-1 text-xl font-extrabold text-ok">LIKE</span>}
          {dx < -40 && <span className="absolute right-4 top-10 rounded border-2 border-bad px-3 py-1 text-xl font-extrabold text-bad">PASS</span>}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-4 text-white">
            <h2 className="flex items-center gap-2 text-2xl font-extrabold">{c.display_name}, {c.age}{c.verified && <BadgeCheck className="h-6 w-6 text-sky" aria-label="Verified" />}</h2>
            {c.neighbourhood && <p className="text-white/80">{c.neighbourhood}, Mumbai</p>}
          </div>
        </div>
        <div className="space-y-3 p-4">
          {c.bio && <p>{c.bio}</p>}
          {c.relationship_intention && <p className="font-semibold text-royal">{c.relationship_intention}</p>}
          {c.interests.length > 0 && <ul className="flex flex-wrap gap-2">{c.interests.map(t => <li key={t} className="rounded-full bg-mist px-3 py-1 text-sm">{t}</li>)}</ul>}
          <button className="font-semibold text-royal" aria-expanded={full} onClick={() => setFull(f => !f)}>{full ? 'Hide full profile' : 'View full profile'}</button>
          {full && (<div className="space-y-3">
            {c.languages.length > 0 && <p><span className="font-semibold">Languages:</span> {c.languages.join(', ')}</p>}
            <div className="grid grid-cols-3 gap-2">{c.photoUrls.map((u, k) => <img key={k} src={u} alt={`${c.display_name}, photo ${k + 1}`} loading="lazy" className="aspect-[3/4] w-full rounded-lg object-cover" />)}</div></div>)}
        </div>
      </article>
      <div className="mt-4 flex justify-center gap-6">
        <button onClick={onPass} disabled={busy} aria-label={`Pass on ${c.display_name}`} className="grid h-16 w-16 place-items-center rounded-full border border-line bg-white text-bad shadow-card disabled:opacity-50"><X className="h-8 w-8" /></button>
        <button onClick={onLike} disabled={busy} aria-label={`Like ${c.display_name}`} className="grid h-16 w-16 place-items-center rounded-full bg-royal text-white shadow-card disabled:opacity-50"><Heart className="h-8 w-8" /></button>
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../ui/Logo';

export function LegalLayout({ title, draft = true, children }: { title: string; draft?: boolean; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-ink px-4 py-3"><div className="mx-auto max-w-3xl"><Link to="/"><Logo /></Link></div></header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {draft && <p role="note" className="mt-3 rounded-lg border border-warn bg-mist p-3 text-sm">
          <strong>Draft.</strong> This text describes how the app currently works. It has not been reviewed by a lawyer. Have it reviewed before launch.</p>}
        <div className="mt-6 space-y-4 leading-relaxed [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-extrabold [&_li]:ml-5 [&_li]:list-disc [&_a]:text-royal [&_a]:underline">{children}</div>
        <p className="mt-10 text-sm text-slate2"><Link to="/">Home</Link> · <Link to="/safety">Safety</Link> · <Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link> · <Link to="/help">Help</Link></p>
      </main>
    </div>
  );
}
export const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || '';
export const Contact = () => SUPPORT_EMAIL ? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> : <em>(support email not configured yet: set VITE_SUPPORT_EMAIL)</em>;

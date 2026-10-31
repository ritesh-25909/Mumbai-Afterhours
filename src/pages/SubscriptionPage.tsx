import { Check, Clock } from 'lucide-react';
import { FREE_FEATURES, PLANNED_PREMIUM } from '../features/subscriptions/entitlements';

export default function SubscriptionPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold">Plans</h1>
      <section className="card p-5">
        <h2 className="font-extrabold">You are on the Free plan</h2>
        <p className="mt-1 text-slate2">Mumbai Afterhours is free to use. Safety tools (report, block, unmatch, verification and account deletion) will always be free.</p>
        <ul className="mt-3 space-y-1">{FREE_FEATURES.map(f => <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-ok" aria-hidden />{f}</li>)}</ul>
      </section>
      <section className="card p-5">
        <h2 className="font-extrabold">Premium is not available yet</h2>
        <p className="mt-1 text-slate2">We may offer optional extras later. Nothing below can be bought or switched on today, and no payment is taken.</p>
        <ul className="mt-3 space-y-1 text-slate2">{PLANNED_PREMIUM.map(f => <li key={f} className="flex items-center gap-2"><Clock className="h-4 w-4" aria-hidden />{f}</li>)}</ul>
      </section>
    </div>
  );
}

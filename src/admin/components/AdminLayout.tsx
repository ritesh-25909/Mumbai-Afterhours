import { NavLink, Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, Flag, ArrowLeft, LogOut, Menu, X, UserRound, KeyRound, Sparkles, ScrollText, Megaphone, AlertTriangle, Download, HeartPulse, HardDrive } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../features/auth/AuthProvider';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: UserRound },
  { to: '/admin/permissions', label: 'User permissions', icon: KeyRound },
  { to: '/admin/moderation', label: 'Verification review', icon: ShieldCheck },
  { to: '/admin/reports', label: 'User reports', icon: Flag },
  { to: '/admin/recommendations', label: 'Recommendations', icon: Sparkles },
  { to: '/admin/audit', label: 'Audit logs', icon: ScrollText },
  { to: '/admin/risk-review', label: 'Risk review', icon: AlertTriangle },
  { to: '/admin/announcements', label: 'Notifications', icon: Megaphone },
  { to: '/admin/exports', label: 'Data export', icon: Download },
  { to: '/admin/health', label: 'Platform health', icon: HeartPulse },
  { to: '/admin/storage', label: 'Storage usage', icon: HardDrive },
];

export function AdminLayout() {
  const { session, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (mobile = false) => (
    <nav aria-label="Admin navigation" className="space-y-2">
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={() => mobile && setMobileOpen(false)}
          className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'bg-[#174fc5] text-white shadow-lg shadow-blue-950/20' : 'text-slate-600 hover:bg-blue-50 hover:text-[#174fc5]'}`}>
          <Icon size={19} aria-hidden="true" />{label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f4f7fc] text-[#10213e] md:flex">
      <aside className="hidden w-[268px] shrink-0 flex-col border-r border-blue-100 bg-white p-5 md:flex md:min-h-screen">
        <Link to="/admin" className="mb-8 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#0c1d43] to-[#174fc5] p-4 text-white">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><ShieldCheck size={24} /></span>
          <span><strong className="block text-sm tracking-wide">MUMBAI AFTERHOURS</strong><small className="text-blue-100">Admin Command Center</small></span>
        </Link>
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Workspace</p>
        {nav()}
        <div className="mt-auto space-y-2 border-t border-slate-100 pt-4">
          <Link to="/discover" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"><ArrowLeft size={18} /> Back to website</Link>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-700"><LogOut size={18} /> Sign out</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-blue-100 bg-white/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-slate-200 p-2 text-slate-700 md:hidden" onClick={() => setMobileOpen(v => !v)} aria-label={mobileOpen ? 'Close admin menu' : 'Open admin menu'}>{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
            <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#174fc5]">Administration</p><p className="text-sm font-bold text-slate-800">Command Center</p></div>
          </div>
          <div className="hidden text-right sm:block"><p className="text-xs font-semibold text-slate-700">{session?.user.email ?? 'Administrator'}</p><p className="text-[11px] text-slate-400">Secure admin session</p></div>
          <Link to="/discover" className="text-xs font-semibold text-[#174fc5] md:hidden">Exit</Link>
        </header>
        {mobileOpen && <div className="border-b border-blue-100 bg-white p-4 md:hidden">{nav(true)}<button onClick={signOut} className="mt-3 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-rose-50"><LogOut size={18} /> Sign out</button></div>}
        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}

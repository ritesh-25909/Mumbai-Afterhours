import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import {
  Compass,
  Heart,
  MessageCircle,
  UserRound,
  LogOut,
  ShieldCheck,
  Settings,
  ChevronRight,
} from 'lucide-react';

import { useAuth } from '../../features/auth/AuthProvider';
import { myRoles } from '../../features/verification/api';
import { useMatchNotifications } from '../../features/matches/useMatchNotifications';
import { ChatEventsProvider, useMessageEvents } from '../../features/messaging/ChatEvents';
import { unreadTotal } from '../../features/messaging/api';

const base = [
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/matches', label: 'Matches', icon: Heart },
  { to: '/inbox', label: 'Messages', icon: MessageCircle },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

const settingsLink = { to: '/settings', label: 'Settings', icon: Settings };
const modLink = { to: '/moderation', label: 'Review', icon: ShieldCheck };

export function AppShell() {
  const { session } = useAuth();

  if (!session?.user?.id) return null;

  return (
    <ChatEventsProvider uid={session.user.id}>
      <ShellBody />
    </ChatEventsProvider>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-[54px] w-[54px] shrink-0 place-items-center rounded-[17px] border border-blue-400/60 bg-gradient-to-br from-blue-500/20 via-blue-900/25 to-[#020817] shadow-[0_0_24px_-9px_rgba(0,119,255,0.9),inset_0_1px_0_rgba(255,255,255,0.12)]">
        <span className="bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-600 bg-clip-text text-[38px] font-black leading-none tracking-[-0.12em] text-transparent">
          M
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[23px] font-extrabold leading-[1.05] tracking-[-0.04em] text-white">
          Mumbai
        </p>
        <p className="mt-1 text-[19px] font-medium leading-none tracking-[0.14em] text-blue-200">
          Afterhours
        </p>
      </div>
    </div>
  );
}

function HeartArtwork() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative mt-auto h-[210px] shrink-0 overflow-hidden"
    >
      <div className="absolute -bottom-16 -left-20 h-44 w-[125%] rotate-[19deg] rounded-[50%] border-t border-blue-500/25 bg-gradient-to-br from-blue-700/40 via-blue-950/25 to-transparent shadow-[0_-12px_55px_-25px_rgba(0,95,255,0.8)]" />
      <div className="absolute -bottom-24 -left-12 h-44 w-[115%] rotate-[17deg] rounded-[50%] bg-blue-700/10 blur-2xl" />
      <Heart className="absolute bottom-[76px] left-[48px] h-[82px] w-[82px] -rotate-[15deg] fill-blue-950/30 text-blue-600/55 drop-shadow-[0_0_15px_rgba(0,88,255,0.25)]" strokeWidth={0.7} />
      <Heart className="absolute bottom-[48px] left-[116px] h-[55px] w-[55px] rotate-[15deg] fill-blue-950/40 text-blue-600/45" strokeWidth={0.7} />
    </div>
  );
}

function ShellBody() {
  const { session, signOut } = useAuth();
  const loc = useLocation();
  const [unread, setUnread] = useState(0);
  const [isMod, setIsMod] = useState(false);
  const { notice, dismiss } = useMatchNotifications(session?.user.id);

  useEffect(() => {
    let active = true;
    unreadTotal()
      .then(count => {
        if (active) setUnread(count);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [loc.pathname]);

  useMessageEvents(() => {
    window.setTimeout(() => {
      unreadTotal().then(setUnread).catch(() => {});
    }, 400);
  });

  useEffect(() => {
    let active = true;
    myRoles()
      .then(roles => {
        if (active) setIsMod(roles.includes('moderator') || roles.includes('admin'));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const links = isMod ? [...base, modLink] : base;
  const sidebarLinks = [...links, settingsLink];

  const sidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'group relative flex min-h-[64px] items-center gap-4 rounded-[20px] border px-3.5 py-3',
      'text-[15px] font-bold tracking-[-0.01em] transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020918]',
      isActive
        ? 'border-cyan-400/80 bg-gradient-to-r from-[#087cff] via-[#0758f5] to-[#1239e8] text-white shadow-[0_0_28px_-8px_rgba(0,111,255,0.95),inset_0_1px_0_rgba(255,255,255,0.28)]'
        : 'border-blue-300/[0.08] bg-gradient-to-br from-[#0b1930]/90 to-[#071225]/95 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] hover:border-blue-400/30 hover:from-[#10213d] hover:to-[#09182e] hover:text-white',
    ].join(' ');

  const mobileTabClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition ${
      isActive ? 'text-cyan-300' : 'text-slate-400 hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-[#f5f7fb] md:flex">
      {/* Desktop sidebar — visual treatment matched to the supplied reference */}
      <aside className="relative z-20 hidden w-[300px] shrink-0 flex-col overflow-hidden border-r border-blue-950/70 bg-[#020918] px-5 pb-5 pt-8 text-white md:sticky md:top-0 md:flex md:h-screen">
        {/* Deep navy gradients and blue ambient light */}
        <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-24 h-80 w-80 rounded-full bg-blue-700/25 blur-[90px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-[38%] h-64 w-64 rounded-full bg-blue-800/15 blur-[90px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-blue-700/20 blur-[100px]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(20,76,180,0.18),transparent_42%),linear-gradient(145deg,transparent_45%,rgba(0,20,60,0.24))]" />

        <Link
          to="/discover"
          aria-label="Mumbai Afterhours home"
          className="relative mb-8 block px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          <Brand />
          <p className="mt-4 whitespace-nowrap pl-1 text-[10px] font-semibold uppercase tracking-[0.19em] text-blue-200/65">
            Real people. Real connections.
          </p>
        </Link>

        <nav className="relative flex flex-col gap-3" aria-label="Main navigation">
          {sidebarLinks.map(item => (
            <NavLink key={item.to} to={item.to} className={sidebarLinkClass}>
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      'grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full transition',
                      isActive
                        ? 'border border-cyan-200/35 bg-white/15 text-white shadow-[0_0_18px_rgba(103,232,249,0.18)]'
                        : 'bg-white/[0.035] text-slate-200 group-hover:bg-blue-400/10 group-hover:text-white',
                    ].join(' ')}
                  >
                    <item.icon className="h-[25px] w-[25px]" strokeWidth={1.8} aria-hidden="true" />
                  </span>

                  <span className="min-w-0 flex-1 truncate">{item.label}</span>

                  {item.to === '/inbox' && unread > 0 && (
                    <span className="mr-1 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}

                  {item.to === '/inbox' && unread > 0 && (
                    <span className="absolute left-[72px] top-[12px] h-2.5 w-2.5 rounded-full border border-[#06142b] bg-blue-400" />
                  )}

                  <ChevronRight
                    className={`h-5 w-5 shrink-0 transition-transform ${
                      isActive ? 'text-white' : 'text-slate-300 group-hover:translate-x-1 group-hover:text-white'
                    }`}
                    aria-hidden="true"
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <HeartArtwork />

        <div className="relative border-t border-blue-300/25 pt-5">
          <button
            type="button"
            onClick={signOut}
            className="group flex min-h-[64px] w-full items-center gap-4 rounded-[20px] border border-blue-400/35 bg-gradient-to-br from-[#0b1930]/90 to-[#071225]/95 px-3.5 py-3 text-left text-[15px] font-bold text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-blue-300/60 hover:bg-blue-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <span className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full bg-white/[0.035] text-slate-100 group-hover:bg-blue-400/10">
              <LogOut className="h-[25px] w-[25px]" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="flex-1">Log out</span>
            <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </aside>

      {/* Main application area */}
      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#020918] px-4 py-3 shadow-lg md:hidden">
          <Link to="/discover" aria-label="Mumbai Afterhours home">
            <Brand />
          </Link>
          <button
            type="button"
            onClick={signOut}
            aria-label="Log out"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        {notice && (
          <div role="status" className="flex items-center justify-between gap-3 bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 text-white shadow-lg">
            <span className="font-semibold">You have a new match.</span>
            <span className="flex shrink-0 items-center gap-3">
              <Link to="/matches" onClick={dismiss} className="font-semibold underline underline-offset-4">
                See matches
              </Link>
              <button type="button" onClick={dismiss} aria-label="Dismiss notification" className="rounded-lg px-2 py-1 hover:bg-white/15">
                ✕
              </button>
            </span>
          </div>
        )}

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/[0.08] bg-[#020918]/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-12px_35px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl md:hidden"
        aria-label="Main navigation"
      >
        {links.map(item => (
          <NavLink key={item.to} to={item.to} className={mobileTabClass}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-gradient-to-r from-cyan-300 to-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />}
                <span className="relative">
                  <item.icon className="h-[21px] w-[21px]" strokeWidth={isActive ? 2.3 : 1.8} aria-hidden="true" />
                  {item.to === '/inbox' && unread > 0 && (
                    <span className="absolute -right-2 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#020918] bg-cyan-300" aria-label={`${unread} unread messages`} />
                  )}
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

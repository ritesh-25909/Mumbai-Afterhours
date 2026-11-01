
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
import {
  ChatEventsProvider,
  useMessageEvents,
} from '../../features/messaging/ChatEvents';
import { unreadTotal } from '../../features/messaging/api';

const BRAND_IMAGE = 'https://i.ibb.co/WvbHwfDp/header.png';

const base = [
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/matches', label: 'Matches', icon: Heart },
  { to: '/inbox', label: 'Messages', icon: MessageCircle },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

const settingsLink = {
  to: '/settings',
  label: 'Settings',
  icon: Settings,
};

const modLink = {
  to: '/moderation',
  label: 'Review',
  icon: ShieldCheck,
};

export function AppShell() {
  const { session } = useAuth();

  if (!session?.user?.id) return null;

  return (
    <ChatEventsProvider uid={session.user.id}>
      <ShellBody />
    </ChatEventsProvider>
  );
}

/* =====================================================
   BRAND HEADER
===================================================== */

function Brand() {
  return (
    <div
      className="
        relative w-full overflow-hidden
        rounded-[20px]
        border border-blue-300/15
        bg-gradient-to-br from-[#101f3b] via-[#09172e] to-[#050e20]
        shadow-[0_8px_24px_rgba(0,0,0,0.24)]
      "
    >
      <img
        src={BRAND_IMAGE}
        alt="Mumbai Afterhours - Real People. Real Connections."
        className="
          block h-auto w-full
          object-contain
          select-none
        "
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    </div>
  );
}

/* =====================================================
   MAIN SHELL
===================================================== */

function ShellBody() {
  const { session, signOut } = useAuth();
  const loc = useLocation();

  const [unread, setUnread] = useState(0);
  const [isMod, setIsMod] = useState(false);

  const { notice, dismiss } = useMatchNotifications(session?.user.id);

  /* Load unread messages */
  useEffect(() => {
    let active = true;

    unreadTotal()
      .then((count) => {
        if (active) setUnread(count);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [loc.pathname]);

  /* Listen for new messages */
  useMessageEvents(() => {
    window.setTimeout(() => {
      unreadTotal()
        .then(setUnread)
        .catch(() => {});
    }, 400);
  });

  /* Check moderator/admin permissions */
  useEffect(() => {
    let active = true;

    myRoles()
      .then((roles) => {
        if (active) {
          setIsMod(
            roles.includes('moderator') ||
            roles.includes('admin')
          );
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const links = isMod ? [...base, modLink] : base;
  const sidebarLinks = [...links, settingsLink];

  /* Desktop navigation styles */
  const sidebarLinkClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    [
      'group relative flex min-h-[66px] items-center gap-3.5',
      'rounded-[17px] border px-4 py-3',
      'text-[15px] font-semibold transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
      isActive
        ? [
            'border-blue-400/40',
            'bg-gradient-to-r from-[#124fc0] via-[#1045a9] to-[#173b88]',
            'text-white',
            'shadow-[0_6px_20px_rgba(0,75,220,0.20)]',
          ].join(' ')
        : [
            'border-white/[0.07]',
            'bg-gradient-to-r from-[#0c1b34]/90 to-[#09162b]/90',
            'text-slate-200',
            'hover:border-blue-400/30',
            'hover:bg-[#122442]',
            'hover:text-white',
            'hover:shadow-[0_4px_14px_rgba(0,50,140,0.12)]',
          ].join(' '),
    ].join(' ');

  /* Mobile navigation styles */
  const mobileTabClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    [
      'relative flex min-w-0 flex-1 flex-col',
      'items-center justify-center gap-1 rounded-xl',
      'px-1 py-2 text-[10px] font-semibold transition-all duration-200',
      isActive ? 'text-blue-300' : 'text-slate-400',
    ].join(' ');

  return (
    <div className="min-h-screen bg-[#f4f6fb] md:flex">

      {/* DESKTOP SIDEBAR */}

      <aside
        className="
          relative z-20 hidden w-[270px] shrink-0
          flex-col overflow-hidden
          border-r border-blue-300/[0.10]
          px-[17px] pb-5 pt-4
          text-white
          md:sticky md:top-0 md:flex md:h-screen
        "
        style={{
          background: `
            radial-gradient(
              ellipse at 15% 0%,
              rgba(30,91,190,0.18),
              transparent 44%
            ),
            radial-gradient(
              ellipse at 100% 85%,
              rgba(16,61,145,0.16),
              transparent 45%
            ),
            linear-gradient(
              180deg,
              #09172e 0%,
              #061226 52%,
              #030b1a 100%
            )
          `,
        }}
      >

        {/* BRANDING */}

        <Link
          to="/discover"
          aria-label="Mumbai Afterhours home"
          className="
            relative mb-7 block w-full
            rounded-[20px]
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-blue-400
          "
        >
          <Brand />
        </Link>

        {/* NAVIGATION */}

        <nav
          className="relative flex flex-col gap-3"
          aria-label="Main navigation"
        >
          {sidebarLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={sidebarLinkClass}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      'grid h-[44px] w-[44px] shrink-0',
                      'place-items-center rounded-full',
                      'transition-all duration-200',
                      isActive
                        ? 'border border-white/20 bg-white/10 text-white shadow-inner'
                        : 'border border-white/[0.06] bg-white/[0.045] text-slate-300 group-hover:border-blue-300/20 group-hover:bg-blue-400/10 group-hover:text-white',
                    ].join(' ')}
                  >
                    <item.icon
                      className="h-[22px] w-[22px]"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>

                  <span className="min-w-0 flex-1 truncate">
                    {item.label}
                  </span>

                  {item.to === '/inbox' && unread > 0 && (
                    <span className="rounded-full border border-blue-300/20 bg-blue-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}

                  <ChevronRight
                    className={[
                      'h-[19px] w-[19px] shrink-0',
                      'transition-transform duration-200',
                      isActive
                        ? 'text-white'
                        : 'text-slate-500 group-hover:translate-x-0.5 group-hover:text-slate-200',
                    ].join(' ')}
                    aria-hidden="true"
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* LOGOUT */}

        <div className="relative mt-auto border-t border-blue-300/[0.15] pt-5">
          <button
            type="button"
            onClick={signOut}
            className="
              group flex min-h-[64px] w-full
              items-center gap-3.5 rounded-[17px]
              border border-blue-300/20
              bg-gradient-to-r from-[#0c1b34] to-[#09162b]
              px-4 py-3
              text-left text-[15px] font-semibold
              text-slate-200
              transition-all duration-200
              hover:border-blue-400/45
              hover:bg-[#122442]
              hover:text-white
              hover:shadow-[0_5px_16px_rgba(0,50,140,0.14)]
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-blue-400
            "
          >
            <span className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full border border-white/[0.06] bg-white/[0.045]">
              <LogOut
                className="h-[22px] w-[22px]"
                strokeWidth={1.8}
              />
            </span>

            <span className="flex-1">Log out</span>

            <ChevronRight className="h-[19px] w-[19px] text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <div className="min-w-0 flex-1 pb-20 md:pb-0">

        {/* MOBILE HEADER */}

        <header
          className="
            sticky top-0 z-30
            flex items-center justify-between
            border-b border-blue-300/15
            bg-[#07152b]
            px-3 py-2.5
            shadow-lg md:hidden
          "
        >
          <Link
            to="/discover"
            aria-label="Mumbai Afterhours home"
            className="min-w-0 flex-1"
          >
            <Brand />
          </Link>

          <button
            type="button"
            onClick={signOut}
            aria-label="Log out"
            className="
              ml-3 grid h-11 w-11 shrink-0
              place-items-center rounded-xl
              border border-white/10
              bg-white/[0.05] text-slate-200
              transition hover:border-blue-400/30
              hover:bg-blue-500/10 hover:text-white
            "
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        {/* MATCH NOTIFICATION */}

        {notice && (
          <div
            role="status"
            className="
              flex items-center justify-between gap-3
              bg-gradient-to-r from-[#123c91] to-[#155bd2]
              px-4 py-3 text-white shadow-lg
            "
          >
            <span className="font-semibold">
              You have a new match.
            </span>

            <span className="flex shrink-0 items-center gap-3">
              <Link
                to="/matches"
                onClick={dismiss}
                className="font-semibold underline underline-offset-4"
              >
                See Matches
              </Link>

              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss notification"
                className="rounded-lg px-2 py-1 hover:bg-white/15"
              >
                ✕
              </button>
            </span>
          </div>
        )}

        {/* PAGE CONTENT */}

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-8">
          <Outlet />
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}

      <nav
        className="
          fixed inset-x-0 bottom-0 z-40
          flex border-t border-blue-300/[0.12]
          bg-[#040d20]/95
          px-2 pb-[env(safe-area-inset-bottom)] pt-2
          shadow-[0_-10px_30px_-18px_rgba(0,0,0,0.8)]
          backdrop-blur-xl md:hidden
        "
        aria-label="Main navigation"
      >
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={mobileTabClass}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
                )}

                <span className="relative">
                  <item.icon
                    className="h-[22px] w-[22px]"
                    strokeWidth={isActive ? 2.2 : 1.8}
                    aria-hidden="true"
                  />

                  {item.to === '/inbox' && unread > 0 && (
                    <span className="absolute -right-2 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#040d20] bg-blue-400" />
                  )}
                </span>

                <span className="max-w-full truncate">
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

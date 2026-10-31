
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Images,
  LockKeyhole,
  Flag,
  UserRoundPlus,
  ContactRound,
  MessagesSquare,
  ArrowUpRight,
} from 'lucide-react';
import { Logo } from '../components/ui/Logo';

const trust = [
  {
    icon: Images,
    title: 'Three photos, every profile',
    body: 'Each published profile has exactly three photos, so you see more than one angle before you decide.',
  },
  {
    icon: ShieldCheck,
    title: 'Selfie verification',
    body: 'Members can submit a selfie for review. A verified badge means the account passed our review, not a background check.',
  },
  {
    icon: LockKeyhole,
    title: 'You control your privacy',
    body: 'Hide your profile any time. We never show your date of birth or exact location.',
  },
  {
    icon: Flag,
    title: 'Block and report',
    body: 'Block or report anyone from a profile or a chat. Reports are private.',
  },
];

const steps = [
  {
    number: '01',
    icon: UserRoundPlus,
    title: 'Create your profile',
    body: 'Sign up and build a profile that shows who you are and what makes you unique.',
  },
  {
    number: '02',
    icon: ContactRound,
    title: 'Discover people',
    body: 'Explore profiles and find people across Mumbai who you would like to know better.',
  },
  {
    number: '03',
    icon: MessagesSquare,
    title: 'Start a conversation',
    body: 'When someone catches your interest, take the next step and start a meaningful conversation.',
  },
];

export default function LandingPage() {
  return (
    <div className="bg-white text-ink">
      <header className="bg-ink">
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"
          aria-label="Main"
        >
          <Link to="/" aria-label="Mumbai Afterhours home">
            <Logo />
          </Link>

          <div className="hidden gap-6 text-white/80 md:flex">
            <a href="#how" className="transition-colors hover:text-white">
              How it works
            </a>
            <a href="#safety" className="transition-colors hover:text-white">
              Safety
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-3 py-2 font-semibold text-white transition-colors hover:text-blue-200"
            >
              Log in
            </Link>
            <Link to="/signup" className="btn-primary">
              Join free
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section
          className="relative isolate overflow-hidden bg-ink px-5 pb-20 pt-16 md:pb-24 md:pt-24"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(7, 17, 31, 0.78) 0%, rgba(7, 17, 31, 0.64) 48%, rgba(7, 17, 31, 0.22) 100%), url("https://i.ibb.co/rfHZJ7tH/mumbai.png")',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="mx-auto max-w-6xl">
            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-white md:text-6xl">
              Meet someone beyond the ordinary.
            </h1>

            <p className="mt-5 max-w-xl text-lg text-white/90">
              Discover genuine connections with people across Mumbai. Real profiles,
              meaningful conversations, and a better way to meet.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="btn-primary">
                Join free
              </Link>
              <a href="#how" className="btn-ghost">
                Explore how it works
              </a>
            </div>

            <p className="mt-6 text-sm text-white/75">
              For adults 18 and over.
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section
          id="how"
          className="relative isolate overflow-hidden px-5 py-20 md:py-24"
        >
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white via-blue-50/50 to-white" />
          <div className="pointer-events-none absolute -right-20 top-20 -z-10 h-72 w-72 rounded-full bg-blue-200/20 blur-3xl" />

          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-blue-700 sm:text-sm">
                <span className="h-px w-7 bg-blue-600" />
                A better way to connect
              </p>

              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
                How it works
              </h2>

              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Meaningful connections start with a simple, thoughtful experience.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:mt-14 md:grid-cols-3 md:gap-6">
              {steps.map(({ number, icon: Icon, title, body }) => (
                <article
                  key={number}
                  className="group relative overflow-hidden rounded-3xl border border-blue-100/90 bg-white/90 p-6 shadow-[0_12px_35px_rgba(30,91,180,0.08)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-[0_22px_48px_rgba(30,91,180,0.15)] motion-reduce:transform-none motion-reduce:transition-none sm:p-7"
                >
                  <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-gradient-to-br from-blue-100/70 to-sky-50/20 transition-transform duration-500 group-hover:scale-125" />

                  <div className="relative flex items-start justify-between gap-4">
                    <span className="text-4xl font-extrabold leading-none tracking-tight text-blue-600 sm:text-5xl">
                      {number}
                    </span>

                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white text-blue-700 shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:rotate-2 motion-reduce:transform-none sm:h-16 sm:w-16">
                      <Icon
                        size={29}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="relative mt-8">
                    <h3 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                      {title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                      {body}
                    </p>
                  </div>

                  <div className="relative mt-6 flex items-center gap-2 text-sm font-semibold text-blue-700">
                    <span className="h-px w-7 bg-blue-300 transition-all duration-300 group-hover:w-10 group-hover:bg-blue-600" />
                    <span>Step {number}</span>
                    <ArrowUpRight
                      size={16}
                      className="ml-auto text-blue-400 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-700"
                      aria-hidden="true"
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* SAFETY AND PRIVACY */}
        <section
          id="safety"
          className="relative isolate overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-white px-5 py-20 md:py-24"
        >
          <div className="pointer-events-none absolute -right-20 top-10 -z-10 h-80 w-80 rounded-full bg-blue-200/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 -z-10 h-72 w-72 rounded-full bg-sky-200/20 blur-3xl" />

          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-blue-700 sm:text-sm">
                <span className="h-px w-7 bg-blue-600" />
                Your comfort matters
              </p>

              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
                Safety and privacy come first
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Get to know people at your own pace, with controls that help you
                manage your experience.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 md:mt-12">
              {trust.map(({ icon: Icon, title, body }, index) => (
                <article
                  key={title}
                  className="group flex gap-4 rounded-2xl border border-white/90 bg-white/85 p-5 shadow-[0_10px_30px_rgba(30,91,180,0.07)] ring-1 ring-blue-100/70 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-[0_18px_38px_rgba(30,91,180,0.12)] motion-reduce:transform-none motion-reduce:transition-none sm:gap-5 sm:p-6"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 ring-1 ring-blue-100 transition-colors duration-300 group-hover:from-blue-600 group-hover:to-blue-500 group-hover:text-white sm:h-14 sm:w-14">
                    <Icon
                      size={25}
                      strokeWidth={1.9}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <h3 className="text-base font-bold leading-6 text-slate-950 sm:text-lg">
                        {title}
                      </h3>
                      <span className="ml-auto hidden text-xs font-bold text-blue-300 sm:block">
                        0{index + 1}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                      {body}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-ink px-5 py-14 text-white md:py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">
                Your next meaningful connection could start here.
              </h2>
              <p className="mt-3 max-w-2xl text-white/75">
                Join Mumbai Afterhours and discover genuine connections across Mumbai.
              </p>
            </div>

            <Link to="/signup" className="btn-primary shrink-0">
              Join free
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-ink px-5 py-6 text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <Link to="/" aria-label="Mumbai Afterhours home">
            <Logo />
          </Link>

          <p className="text-sm">
            © {new Date().getFullYear()} Mumbai Afterhours. For adults 18 and over.
          </p>

          <div className="flex gap-4 text-sm">
            <Link to="/login" className="transition-colors hover:text-white">
              Log in
            </Link>
            <Link to="/signup" className="transition-colors hover:text-white">
              Join free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}




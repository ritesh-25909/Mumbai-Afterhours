
import { useState } from 'react';
import {
  ShieldCheck,
  LockKeyhole,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
} from 'lucide-react';

type TrustIntroductionProps = {
  onComplete: () => void;
};

const trustSteps = [
  {
    number: '01',
    label: 'AUTHENTIC CONNECTIONS',
    title: 'Verified Profiles',
    description:
      'Connect with people who have completed our identity verification process.',
    icon: UserCheck,
    highlight: 'Know who you are connecting with.',
  },
  {
    number: '02',
    label: 'YOUR COMFORT MATTERS',
    title: 'Safety Comes First',
    description:
      'Report, block and use our safety tools to make dating more comfortable.',
    icon: ShieldCheck,
    highlight: 'Your comfort. Your boundaries.',
  },
  {
    number: '03',
    label: 'YOUR INFORMATION, YOUR CONTROL',
    title: 'Your Privacy Matters',
    description:
      'Your personal information stays private and under your control.',
    icon: LockKeyhole,
    highlight: 'Connect without compromising privacy.',
  },
];

export default function TrustIntroduction({
  onComplete,
}: TrustIntroductionProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = trustSteps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === trustSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      return;
    }

    setCurrentStep((previous) => previous + 1);
  };

  const handleBack = () => {
    setCurrentStep((previous) => Math.max(0, previous - 1));
  };

  return (
    <main
      className="trust-intro relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-white px-5 py-8 text-slate-950"
      aria-label="Mumbai Afterhours trust introduction"
    >
      <style>{`
        @keyframes trustFadeUp {
          from {
            opacity: 0;
            transform: translateY(22px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes trustIconEnter {
          0% {
            opacity: 0;
            transform: scale(0.72) rotate(-8deg);
          }
          65% {
            opacity: 1;
            transform: scale(1.06) rotate(2deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0);
          }
        }

        @keyframes trustGlow {
          0%, 100% {
            opacity: .35;
            transform: scale(.92);
          }
          50% {
            opacity: .75;
            transform: scale(1.08);
          }
        }

        .trust-fade-up {
          animation: trustFadeUp .65s ease both;
        }

        .trust-icon-enter {
          animation: trustIconEnter .8s cubic-bezier(.2,.8,.2,1) both;
        }

        .trust-glow {
          animation: trustGlow 3s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .trust-fade-up,
          .trust-icon-enter,
          .trust-glow {
            animation: none !important;
          }
        }
      `}</style>

      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-sky-100/60 blur-3xl" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col">
        {/* Brand and skip */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white shadow-lg shadow-blue-200">
              <ShieldCheck size={22} />
            </div>

            <div>
              <p className="text-sm font-extrabold tracking-tight text-slate-950">
                MUMBAI AFTERHOURS
              </p>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-blue-600">
                TRUST & CONNECTION
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onComplete}
            className="rounded-full px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Skip introduction"
          >
            Skip <X size={14} className="ml-1 inline" />
          </button>
        </header>

        {/* Progress */}
        <div className="mt-12">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold tracking-[0.18em] text-blue-700">
              A PROMISE TO YOU
            </span>

            <span className="text-xs font-bold tabular-nums text-slate-400">
              {String(currentStep + 1).padStart(2, '0')} / 03
            </span>
          </div>

          <div className="flex gap-2" aria-label={`Step ${currentStep + 1} of 3`}>
            {trustSteps.map((item, index) => (
              <div
                key={item.number}
                className={`h-1.5 flex-1 overflow-hidden rounded-full transition-colors duration-500 ${
                  index <= currentStep ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Animated content */}
        <section
          key={currentStep}
          className="trust-fade-up flex flex-col items-center text-center"
          aria-live="polite"
          aria-atomic="true"
        >
          {/* Icon */}
          <div className="relative mt-12 flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64">
            <div className="trust-glow absolute inset-4 rounded-full bg-blue-200/70 blur-3xl" />

            <div className="absolute inset-5 rounded-full border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-100 shadow-inner" />

            <div className="absolute inset-10 rounded-full border border-blue-200/70" />

            <div className="trust-icon-enter relative flex h-32 w-32 items-center justify-center rounded-[2.2rem] border border-white bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-[0_25px_60px_rgba(37,99,235,0.30)] sm:h-36 sm:w-36">
              <Icon
                size={66}
                strokeWidth={1.5}
                aria-hidden="true"
              />

              <span className="absolute -right-3 -top-3 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white shadow-lg">
                <CheckCircle2 size={23} />
              </span>
            </div>
          </div>

          {/* Text */}
          <p className="mt-8 text-xs font-extrabold tracking-[0.22em] text-blue-700">
            {step.label}
          </p>

          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            {step.title}
            <span className="text-blue-700">.</span>
          </h1>

          <p className="mt-5 max-w-sm text-base leading-7 text-slate-600 sm:text-lg">
            {step.description}
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-800">
            <CheckCircle2 size={15} />
            {step.highlight}
          </div>
        </section>

        {/* Navigation */}
        <footer className="mt-12">
          <button
            type="button"
            onClick={handleNext}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-700 px-6 py-4 text-base font-bold text-white shadow-[0_12px_30px_rgba(29,78,216,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-xl active:translate-y-0"
          >
            {isLastStep ? "Let's Get Started" : 'Next'}
            <ArrowRight size={19} />
          </button>

          <div className="mt-5 flex min-h-10 items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-500 transition hover:text-blue-700 disabled:invisible"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <span className="text-xs font-medium text-slate-400">
              Built for genuine connections in Mumbai.
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

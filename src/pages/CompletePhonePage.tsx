
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { saveMyMobileNumber } from '../features/profiles/contact';

export default function CompletePhonePage() {
  const [number, setNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const digits = number.replace(/\D/g, '');

    // Validate Indian mobile number
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setBusy(true);

    try {
      // Save the mobile number using existing Supabase logic.
      // No OTP or SMS verification is performed.
      await saveMyMobileNumber(`+91${digits}`);

      // Continue to Discover after successful saving.
      navigate('/discover', { replace: true });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Unable to save your mobile number. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7fc] px-4 py-10">
      <div className="w-full max-w-md">

        {/* Brand Logo */}
        <div className="mb-7 text-center">
          <Logo />
        </div>

        <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-[0_18px_55px_rgba(16,33,62,.09)] sm:p-8">

          {/* Phone Icon */}
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-[#174fc5]">
            <Phone size={25} />
          </span>

          {/* Heading */}
          <h1 className="mt-5 text-center text-2xl font-extrabold text-[#10213e]">
            Add your mobile number
          </h1>

          <p className="mt-2 text-center text-sm leading-6 text-slate-500">
            Complete your profile by providing your correct mobile number.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">

            {/* Mobile Number Label */}
            <label
              htmlFor="mobile-number"
              className="block text-sm font-semibold text-slate-700"
            >
              Mobile number
            </label>

            {/* Country Code + Input */}
            <div className="flex overflow-hidden rounded-xl border border-slate-200 transition focus-within:border-[#246BFD] focus-within:ring-2 focus-within:ring-blue-100">

              <span className="flex items-center border-r border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600">
                +91
              </span>

              <input
                id="mobile-number"
                type="tel"
                name="mobile"
                autoComplete="tel-national"
                inputMode="numeric"
                maxLength={10}
                value={number}
                onChange={(event) => {
                  setNumber(
                    event.target.value.replace(/\D/g, '').slice(0, 10)
                  );
                  setError('');
                }}
                placeholder="Enter 10-digit mobile number"
                className="min-w-0 flex-1 px-4 py-3 text-sm text-slate-800 outline-none"
                required
                disabled={busy}
              />
            </div>

            {/* Profile Authenticity Message */}
            <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">
              <ShieldCheck
                size={17}
                className="mt-0.5 shrink-0 text-[#174fc5]"
              />

              <span>
                Please provide your correct contact number. This helps
                maintain genuine profiles and makes your account more
                trustworthy. Your number will be saved to your account.
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700"
              >
                {error}
              </p>
            )}

            {/* Continue Button */}
            <button
              type="submit"
              disabled={busy || number.length !== 10}
              className="w-full rounded-xl bg-[#174fc5] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:bg-[#123f9f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Saving your number...' : 'Continue'}
            </button>

            <p className="text-center text-xs text-slate-400">
              Your contact number is collected for profile authenticity.
            </p>

          </form>
        </section>
      </div>
    </main>
  );
}

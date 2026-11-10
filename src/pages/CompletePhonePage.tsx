
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { saveMyMobileNumber } from '../features/profiles/contact';
import { supabase } from '../lib/supabase';

export default function CompletePhonePage() {
  const [number, setNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const phone = `+91${number}`;

  async function sendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!/^[6-9]\d{9}$/.test(number)) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ phone });

      if (error) throw error;

      setOtpSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send OTP.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the valid 6-digit OTP.');
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'phone_change',
      });

      if (error) throw error;

      await saveMyMobileNumber(phone);
      navigate('/discover', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OTP verification failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7fc] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center"><Logo /></div>

        <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-[0_18px_55px_rgba(16,33,62,.09)] sm:p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-[#174fc5]">
            {otpSent ? <ShieldCheck size={25} /> : <Phone size={25} />}
          </span>

          <h1 className="mt-5 text-center text-2xl font-extrabold text-[#10213e]">
            {otpSent ? 'Verify your mobile number' : 'Add your mobile number'}
          </h1>

          <p className="mt-2 text-center text-sm leading-6 text-slate-500">
            {otpSent
              ? `Enter the verification code sent to ${phone}.`
              : 'Enter your correct mobile number. We will send you a one-time password (OTP).'}
          </p>

          {!otpSent ? (
            <form onSubmit={sendOtp} className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Mobile number
              </label>

              <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-[#246BFD] focus-within:ring-2 focus-within:ring-blue-100">
                <span className="flex items-center border-r border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600">
                  +91
                </span>
                <input
                  autoComplete="tel-national"
                  inputMode="numeric"
                  maxLength={10}
                  value={number}
                  onChange={e => setNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="min-w-0 flex-1 px-4 py-3 text-sm outline-none"
                  required
                />
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                <span>We will send an OTP to verify that this mobile number belongs to you.</span>
              </div>

              {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

              <button
                type="submit"
                disabled={busy || number.length !== 10}
                className="w-full rounded-xl bg-[#174fc5] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? 'Sending OTP…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Enter 6-digit OTP
              </label>

              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter OTP"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-xl tracking-[0.5em] outline-none focus:border-[#246BFD]"
                required
              />

              {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

              <button
                type="submit"
                disabled={busy || otp.length !== 6}
                className="w-full rounded-xl bg-[#174fc5] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? 'Verifying…' : 'Verify OTP'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                  setError('');
                }}
                className="w-full py-2 text-sm font-semibold text-[#174fc5]"
              >
                Change mobile number
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

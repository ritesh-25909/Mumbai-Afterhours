import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

import { useMyProfile } from '../features/profiles/useMyProfile';
import {
  getLatestRequest,
  submitSelfies,
  REASONS,
  type SelfieAngle,
  type SelfieFiles,
  type VRequest,
} from '../features/verification/api';

type Phase = 'idle' | 'camera' | 'captured' | 'submitting';

const ANGLES: {
  key: SelfieAngle;
  title: string;
  instruction: string;
}[] = [
  {
    key: 'front',
    title: 'Front-facing selfie',
    instruction: 'Look directly at the camera. Keep your face clearly visible.',
  },
  {
    key: 'left',
    title: 'Left-angle selfie',
    instruction: 'Turn your face slightly towards your left. Keep both eyes visible.',
  },
  {
    key: 'right',
    title: 'Right-angle selfie',
    instruction: 'Turn your face slightly towards your right. Keep both eyes visible.',
  },
];

export default function SelfieVerificationPage() {
  const { uid, profile, reload } = useMyProfile();

  const [req, setReq] = useState<VRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [files, setFiles] = useState<Partial<SelfieFiles>>({});
  const [previews, setPreviews] = useState<
    Partial<Record<SelfieAngle, string>>
  >({});

  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  const currentAngle = ANGLES[currentIndex];

  const stopCamera = useCallback(() => {
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;

    if (video.current) {
      video.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (!uid) return;

    let active = true;

    setLoading(true);

    getLatestRequest(uid)
      .then(result => {
        if (active) setReq(result);
      })
      .catch(error => {
        if (active) setErr(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [uid, done]);

  useEffect(() => {
    return () => {
      Object.values(previews).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });

      if (capturedPreview) {
        URL.revokeObjectURL(capturedPreview);
      }
    };
  }, [previews, capturedPreview]);

  async function startCamera() {
    setErr(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setErr(
        'This browser cannot access a camera. Please use a supported browser.',
      );
      return;
    }

    try {
      stopCamera();

      const cameraStream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        });

      stream.current = cameraStream;
      setPhase('camera');

      requestAnimationFrame(() => {
        if (video.current && stream.current) {
          video.current.srcObject = stream.current;
          video.current.play().catch(() => {
            setErr('Could not start the camera preview. Please retry.');
          });
        }
      });
    } catch (error) {
      const name = (error as DOMException).name;

      setErr(
        name === 'NotAllowedError'
          ? 'Camera permission was blocked. Allow camera access in your browser settings.'
          : name === 'NotFoundError'
            ? 'No camera was found on this device.'
            : 'The camera could not be started. Close other apps using it and retry.',
      );
    }
  }

  async function capture() {
    const videoElement = video.current;

    if (!videoElement || !videoElement.videoWidth) {
      setErr('Camera is not ready. Please wait and try again.');
      return;
    }

    const scale = Math.min(
      1,
      1024 /
        Math.max(
          videoElement.videoWidth,
          videoElement.videoHeight,
        ),
    );

    const canvas = document.createElement('canvas');

    canvas.width = Math.round(videoElement.videoWidth * scale);
    canvas.height = Math.round(videoElement.videoHeight * scale);

    const context = canvas.getContext('2d');

    if (!context) {
      setErr('Could not prepare the captured image. Please retry.');
      return;
    }

    context.drawImage(
      videoElement,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.88);
    });

    if (!blob) {
      setErr('Could not capture the image. Please try again.');
      return;
    }

    stopCamera();

    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }

    setCapturedBlob(blob);
    setCapturedPreview(URL.createObjectURL(blob));
    setPhase('captured');
    setErr(null);
  }

  function retakeCurrent() {
    setCapturedBlob(null);

    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }

    setCapturedPreview(null);
    void startCamera();
  }

  function useCapturedPhoto() {
    if (!capturedBlob || !capturedPreview) return;

    const angle = currentAngle.key;

    setFiles(previous => ({
      ...previous,
      [angle]: capturedBlob,
    }));

    setPreviews(previous => ({
      ...previous,
      [angle]: capturedPreview,
    }));

    setCapturedBlob(null);
    setCapturedPreview(null);
    setErr(null);

    if (currentIndex < ANGLES.length - 1) {
      setCurrentIndex(index => index + 1);
      setPhase('idle');
    } else {
      setPhase('idle');
    }
  }

  function editAngle(index: number) {
    setCurrentIndex(index);
    setCapturedBlob(null);

    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }

    setCapturedPreview(null);
    setPhase('idle');
    setErr(null);
  }

  const allCaptured = ANGLES.every(angle => !!files[angle.key]);

  async function submit() {
    if (!uid || !allCaptured) {
      setErr('Please capture all three selfie angles first.');
      return;
    }

    if (!consent) {
      setErr('Please provide consent before submitting.');
      return;
    }

    const completeFiles: SelfieFiles = {
      front: files.front!,
      left: files.left!,
      right: files.right!,
    };

    setErr(null);
    setPhase('submitting');

    try {
      await submitSelfies(uid, completeFiles);

      setDone(true);
      setFiles({});
      setPreviews({});
      await reload();
    } catch (error) {
      setErr(
        error instanceof Error
          ? error.message
          : 'Could not submit your verification.',
      );
      setPhase('idle');
    }
  }

  if (loading || !profile) {
    return (
      <p className="p-8 text-slate2" role="status">
        Loading verification…
      </p>
    );
  }

  const pending = req?.status === 'pending';
  const alreadyVerified = profile.verified;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-royal">
          <ShieldCheck className="h-6 w-6" />
          <span className="text-sm font-bold uppercase tracking-wider">
            Mumbai Afterhours Verification
          </span>
        </div>

        <h1 className="text-2xl font-extrabold">
          Verify your profile
        </h1>

        <p className="text-sm leading-6 text-slate2">
          Capture three selfies from different angles. Our moderation
          team will review them before unlocking your account.
        </p>
      </header>

      {alreadyVerified && (
        <section className="card flex items-center gap-3 p-5" role="status">
          <BadgeCheck className="h-8 w-8 shrink-0 text-royal" />
          <div>
            <h2 className="font-bold">Your profile is verified</h2>
            <p className="text-sm text-slate2">
              You have completed selfie verification.
            </p>
          </div>
        </section>
      )}

      {!alreadyVerified && pending && (
        <section className="card space-y-2 p-5" role="status">
          <h2 className="font-bold">Verification under review</h2>
          <p className="text-sm leading-6 text-slate2">
            All three selfies have been submitted. Your account will
            remain locked until a moderator approves your verification.
          </p>
        </section>
      )}

      {!alreadyVerified &&
        req &&
        (req.status === 'rejected' || req.status === 'retry') && (
          <section className="card border-warn space-y-2 p-5" role="status">
            <h2 className="font-bold">
              {req.status === 'retry'
                ? 'Please submit new selfies'
                : 'Verification not approved'}
            </h2>
            <p className="text-sm leading-6 text-slate2">
              {REASONS[req.rejection_reason_code ?? 'other'] ??
                REASONS.other}
              {' '}Please capture all three angles again.
            </p>
          </section>
        )}

      {!alreadyVerified && !pending && !done && (
        <>
          <section className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Your three required selfies</h2>
              <span className="text-sm font-semibold text-royal">
                {ANGLES.filter(a => files[a.key]).length}/3 complete
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {ANGLES.map((angle, index) => (
                <button
                  key={angle.key}
                  type="button"
                  onClick={() => editAngle(index)}
                  disabled={phase === 'submitting'}
                  className={`overflow-hidden rounded-xl border p-2 text-left ${
                    currentIndex === index
                      ? 'border-royal bg-blue-50'
                      : 'border-line bg-white'
                  }`}
                >
                  {previews[angle.key] ? (
                    <img
                      src={previews[angle.key]}
                      alt={`${angle.title} preview`}
                      className="aspect-[3/4] w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[3/4] place-items-center rounded-lg bg-ink text-slate2">
                      <Camera className="h-7 w-7" />
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-1">
                    {files[angle.key] ? (
                      <CheckCircle2 className="h-4 w-4 text-ok" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-slate2" />
                    )}
                    <span className="text-xs font-semibold">
                      {angle.key === 'front'
                        ? 'Front'
                        : angle.key === 'left'
                          ? 'Left'
                          : 'Right'}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-xl bg-ink p-4">
              <p className="text-sm font-bold">
                {currentAngle.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate2">
                {currentAngle.instruction}
              </p>
            </div>

            {phase === 'idle' && (
              <button
                type="button"
                className="btn-primary w-full"
                disabled={!consent}
                onClick={() => void startCamera()}
              >
                <Camera className="h-5 w-5" />
                {files[currentAngle.key]
                  ? 'Retake this selfie'
                  : 'Open camera'}
              </button>
            )}

            {phase === 'camera' && (
              <div className="space-y-3">
                <video
                  ref={video}
                  playsInline
                  muted
                  className="aspect-[3/4] w-full -scale-x-100 rounded-card bg-ink object-cover"
                  aria-label="Live selfie camera preview"
                />

                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={() => void capture()}
                >
                  <Camera className="h-5 w-5" />
                  Capture {currentAngle.key} selfie
                </button>
              </div>
            )}

            {phase === 'captured' && capturedPreview && (
              <div className="space-y-3">
                <img
                  src={capturedPreview}
                  alt="Captured selfie preview"
                  className="aspect-[3/4] w-full -scale-x-100 rounded-card object-cover"
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    className="btn-outline flex-1"
                    onClick={retakeCurrent}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Retake
                  </button>

                  <button
                    type="button"
                    className="btn-primary flex-1"
                    onClick={useCapturedPhoto}
                  >
                    Use this photo
                  </button>
                </div>
              </div>
            )}

            {phase === 'idle' && allCaptured && (
              <div className="space-y-3 border-t border-line pt-4">
                <label className="flex items-start gap-2 text-sm leading-6">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={consent}
                    onChange={event => setConsent(event.target.checked)}
                    disabled={phase === 'submitting'}
                  />
                  <span>
                    I consent to Mumbai Afterhours processing my three
                    selfies for manual verification against my profile
                    photos. I understand that the images are private and
                    accessible to authorized moderators for review.
                  </span>
                </label>

                <button
                  type="button"
                  className="btn-primary w-full"
                  disabled={!consent}
                  onClick={() => void submit()}
                >
                  Submit all three selfies
                </button>
              </div>
            )}

            {phase === 'submitting' && (
              <p className="text-center text-sm text-slate2" role="status">
                Uploading your three selfies securely…
              </p>
            )}

            {err && (
              <p role="alert" className="text-sm text-bad">
                {err}
              </p>
            )}
          </section>

          <section className="card space-y-2 p-5">
            <h2 className="font-bold">Your privacy matters</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate2">
              <li>Selfies must be captured using your device camera.</li>
              <li>All three angles are required before submission.</li>
              <li>Selfies are stored in private Supabase storage.</li>
              <li>Only authorized moderators and admins can review them.</li>
              <li>Submitted selfies are deleted after a review decision is recorded, subject to successful storage deletion.</li>
              <li>This is a manual visual review, not automated identity or liveness verification.</li>
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

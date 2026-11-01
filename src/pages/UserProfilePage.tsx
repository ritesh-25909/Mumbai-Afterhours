
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  GraduationCap,
  Briefcase,
  Heart,
  Languages,
  Ruler,
  MessageCircle
} from 'lucide-react';
import {
  fetchMatchedProfile,
  type MatchedProfile
} from '../features/discovery/api';

type PromptItem = {
  question: string;
  answer: string;
};

function parsePrompts(data: unknown): PromptItem[] {
  if (!data) return [];

  let source = data;

  // Handle profile_prompts stored as a JSON string.
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      return [];
    }
  }

  if (!source || typeof source !== 'object') return [];

  const entries = Array.isArray(source)
    ? source.map((item, index) => [String(index), item] as const)
    : Object.entries(source);

  return entries
    .map(([key, value]) => {
      let item: any = value;

      // Some prompt values are themselves JSON strings.
      if (typeof item === 'string') {
        try {
          const parsed = JSON.parse(item);
          if (parsed && typeof parsed === 'object') {
            item = parsed;
          } else {
            return { question: key, answer: item };
          }
        } catch {
          return { question: key, answer: item };
        }
      }

      if (!item || typeof item !== 'object') return null;

      const question =
        item.prompt ??
        item.question ??
        item.title ??
        '';

      const answer =
        item.answer ??
        item.response ??
        item.value ??
        '';

      if (typeof answer !== 'string' || !answer.trim()) return null;

      return {
        question: typeof question === 'string' ? question : '',
        answer: answer.trim()
      };
    })
    .filter((item): item is PromptItem => item !== null && !!item.answer);
}

function calculateAge(dateOfBirth: string) {
  const dob = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();

  const birthdayNotReached =
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() &&
      today.getDate() < dob.getDate());

  if (birthdayNotReached) age--;

  return age;
}

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<MatchedProfile | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!userId) {
        setError('Invalid profile.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await fetchMatchedProfile(userId);

        if (!cancelled) {
          setProfile(result);
          setPhotoIndex(0);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return <p className="p-6 text-center text-slate2">Loading profile…</p>;
  }

  if (error || !profile) {
    return (
      <div className="card mx-auto mt-8 max-w-md p-8 text-center">
        <h2 className="font-extrabold">Profile unavailable</h2>
        <p className="mt-2 text-sm text-slate2">
          {error ?? 'This profile cannot be viewed.'}
        </p>
        <button
          className="btn-primary mt-4"
          onClick={() => navigate(-1)}
        >
          Go back
        </button>
      </div>
    );
  }

  const photos = profile.photos ?? [];
  const currentPhoto = photos[photoIndex];
  const age = calculateAge(profile.date_of_birth);
  const prompts = parsePrompts(profile.profile_prompts);

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">

      {/* HEADER */}
      <header className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 hover:bg-mist"
          aria-label="Go back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-extrabold">Profile</h1>
      </header>

      {/* PHOTO GALLERY */}
      <section className="card overflow-hidden">
        <div className="relative aspect-[4/5] bg-mist">
          {currentPhoto && (
            <img
              src={currentPhoto.photoUrl}
              alt={`${profile.display_name} profile`}
              className="h-full w-full object-cover"
            />
          )}

          {photos.length > 1 && (
            <>
              <button
                className="absolute inset-y-0 left-0 w-1/2"
                aria-label="Previous photo"
                onClick={() => setPhotoIndex(i => Math.max(0, i - 1))}
              />
              <button
                className="absolute inset-y-0 right-0 w-1/2"
                aria-label="Next photo"
                onClick={() => setPhotoIndex(i => Math.min(photos.length - 1, i + 1))}
              />
              <div className="absolute left-3 right-3 top-3 flex gap-1">
                {photos.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${
                      i === photoIndex ? 'bg-white' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {photos.length > 0 && (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
              {photoIndex + 1} / {photos.length}
            </span>
          )}
        </div>

        <div className="space-y-2 p-4">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold">
            {profile.display_name}, {age}
            {profile.verified && (
              <BadgeCheck className="h-6 w-6 text-royal" />
            )}
          </h2>

          {(profile.city || profile.neighbourhood) && (
            <p className="flex items-center gap-2 text-sm text-slate2">
              <MapPin className="h-4 w-4" />
              {[profile.neighbourhood, profile.city]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>
      </section>

      {/* ABOUT */}
      {profile.bio && (
        <section className="card space-y-2 p-4">
          <h3 className="font-extrabold">About Me</h3>
          <p className="whitespace-pre-wrap leading-relaxed text-slate2">
            {profile.bio}
          </p>
        </section>
      )}

      {/* INTERESTS */}
      {profile.interests?.length > 0 && (
        <section className="card space-y-3 p-4">
          <h3 className="flex items-center gap-2 font-extrabold">
            <Heart className="h-5 w-5 text-royal" />
            Interests
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map(item => (
              <span
                key={item}
                className="rounded-full bg-mist px-3 py-2 text-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* DETAILS */}
      <section className="card space-y-4 p-4">
        <h3 className="font-extrabold">More about me</h3>

        {profile.occupation && (
          <p className="flex items-center gap-3 text-sm">
            <Briefcase className="h-5 w-5 text-royal" />
            {profile.occupation}
          </p>
        )}

        {profile.college && (
          <p className="flex items-center gap-3 text-sm">
            <GraduationCap className="h-5 w-5 text-royal" />
            {profile.college}
          </p>
        )}

        {profile.education_status && (
          <p className="text-sm text-slate2">
            Education: {profile.education_status}
          </p>
        )}

        {profile.height && (
          <p className="flex items-center gap-3 text-sm">
            <Ruler className="h-5 w-5 text-royal" />
            {profile.height}
          </p>
        )}

        {profile.languages?.length > 0 && (
          <p className="flex items-center gap-3 text-sm">
            <Languages className="h-5 w-5 text-royal" />
            {profile.languages.join(', ')}
          </p>
        )}

        {profile.relationship_intention && (
          <p className="text-sm text-slate2">
            Looking for: {profile.relationship_intention}
          </p>
        )}
      </section>

      {/* PREMIUM PROFILE PROMPTS */}
      {prompts.length > 0 && (
        <section className="space-y-3">
          <h3 className="px-1 text-lg font-extrabold">A little more about me</h3>

          {prompts.map((item, index) => (
            <article
              key={`${item.question}-${index}`}
              className="card space-y-3 overflow-hidden p-5"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-royal" />
                <span className="text-xs font-bold uppercase tracking-wider text-royal">
                  Get to know me
                </span>
              </div>

              {item.question && (
                <h4 className="text-lg font-extrabold leading-snug">
                  {item.question}
                </h4>
              )}

              <p className="text-base leading-relaxed text-slate2">
                {item.answer}
              </p>
            </article>
          ))}
        </section>
      )}

      {/* PHOTO PROMPTS */}
      {photos.some(p => p.prompt) && (
        <section className="card space-y-3 p-4">
          <h3 className="font-extrabold">Photo captions</h3>
          {photos.filter(p => p.prompt).map((p, i) => (
            <p key={i} className="text-sm text-slate2">
              {p.prompt}
            </p>
          ))}
        </section>
      )}

      {/* BACK TO CHAT */}
      <button
        onClick={() => navigate(-1)}
        className="btn-outline block w-full text-center"
      >
        Back to messages
      </button>

    </div>
  );
}

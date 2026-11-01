import { useMemo, useState } from 'react';
import { searchLocations } from '../../data/mumbaiLocations';
import { GENDERS, INTENTIONS } from '../../lib/constants';

export type ProfilePromptAnswer = { prompt: string; answer: string };

export type BasicsState = {
  display_name: string;
  date_of_birth: string;
  gender: string;
  interested_in: string[];
  neighbourhood: string;
  bio: string;
  languages: string;
  interests: string;
  relationship_intention: string;
  // New optional profile fields. Parent state and save/API logic must persist these.
  height?: string;
  occupation?: string;
  college?: string;
  education_status?: string;
  profile_prompts?: string;
  smoking?: string;
  alcohol?: string;
  religion?: string;
};

/**
 * Required onboarding fields added to the Basics form.
 * Call this from the parent onboarding step before allowing the user to continue.
 */
export function validateRequiredBasicsFields(v: BasicsState): string | null {
  if (!v.neighbourhood?.trim()) return 'Please enter your neighbourhood.';
  if (!v.height?.trim()) return 'Please select your height.';
  if (!v.occupation?.trim()) return 'Please enter your occupation.';
  if (!v.college?.trim()) return 'Please enter your college or university.';
  if (!v.education_status?.trim()) return 'Please select your education status.';
  return null;
}

const PROMPT_CATEGORIES: { name: string; prompts: string[] }[] = [
  { name: '💘 Dating', prompts: [
    'Dating me is like…',
    'The quickest way to my heart is…',
    'Together, we could…',
    "I'll fall for you if…",
    'My ideal first date is…',
    'We will get along if…',
    'You should message me if…',
    'A green flag I look for is…',
    'My love language is…',
  ]},
  { name: '😈 Flirty & fun', prompts: [
    'My most irrational ick is…',
    'The most attractive thing someone can do is…',
    'Flirt with me by…',
    'A bold first-date idea would be…',
    'The way to impress me is…',
    'My most controversial opinion is…',
    'Two truths and a lie…',
    'My friends would describe me as…',
    'The most spontaneous thing I have done is…',
  ]},
  { name: '🌃 Mumbai', prompts: [
    'My perfect Mumbai date starts at…',
    'The best place in Mumbai for a late-night conversation is…',
    'Vada pav or fancy dinner? I choose…',
    'Take me to…',
    'My most Mumbai-coded habit is…',
    'My favourite escape from Mumbai is…',
  ]},
  { name: '🧠 Deep & unfiltered', prompts: [
    'A lesson I learned the hard way is…',
    'Something I will never compromise on is…',
    'I feel most like myself when…',
    'One thing I want to experience with someone is…',
    'A small thing that makes my day is…',
    'I know a connection is real when…',
  ]},
];

const INTEREST_OPTIONS = [
  'Music', 'Travel', 'Food', 'Fitness', 'Movies', 'Photography',
  'Gaming', 'Coffee', 'Reading', 'Art', 'Cooking', 'Nature',
  'Dancing', 'Sports', 'Technology', 'Fashion', 'Pets', 'Road trips',
];

const MIN_PROMPTS = 2;
const MAX_PROMPTS = 5;

function normalise(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function parsePromptAnswers(value?: string): ProfilePromptAnswer[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ProfilePromptAnswer =>
        item && typeof item.prompt === 'string' && typeof item.answer === 'string',
    );
  } catch {
    return [];
  }
}

function parseCsv(value: string) {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

export function BasicsForm({
  v,
  set,
  lockDob,
}: {
  v: BasicsState;
  set: (p: Partial<BasicsState>) => void;
  lockDob?: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState(PROMPT_CATEGORIES[0].name);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  // Keep typed text separate from the confirmed neighbourhood value.
  const [locationQuery, setLocationQuery] = useState(v.neighbourhood ?? '');
  const [locationSelected, setLocationSelected] = useState(Boolean(v.neighbourhood?.trim()));
  const [showOtherLocation, setShowOtherLocation] = useState(false);
  const [otherLocation, setOtherLocation] = useState('');

  const promptAnswers = useMemo(() => parsePromptAnswers(v.profile_prompts), [v.profile_prompts]);
  const selectedInterests = parseCsv(v.interests);
  const allPrompts = PROMPT_CATEGORIES.flatMap(category =>
    category.prompts.map(prompt => ({ category: category.name, prompt })),
  );
  const visiblePrompts = allPrompts.filter(item => {
    const categoryMatches = showAll || search.trim() || item.category === activeCategory;
    const searchMatches = !search.trim() ||
      item.prompt.toLowerCase().includes(search.trim().toLowerCase()) ||
      item.category.toLowerCase().includes(search.trim().toLowerCase());
    return Boolean(categoryMatches) && searchMatches;
  });

  function savePromptAnswers(next: ProfilePromptAnswer[]) {
    set({ profile_prompts: JSON.stringify(next) });
  }

  function addPrompt(prompt: string) {
    if (promptAnswers.length >= MAX_PROMPTS) return;
    if (promptAnswers.some(item => item.prompt === prompt)) return;
    savePromptAnswers([...promptAnswers, { prompt, answer: '' }]);
  }

  function updateAnswer(prompt: string, answer: string) {
    savePromptAnswers(promptAnswers.map(item =>
      item.prompt === prompt ? { ...item, answer } : item,
    ));
  }

  function removePrompt(prompt: string) {
    savePromptAnswers(promptAnswers.filter(item => item.prompt !== prompt));
  }

  function addCustomPrompt() {
    const prompt = customPrompt.trim();
    if (!prompt || promptAnswers.length >= MAX_PROMPTS ||
      promptAnswers.some(item => normalise(item.prompt) === normalise(prompt))) return;
    addPrompt(prompt);
    setCustomPrompt('');
  }

  function toggleInterest(interest: string) {
    const exists = selectedInterests.some(item => normalise(item) === normalise(interest));
    const next = exists
      ? selectedInterests.filter(item => normalise(item) !== normalise(interest))
      : [...selectedInterests, interest];
    set({ interests: next.join(', ') });
  }

  const completedPromptCount = promptAnswers.filter(
    item => item.prompt.trim() && item.answer.trim(),
  ).length;

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="mb-1 block font-semibold">Display name</span>
        <input className="field" value={v.display_name} maxLength={40}
          onChange={e => set({ display_name: e.target.value })} />
      </label>

      <label className="block">
        <span className="mb-1 block font-semibold">Date of birth</span>
        <input className="field" type="date" value={v.date_of_birth}
          disabled={lockDob} onChange={e => set({ date_of_birth: e.target.value })} />
        <span className="mt-1 block text-sm text-slate2">
          {lockDob ? 'Date of birth cannot be changed.' : 'Only your age is shown to others. This cannot be changed later.'}
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block font-semibold">I am</span>
        <select className="field" value={v.gender}
          onChange={e => set({ gender: e.target.value })}>
          <option value="">Choose…</option>
          {GENDERS.map(gender => <option key={gender} value={gender}>{gender}</option>)}
        </select>
      </label>

      <fieldset>
        <legend className="mb-2 font-semibold">Interested in meeting</legend>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map(gender => {
            const selected = v.interested_in.includes(gender);
            return <label key={gender} className={`cursor-pointer rounded-full border px-4 py-2 ${selected ? 'border-royal bg-royal text-white' : 'border-line bg-white'}`}>
              <input type="checkbox" className="sr-only" checked={selected}
                onChange={() => set({ interested_in: selected ? v.interested_in.filter(item => item !== gender) : [...v.interested_in, gender] })} />
              {gender}
            </label>;
          })}
        </div>
      </fieldset>

      <div className="relative">
        <label className="block">
          <span className="mb-1 block font-semibold">🎈 Neighbourhood <span className="text-rose-600">*</span></span>
          <input
            className="field"
            placeholder="Start typing, e.g. band, dahi, andh…"
            value={locationQuery}
            required
            aria-required="true"
            aria-autocomplete="list"
            aria-expanded={Boolean(locationQuery.trim()) && !locationSelected && !showOtherLocation}
            onChange={e => {
              const next = e.target.value;
              setLocationQuery(next);
              setLocationSelected(false);
              setShowOtherLocation(false);
              setOtherLocation('');
              // Do not let unconfirmed search text be saved as the profile location.
              set({ neighbourhood: '' });
            }}
          />
        </label>

        {locationQuery.trim() && !locationSelected && !showOtherLocation && (
          <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-xl" role="listbox" aria-label="Location suggestions">
            {searchLocations(locationQuery).map(location => (
              <button
                key={location}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  setLocationQuery(location);
                  setLocationSelected(true);
                  setShowOtherLocation(false);
                  set({ neighbourhood: location });
                }}
                className="flex w-full items-center rounded-lg px-3 py-3 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
              >
                <span className="mr-2 text-slate2" aria-hidden="true">📍</span>
                {location}
              </button>
            ))}
            {searchLocations(locationQuery).length === 0 && (
              <p className="px-3 py-2 text-sm text-slate2">No matching locations found.</p>
            )}
            <button
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => {
                setShowOtherLocation(true);
                setOtherLocation(locationQuery.trim());
              }}
              className="flex w-full items-center rounded-lg border-t border-line px-3 py-3 text-left text-sm font-semibold text-royal hover:bg-blue-50"
            >
              + Other — enter a different location
            </button>
          </div>
        )}

        {showOtherLocation && (
          <div className="mt-2 space-y-2 rounded-xl border border-line bg-white p-3">
            <label className="block text-sm font-medium" htmlFor="other-neighbourhood">Enter your location</label>
            <input
              id="other-neighbourhood"
              className="field"
              placeholder="Enter area / neighbourhood"
              value={otherLocation}
              maxLength={100}
              onChange={e => setOtherLocation(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!otherLocation.trim()}
                onClick={() => {
                  const confirmed = otherLocation.trim().replace(/\s+/g, ' ');
                  setLocationQuery(confirmed);
                  setLocationSelected(true);
                  setShowOtherLocation(false);
                  set({ neighbourhood: confirmed });
                }}
                className="rounded-xl bg-royal px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm location
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOtherLocation(false);
                  setOtherLocation('');
                }}
                className="rounded-xl border border-line px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {locationSelected && v.neighbourhood.trim() && (
          <p className="mt-1 text-sm text-emerald-700" role="status">✓ Selected: {v.neighbourhood}</p>
        )}
        {!v.neighbourhood.trim() && (
          <p className="mt-1 text-xs text-slate2">Choose a dropdown suggestion or confirm an Other location to continue.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-2 font-semibold">Smoking</legend>
          <div className="flex flex-wrap gap-2">
            {['Smoker', 'Non-smoker', 'Sometimes'].map(option => {
              const selected = (v.smoking ?? '') === option;
              return (
                <button key={option} type="button" aria-pressed={selected}
                  onClick={() => set({ smoking: selected ? '' : option })}
                  className={`rounded-full border px-3 py-2 text-sm transition ${selected ? 'border-royal bg-royal text-white' : 'border-line bg-white text-slate-700 hover:border-royal'}`}>
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-semibold">Alcohol</legend>
          <div className="flex flex-wrap gap-2">
            {['Alcohol', 'Non-alcohol', 'Sometimes'].map(option => {
              const selected = (v.alcohol ?? '') === option;
              return (
                <button key={option} type="button" aria-pressed={selected}
                  onClick={() => set({ alcohol: selected ? '' : option })}
                  className={`rounded-full border px-3 py-2 text-sm transition ${selected ? 'border-royal bg-royal text-white' : 'border-line bg-white text-slate-700 hover:border-royal'}`}>
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <fieldset>
        <legend className="mb-2 font-semibold">Religion</legend>
        <div className="flex flex-wrap gap-2">
          {['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Atheist', 'Other'].map(option => {
            const selected = (v.religion ?? '') === option;
            return (
              <button key={option} type="button" aria-pressed={selected}
                onClick={() => set({ religion: selected ? '' : option })}
                className={`rounded-full border px-3 py-2 text-sm transition ${selected ? 'border-royal bg-royal text-white' : 'border-line bg-white text-slate-700 hover:border-royal'}`}>
                {option}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-semibold">Height <span className="text-rose-600">*</span></span>
          <select
            className="field"
            value={v.height ?? ''}
            required
            aria-required="true"
            onChange={e => set({ height: e.target.value })}
          >
            <option value="">Choose your height…</option>
            {Array.from({ length: 27 }, (_, index) => {
              const totalInches = 54 + index;
              const feet = Math.floor(totalInches / 12);
              const inches = totalInches % 12;
              const label = `${feet}'${inches}"`;
              return <option key={label} value={label}>{label}</option>;
            })}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block font-semibold">Occupation <span className="text-rose-600">*</span></span>
          <input
            className="field"
            value={v.occupation ?? ''}
            maxLength={80}
            placeholder="e.g. Student, Designer, Engineer"
            required
            aria-required="true"
            onChange={e => set({ occupation: e.target.value })}
          />
        </label>

        <label className="block">
          <span className="mb-1 block font-semibold">College / University <span className="text-rose-600">*</span></span>
          <input
            className="field"
            value={v.college ?? ''}
            maxLength={120}
            placeholder="Enter your college or university"
            required
            aria-required="true"
            onChange={e => set({ college: e.target.value })}
          />
        </label>

        <label className="block">
          <span className="mb-1 block font-semibold">Education status <span className="text-rose-600">*</span></span>
          <select
            className="field"
            value={v.education_status ?? ''}
            required
            aria-required="true"
            onChange={e => set({ education_status: e.target.value })}
          >
            <option value="">Choose education status…</option>
            <option value="Currently studying">Currently studying</option>
            <option value="Graduated">Graduated</option>
            <option value="Postgraduate">Postgraduate</option>
            <option value="Taking a break">Taking a break</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block font-semibold">Bio</span>
        <textarea className="field min-h-28" value={v.bio} maxLength={500}
          onChange={e => set({ bio: e.target.value })} />
        <span className="text-sm text-slate2">{v.bio.length}/500</span>
      </label>

      <label className="block">
        <span className="mb-1 block font-semibold">Languages</span>
        <input className="field" placeholder="English, Hindi, Marathi" value={v.languages}
          onChange={e => set({ languages: e.target.value })} />
        <span className="text-sm text-slate2">Separate with commas.</span>
      </label>

      <section className="space-y-3 rounded-2xl border border-line p-4">
        <div>
          <h3 className="text-lg font-bold">My interests</h3>
          <p className="mt-1 text-sm text-slate2">Choose hobbies and things you enjoy. These are separate from your profile prompts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map(interest => {
            const selected = selectedInterests.some(item => normalise(item) === normalise(interest));
            return <button key={interest} type="button" aria-pressed={selected}
              onClick={() => toggleInterest(interest)}
              className={`rounded-full border px-3 py-2 text-sm transition ${selected ? 'border-royal bg-royal text-white' : 'border-line bg-white text-slate-700 hover:border-royal'}`}>
              {selected ? '✓ ' : '+ '}{interest}
            </button>;
          })}
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Other interests (optional)</span>
          <input className="field" value={selectedInterests.filter(item => !INTEREST_OPTIONS.some(option => normalise(option) === normalise(item))).join(', ')}
            placeholder="e.g. astronomy, bikes"
            onChange={e => set({ interests: [...selectedInterests.filter(item => INTEREST_OPTIONS.some(option => normalise(option) === normalise(item))), ...parseCsv(e.target.value)].join(', ') })} />
          <span className="mt-1 block text-xs text-slate2">Separate additional interests with commas.</span>
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/70 to-white p-4 sm:p-5">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900">✨ Profile prompts</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${completedPromptCount >= MIN_PROMPTS ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-royal'}`}>
              {completedPromptCount}/{MIN_PROMPTS} required
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate2">
            Choose at least two prompts and write your own answers. You can add up to {MAX_PROMPTS}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PROMPT_CATEGORIES.map(category => (
            <button key={category.name} type="button"
              onClick={() => { setActiveCategory(category.name); setShowAll(false); setSearch(''); }}
              className={`rounded-full border px-3 py-2 text-sm ${activeCategory === category.name && !showAll ? 'border-royal bg-royal text-white' : 'border-line bg-white text-slate-700'}`}>
              {category.name}
            </button>
          ))}
          <button type="button" onClick={() => { setShowAll(true); setSearch(''); }}
            className={`rounded-full border px-3 py-2 text-sm ${showAll ? 'border-royal bg-royal text-white' : 'border-line bg-white text-slate-700'}`}>
            ✨ All
          </button>
        </div>

        <input className="field" placeholder="Search prompts…" value={search}
          onChange={e => setSearch(e.target.value)} />

        <div className="grid gap-3 sm:grid-cols-2">
          {visiblePrompts.map(item => {
            const selected = promptAnswers.some(answer => answer.prompt === item.prompt);
            const answer = promptAnswers.find(entry => entry.prompt === item.prompt)?.answer ?? '';
            const disabled = !selected && promptAnswers.length >= MAX_PROMPTS;

            return (
              <div
                key={item.prompt}
                className={`min-w-0 rounded-xl border bg-white p-3 transition ${
                  selected ? 'border-royal ring-1 ring-royal/20' : 'border-line hover:border-royal'
                } ${disabled ? 'opacity-60' : ''}`}
              >
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => selected ? removePrompt(item.prompt) : addPrompt(item.prompt)}
                  className="w-full text-left disabled:cursor-not-allowed"
                >
                  <span className="mb-1 block text-xs text-slate2">{item.category}</span>
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-medium text-slate-900">{item.prompt}</span>
                    <span className={`shrink-0 font-bold ${selected ? 'text-royal' : 'text-slate-500'}`}>
                      {selected ? '✓' : '+'}
                    </span>
                  </span>
                </button>

                {selected && (
                  <div className="mt-3 border-t border-blue-100 pt-3">
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Your answer <span className="text-rose-600">(required)</span>
                    </label>
                    <textarea
                      className="field w-full resize-y bg-white leading-6"
                      rows={3}
                      maxLength={500}
                      placeholder="Write your answer here…"
                      value={answer}
                      onChange={e => updateAnswer(item.prompt, e.target.value)}
                      style={{ maxHeight: '12rem', overflowY: 'auto' }}
                    />
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate2">
                      <span>Up to 8 lines</span>
                      <span>{answer.length}/500</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Want to write your own prompt?</label>
          <div className="flex gap-2">
            <input className="field min-w-0 flex-1" maxLength={100}
              placeholder="Write your own prompt…"
              value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomPrompt(); } }} />
            <button type="button" onClick={addCustomPrompt}
              disabled={!customPrompt.trim() || promptAnswers.length >= MAX_PROMPTS}
              className="rounded-xl bg-royal px-4 font-semibold text-white disabled:opacity-50">Add</button>
          </div>
        </div>
        {completedPromptCount < MIN_PROMPTS && (
          <p className="text-sm font-medium text-rose-600" role="status">
            Complete {MIN_PROMPTS - completedPromptCount} more prompt{MIN_PROMPTS - completedPromptCount === 1 ? '' : 's'} with an answer to meet the minimum requirement.
          </p>
        )}
      </section>

      <label className="block">
        <span className="mb-1 block font-semibold">What are you looking for?</span>
        <select className="field" value={v.relationship_intention}
          onChange={e => set({ relationship_intention: e.target.value })}>
          <option value="">Prefer not to say</option>
          {INTENTIONS.map(intention => <option key={intention} value={intention}>{intention}</option>)}
        </select>
      </label>
    </div>
  );
}

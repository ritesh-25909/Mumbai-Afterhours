
import { supabase } from '../../lib/supabase';
import { POLICY_VERSION } from '../../lib/constants';

export type ProfilePromptAnswer = {
  prompt: string;
  answer: string;
};

export type Profile = {
  id: string;
  display_name: string;
  date_of_birth: string;
  gender: string;
  interested_in: string[];
  neighbourhood: string | null;
  bio: string | null;
  languages: string[];
  interests: string[];
  relationship_intention: string | null;

  height: string | null;
  occupation: string | null;
  college: string | null;
  education_status: string | null;

  profile_prompts: ProfilePromptAnswer[] | null;

  // New optional profile fields
  smoking: string | null;
  alcohol: string | null;
  religion: string | null;

  profile_complete: boolean;
  visibility_status: 'visible' | 'hidden';
  verified: boolean;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  show_neighbourhood: boolean;
};

export type Prefs = {
  minimum_age: number;
  maximum_age: number;
  preferred_gender: string[];
};

export type BasicsInput = Pick<
  Profile,
  | 'display_name'
  | 'gender'
  | 'interested_in'
  | 'neighbourhood'
  | 'bio'
  | 'languages'
  | 'interests'
  | 'relationship_intention'
  | 'height'
  | 'occupation'
  | 'college'
  | 'education_status'
  | 'profile_prompts'
  | 'smoking'
  | 'alcohol'
  | 'religion'
>;

export async function getMyProfile(uid: string): Promise<Profile | null> {
  if (!uid) throw new Error('User ID is missing.');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (error) {
    console.error('getMyProfile failed:', error);
    throw new Error(`Could not load your profile: ${error.message}`);
  }

  return data as Profile | null;
}

export async function createProfile(
  uid: string,
  dob: string,
  b: BasicsInput
): Promise<void> {
  if (!uid) throw new Error('User ID is missing.');

  const { error } = await supabase
    .from('profiles')
    .insert({
      id: uid,
      date_of_birth: dob,
      city: 'Mumbai',
      ...b,
    });

  if (error) {
    console.error('createProfile failed:', error);

    throw new Error(
      error.message.includes('18')
        ? 'You must be 18 or older.'
        : `Could not save your profile: ${error.message}`
    );
  }

  const { error: consentError } = await supabase
    .from('user_consents')
    .insert([
      {
        user_id: uid,
        consent_type: 'terms',
        policy_version: POLICY_VERSION,
      },
      {
        user_id: uid,
        consent_type: 'privacy',
        policy_version: POLICY_VERSION,
      },
    ]);

  if (consentError) {
    console.error('createProfile consent failed:', consentError);
    throw new Error(
      `Profile saved, but consent saving failed: ${consentError.message}`
    );
  }
}

export async function updateProfile(
  uid: string,
  b: Partial<BasicsInput> & {
    visibility_status?: 'visible' | 'hidden';
    show_neighbourhood?: boolean;
  }
): Promise<void> {
  if (!uid) throw new Error('User ID is missing.');
  if (!b || Object.keys(b).length === 0) {
    throw new Error('No profile changes were provided.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(b)
    .eq('id', uid)
    .select('id');

  if (error) {
    console.error('UPDATE PROFILE FAILED:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      payload: b,
      uid,
    });

    throw new Error(
      `Profile save failed [${error.code}]: ${error.message}`
    );
  }

  if (!data || data.length === 0) {
    throw new Error(
      'Profile was not updated. Check whether the record exists and database permissions allow the update.'
    );
  }
}

export async function getPrefs(uid: string): Promise<Prefs | null> {
  if (!uid) throw new Error('User ID is missing.');

  const { data, error } = await supabase
    .from('user_preferences')
    .select('minimum_age,maximum_age,preferred_gender')
    .eq('user_id', uid)
    .maybeSingle();

  if (error) {
    console.error('getPrefs failed:', error);
    throw new Error(`Could not load preferences: ${error.message}`);
  }

  return data as Prefs | null;
}

export async function savePrefs(uid: string, p: Prefs): Promise<void> {
  if (!uid) throw new Error('User ID is missing.');

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: uid,
      ...p,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('savePrefs failed:', error);
    throw new Error(
      `Could not save preferences [${error.code}]: ${error.message}`
    );
  }
}

export async function publishProfile(): Promise<void> {
  const { error } = await supabase.rpc('publish_profile');

  if (error) {
    console.error('publishProfile failed:', error);
    throw new Error(
      `Could not publish profile [${error.code}]: ${error.message}`
    );
  }
}


import { supabase } from '../../lib/supabase';
import { signPhotoPaths } from '../discovery/api';

// ─── TYPES ───────────────────────────────────────────────

export type Msg = {
  id: string;
  conversation_id?: string;
  sender_user_id: string;
  content: string;
  created_at: string;
  expires_at?: string | null;
};

export type ConversationItem = {
  conversation_id: string;
  user_id: string;
  display_name: string;
  age: number;
  verified: boolean;
  photo_path: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
  unread_count: number;
  matched_at: string;
  photoUrl: string | null;
};

export type ConversationHeader = {
  conversation_id: string;
  user_id: string | null;
  display_name: string | null;
  verified: boolean | null;
  photo_path: string | null;
  is_open: boolean;
  photoUrl: string | null;
};

export type ChatPrivacySettings = {
  read_receipts_enabled: boolean;
  activity_status_enabled: boolean;
};

export type ConversationSettings = {
  notifications_muted: boolean;
};

export type VanishSettings = {
  enabled: boolean;
  enabled_by: string | null;
  enabled_at: string | null;
};

// ─── DEFAULT SETTINGS ────────────────────────────────────

export const DEFAULT_CHAT_PRIVACY: ChatPrivacySettings = {
  read_receipts_enabled: true,
  activity_status_enabled: true,
};

export const DEFAULT_CONVERSATION_SETTINGS: ConversationSettings = {
  notifications_muted: false,
};

export const DEFAULT_VANISH_SETTINGS: VanishSettings = {
  enabled: false,
  enabled_by: null,
  enabled_at: null,
};

// ─── CHAT PRIVACY SETTINGS ──────────────────────────────

export async function getChatPrivacySettings(): Promise<ChatPrivacySettings> {
  const { data, error } = await supabase
    .from('user_chat_settings')
    .select('read_receipts_enabled,activity_status_enabled')
    .maybeSingle();

  if (error) {
    throw new Error('Could not load chat privacy settings.');
  }

  return data
    ? {
        read_receipts_enabled: data.read_receipts_enabled,
        activity_status_enabled: data.activity_status_enabled,
      }
    : DEFAULT_CHAT_PRIVACY;
}

export async function saveChatPrivacySettings(
  settings: ChatPrivacySettings
): Promise<void> {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error('Please sign in again.');
  }

  const { error } = await supabase
    .from('user_chat_settings')
    .upsert(
      {
        user_id: authData.user.id,
        read_receipts_enabled: settings.read_receipts_enabled,
        activity_status_enabled: settings.activity_status_enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    throw new Error('Could not save chat privacy settings.');
  }
}

// ─── PEER READ RECEIPT ───────────────────────────────────

export async function getPeerReadAt(
  conversationId: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_peer_read_at', {
    conv: conversationId,
  });

  if (error) {
    console.error('Read receipt lookup failed:', error.message);
    return null;
  }

  return data ? String(data) : null;
}

// ─── PEER ACTIVITY STATUS ────────────────────────────────

export async function getPeerActivity(
  conversationId: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_peer_activity', {
    conv: conversationId,
  });

  if (error) {
    console.error('Activity status lookup failed:', error.message);
    return null;
  }

  return data ? String(data) : null;
}

// ─── UPDATE MY ACTIVITY ──────────────────────────────────

export async function updateMyLastActive(): Promise<void> {
  const { error } = await supabase.rpc('update_my_last_active');

  if (error) {
    console.error('Could not update activity timestamp:', error.message);
  }
}

// ─── CONVERSATION MUTE SETTINGS ───────────────────────────

export async function getConversationSettings(
  conversationId: string
): Promise<ConversationSettings> {
  const { data, error } = await supabase
    .from('conversation_user_settings')
    .select('notifications_muted')
    .eq('conversation_id', conversationId)
    .maybeSingle();

  if (error) {
    throw new Error('Could not load conversation settings.');
  }

  return data
    ? {
        notifications_muted: data.notifications_muted,
      }
    : DEFAULT_CONVERSATION_SETTINGS;
}

export async function setConversationMuted(
  conversationId: string,
  muted: boolean
): Promise<void> {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error('Please sign in again.');
  }

  const { error } = await supabase
    .from('conversation_user_settings')
    .upsert(
      {
        conversation_id: conversationId,
        user_id: authData.user.id,
        notifications_muted: muted,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'conversation_id,user_id',
      }
    );

  if (error) {
    console.error('Mute settings update failed:', error.message);
    throw new Error('Could not update notification settings.');
  }
}

// ─── VANISH MODE SETTINGS ────────────────────────────────

export async function getVanishSettings(
  conversationId: string
): Promise<VanishSettings> {
  const { data, error } = await supabase
    .from('conversation_vanish_settings')
    .select('enabled,enabled_by,enabled_at')
    .eq('conversation_id', conversationId)
    .maybeSingle();

  if (error) {
    throw new Error('Could not load Vanish Mode settings.');
  }

  return data
    ? {
        enabled: data.enabled,
        enabled_by: data.enabled_by,
        enabled_at: data.enabled_at,
      }
    : DEFAULT_VANISH_SETTINGS;
}

export async function setVanishMode(
  conversationId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase.rpc(
    'set_conversation_vanish_mode',
    {
      p_conversation_id: conversationId,
      p_enabled: enabled,
    }
  );

  if (error) {
    console.error('Vanish Mode update failed:', error.message);
    throw new Error('Could not update Vanish Mode.');
  }
}

// ─── SINGLE CONVERSATION HEADER ──────────────────────────

export async function getConversation(
  id: string
): Promise<ConversationHeader | null> {
  const { data, error } = await supabase.rpc(
    'get_conversation',
    { conv: id }
  );

  if (error) {
    throw new Error('Could not load this conversation.');
  }

  const row = (
    data as Omit<ConversationHeader, 'photoUrl'>[] | null
  )?.[0];

  if (!row) return null;

  return {
    ...row,
    photoUrl: null,
  };
}

// ─── CONVERSATION LIST ───────────────────────────────────

export async function listConversations(
  onPhotosLoaded?: (items: ConversationItem[]) => void
): Promise<ConversationItem[]> {
  const { data, error } = await supabase.rpc('list_conversations');

  if (error) {
    throw new Error(
      'Could not load your conversations. Check your connection and try again.'
    );
  }

  const rows = (data ?? []) as Omit<
    ConversationItem,
    'photoUrl'
  >[];

  const items: ConversationItem[] = rows.map((row) => ({
    ...row,
    photo_path: row.photo_path || null,
    photoUrl: null,
  }));

  if (!items.length) return items;

  void (async () => {
    try {
      const resolvedItems = [...items];

      const missingPhotoItems = resolvedItems.filter(
        (item) => !item.photo_path
      );

      const fallbackResults = await Promise.allSettled(
        missingPhotoItems.map((item) =>
          getConversation(item.conversation_id)
        )
      );

      fallbackResults.forEach((result, index) => {
        if (result.status !== 'fulfilled') return;

        const header = result.value;

        if (!header?.photo_path) return;

        const item = missingPhotoItems[index];

        const original = resolvedItems.find(
          (candidate) =>
            candidate.conversation_id === item.conversation_id
        );

        if (original) {
          original.photo_path = header.photo_path;
        }
      });

      const photoPaths = [
        ...new Set(
          resolvedItems
            .map((item) => item.photo_path)
            .filter((path): path is string => Boolean(path))
        ),
      ];

      if (photoPaths.length === 0) return;

      const urls = await signPhotoPaths(photoPaths);

      const updatedItems = resolvedItems.map((item) => ({
        ...item,
        photoUrl: item.photo_path
          ? urls[item.photo_path] ?? null
          : null,
      }));

      onPhotosLoaded?.(updatedItems);
    } catch (e) {
      console.error(
        'Could not resolve conversation profile photos:',
        e
      );
    }
  })();

  return items;
}

// ─── MESSAGE PAGINATION ──────────────────────────────────

export const PAGE = 50;

export async function fetchMessages(
  conv: string,
  before?: string
): Promise<Msg[]> {
  const now = new Date().toISOString();

  let query = supabase
    .from('messages')
    .select(
      'id,conversation_id,sender_user_id,content,created_at,expires_at'
    )
    .eq('conversation_id', conv)
    .is('deleted_at', null)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(PAGE);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Message loading failed:', error.message);

    throw new Error(
      'Could not load messages. Check your connection and try again.'
    );
  }

  return ((data ?? []) as Msg[]).reverse();
}

// ─── SEND MESSAGE ERRORS ─────────────────────────────────

export class SendError extends Error {
  constructor(
    message: string,
    public closed = false,
    public duplicate = false
  ) {
    super(message);
    this.name = 'SendError';
  }
}

// ─── SEND MESSAGE ────────────────────────────────────────

export async function sendMessage(
  id: string,
  conv: string,
  sender: string,
  content: string
): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .insert({
      id,
      conversation_id: conv,
      sender_user_id: sender,
      content,
    });

  if (!error) return;

  if (error.code === '23505') {
    throw new SendError('Already sent.', false, true);
  }

  if (error.code === '42501') {
    throw new SendError(
      'This conversation is no longer available.',
      true
    );
  }

  if (error.message?.includes('too quickly')) {
    throw new SendError(
      'You are sending messages too quickly. Wait a moment.'
    );
  }

  throw new SendError(
    'Message not sent. Check your connection and retry.'
  );
}

// ─── READ RECEIPTS ───────────────────────────────────────

export const markRead = (conv: string) =>
  supabase.rpc('mark_conversation_read', { conv });

// ─── TOTAL UNREAD COUNT ──────────────────────────────────

export async function unreadTotal(): Promise<number> {
  const { data, error } = await supabase.rpc('unread_total');

  if (error) return 0;

  return (data as number) ?? 0;
}


import { supabase } from '../../lib/supabase';
import { signPhotoPaths } from '../discovery/api';

// ─── TYPES ───────────────────────────────────────────────

export type Msg = {
  id: string;
  conversation_id?: string;
  sender_user_id: string;
  content: string;
  created_at: string;
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

  // Resolve photos independently so the conversation list
  // appears immediately without waiting for image URLs.
  void (async () => {
    try {
      // STEP 1: Collect photo paths already returned by the list RPC.
      const resolvedItems = [...items];

      // STEP 2: For missing photo paths, use the existing
      // get_conversation RPC as a fallback.
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

      // STEP 3: Sign all available profile photo paths together.
      const photoPaths = [
        ...new Set(
          resolvedItems
            .map((item) => item.photo_path)
            .filter((path): path is string => Boolean(path))
        ),
      ];

      if (photoPaths.length === 0) {
        return;
      }

      const urls = await signPhotoPaths(photoPaths);

      // STEP 4: Attach signed URLs to their corresponding users.
      const updatedItems = resolvedItems.map((item) => ({
        ...item,
        photoUrl: item.photo_path
          ? urls[item.photo_path] ?? null
          : null,
      }));

      // STEP 5: Update the UI without reloading conversations.
      onPhotosLoaded?.(updatedItems);
    } catch (e) {
      console.error(
        'Could not resolve conversation profile photos:',
        e
      );
    }
  })();

  // Return conversations immediately.
  return items;
}

// ─── MESSAGE PAGINATION ──────────────────────────────────

export const PAGE = 50;

export async function fetchMessages(
  conv: string,
  before?: string
): Promise<Msg[]> {
  let query = supabase
    .from('messages')
    .select('id,sender_user_id,content,created_at')
    .eq('conversation_id', conv)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(PAGE);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) {
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

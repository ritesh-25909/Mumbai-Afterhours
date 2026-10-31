import { supabase } from '../../lib/supabase';
import { signPhotoPaths } from '../discovery/api';

export type Msg = { id: string; conversation_id?: string; sender_user_id: string; content: string; created_at: string };
export type ConversationItem = { conversation_id: string; user_id: string; display_name: string; age: number; verified: boolean; photo_path: string | null;
  last_message: string | null; last_message_at: string | null; last_sender_id: string | null; unread_count: number; matched_at: string; photoUrl: string | null };
export type ConversationHeader = { conversation_id: string; user_id: string | null; display_name: string | null; verified: boolean | null; photo_path: string | null; is_open: boolean; photoUrl: string | null };

export async function listConversations(): Promise<ConversationItem[]> {
  const { data, error } = await supabase.rpc('list_conversations');
  if (error) throw new Error('Could not load your conversations. Check your connection and try again.');
  const rows = (data ?? []) as Omit<ConversationItem, 'photoUrl'>[];
  const urls = await signPhotoPaths(rows.map(r => r.photo_path).filter((p): p is string => !!p));
  return rows.map(r => ({ ...r, photoUrl: r.photo_path ? urls[r.photo_path] ?? null : null }));
}

export async function getConversation(id: string): Promise<ConversationHeader | null> {
  const { data, error } = await supabase.rpc('get_conversation', { conv: id });
  if (error) throw new Error('Could not load this conversation.');
  const row = (data as Omit<ConversationHeader, 'photoUrl'>[] | null)?.[0];
  if (!row) return null;
  const urls = row.photo_path ? await signPhotoPaths([row.photo_path]) : {};
  return { ...row, photoUrl: row.photo_path ? urls[row.photo_path] ?? null : null };
}

export const PAGE = 50;
export async function fetchMessages(conv: string, before?: string): Promise<Msg[]> {
  let q = supabase.from('messages').select('id,sender_user_id,content,created_at').eq('conversation_id', conv).is('deleted_at', null)
    .order('created_at', { ascending: false }).limit(PAGE);
  if (before) q = q.lt('created_at', before);
  const { data, error } = await q;
  if (error) throw new Error('Could not load messages. Check your connection and try again.');
  return (data as Msg[]).reverse();
}

export class SendError extends Error { constructor(message: string, public closed = false, public duplicate = false) { super(message); } }

// The client-generated id makes retries safe: a duplicate means the first attempt did arrive.
export async function sendMessage(id: string, conv: string, sender: string, content: string) {
  const { error } = await supabase.from('messages').insert({ id, conversation_id: conv, sender_user_id: sender, content });
  if (!error) return;
  if (error.code === '23505') throw new SendError('Already sent.', false, true);
  if (error.code === '42501') throw new SendError('This conversation is no longer available.', true);
  if (error.message.includes('too quickly')) throw new SendError('You are sending messages too quickly. Wait a moment.');
  throw new SendError('Message not sent. Check your connection and retry.');
}

export const markRead = (conv: string) => supabase.rpc('mark_conversation_read', { conv });
export async function unreadTotal(): Promise<number> {
  const { data } = await supabase.rpc('unread_total');
  return (data as number) ?? 0;
}

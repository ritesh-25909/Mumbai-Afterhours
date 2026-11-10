import { supabase } from '../../lib/supabase';

export type StorageBucketUsage = {
  bucket_id: string;
  object_count: number;
  total_bytes: number;
  database_bytes: number;
};

export async function getAdminStorageUsage(): Promise<StorageBucketUsage[]> {
  const { data, error } = await supabase.rpc('admin_storage_usage');
  if (error) throw new Error(error.message || 'Unable to load storage usage.');
  return (data ?? []).map((row: { bucket_id: string; object_count: number | string; total_bytes: number | string; database_bytes: number | string }) => ({
    bucket_id: row.bucket_id,
    object_count: Number(row.object_count) || 0,
    total_bytes: Number(row.total_bytes) || 0,
    database_bytes: Number(row.database_bytes) || 0,
  }));
}

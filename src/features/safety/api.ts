
import { supabase } from '../../lib/supabase';

export type BlockedUser = {
  user_id: string;
  display_name: string;
  blocked_at: string;
};

export async function listBlocks(): Promise<BlockedUser[]> {
  const { data, error } = await supabase.rpc('list_blocks');

  if (error) {
    console.error('LIST BLOCKS ERROR:', error);
    throw new Error('Could not load your blocked list.');
  }

  return (data ?? []) as BlockedUser[];
}

export async function unblock(id: string): Promise<void> {
  const { error } = await supabase.rpc('unblock_user', {
    target: id,
  });

  if (error) {
    console.error('UNBLOCK ERROR:', error);
    throw new Error('Could not unblock. Try again.');
  }
}

export type OpenReport = {
  report_id: string;
  category: string;
  description: string | null;
  created_at: string;
  reporter_name: string;
  reported_id: string;
  reported_name: string;
  reported_status: string;
  reports_against: number;
};

export async function listOpenReports(): Promise<OpenReport[]> {
  const { data, error } = await supabase.rpc('list_open_reports');

  if (error) {
    console.error('LIST REPORTS ERROR:', error);
    throw new Error(error.message);
  }

  return (data ?? []) as OpenReport[];
}

export async function resolveReport(
  id: string,
  action: 'dismiss' | 'suspend',
): Promise<void> {
  const { error } = await supabase.rpc('resolve_report', {
    p_report: id,
    p_action: action,
  });

  if (error) {
    console.error('RESOLVE REPORT ERROR:', error);
    throw new Error(error.message);
  }
}

export async function reinstate(id: string): Promise<void> {
  const { error } = await supabase.rpc('reinstate_user', {
    target: id,
  });

  if (error) {
    console.error('REINSTATE ERROR:', error);
    throw new Error(error.message);
  }
}

/**
 * Extract the actual response from a Supabase Edge Function error.
 */
async function getFunctionErrorDetails(error: unknown): Promise<string> {
  if (!(error instanceof Error)) {
    return 'Unknown account deletion error.';
  }

  const context = (error as Error & { context?: unknown }).context;

  if (context instanceof Response) {
    try {
      const body = await context.clone().text();

      if (body) {
        try {
          const parsed = JSON.parse(body);

          return (
            parsed.error ||
            parsed.message ||
            parsed.details ||
            body
          );
        } catch {
          return body;
        }
      }
    } catch (readError) {
      console.error('Could not read Edge Function response:', readError);
    }
  }

  return error.message || 'Unknown account deletion error.';
}

/**
 * Permanently delete the currently authenticated user's account.
 *
 * The actual deletion must be implemented securely in the
 * Supabase delete-account Edge Function.
 */
export async function deleteMyAccount(): Promise<{
  cleanup_complete: boolean;
}> {
  // Verify that a user is currently authenticated.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('DELETE ACCOUNT SESSION ERROR:', sessionError);
    throw new Error('Could not verify your session. Please sign in again.');
  }

  if (!session) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  // Invoke the server-side account deletion function.
  const { data, error } = await supabase.functions.invoke(
    'delete-account',
    {
      body: {
        confirm: 'DELETE',
      },
    },
  );

  if (error) {
    const details = await getFunctionErrorDetails(error);

    // Keep technical details in the browser console for diagnosis.
    console.error('DELETE ACCOUNT ERROR:', {
      message: error.message,
      details,
    });

    // Show a useful error to the account owner.
    if (/not found|404/i.test(details)) {
      throw new Error(
        'Account deletion service was not found. Check whether the delete-account Edge Function is deployed.',
      );
    }

    if (/jwt|unauthorized|401|token/i.test(details)) {
      throw new Error(
        'Your session could not be verified. Please sign in again.',
      );
    }

    if (/foreign key|constraint/i.test(details)) {
      throw new Error(
        'Account deletion was blocked by related database records. Please contact support.',
      );
    }

    throw new Error(
      `Account deletion failed: ${details}`,
    );
  }

  if (!data || typeof data !== 'object') {
    console.error('INVALID DELETE ACCOUNT RESPONSE:', data);

    throw new Error(
      'The deletion service returned an invalid response. Please contact support.',
    );
  }

  const result = data as {
    cleanup_complete?: boolean;
    error?: string;
    message?: string;
  };

  if (result.error) {
    throw new Error(result.error);
  }

  if (result.cleanup_complete !== true) {
    console.error('INCOMPLETE ACCOUNT CLEANUP:', result);

    throw new Error(
      'Account deletion was not confirmed as complete. Please contact support.',
    );
  }

  return {
    cleanup_complete: true,
  };
}

export type Suspended = {
  user_id: string;
  display_name: string;
};

export async function listSuspended(): Promise<Suspended[]> {
  const { data, error } = await supabase.rpc('list_suspended_users');

  if (error) {
    console.error('LIST SUSPENDED USERS ERROR:', error);
    throw new Error(error.message);
  }

  return (data ?? []) as Suspended[];
}

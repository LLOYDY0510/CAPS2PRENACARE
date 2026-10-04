import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

/**
 * Resolves the signed-in pregnant mother's context for the portal pages.
 *
 * Every one of those pages used to repeat the same three steps — build a
 * server client, require a user, then read `profiles.pregnant_mother_id`.
 * Centralising it keeps the page files to presentation only and guarantees the
 * "not signed in" path always redirects the same way.
 */
export async function getPatientContext() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('pregnant_mother_id')
    .eq('id', user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    pregnantMotherId: (profile?.pregnant_mother_id as string | null) ?? null,
  };
}

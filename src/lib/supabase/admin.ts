import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database/database.types";
import { getSupabaseSecretKey, getSupabaseServerEnvironment } from "@/lib/supabase/server-env";

type InvitationResult = Readonly<{
  userId: string;
}>;

function createNarrowAuthAdminClient() {
  const environment = getSupabaseServerEnvironment();

  return createClient<Database>(environment.url, getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function inviteAdminUser(email: string): Promise<InvitationResult> {
  const client = createNarrowAuthAdminClient();
  const { data, error } = await client.auth.admin.inviteUserByEmail(email);

  if (error || !data.user) {
    throw new Error("The administrator invitation could not be created.");
  }

  return { userId: data.user.id };
}

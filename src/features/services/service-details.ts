import "server-only";

import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const serviceDetailsSchema = z.object({
  positioning: z.string().nullable().catch(null),
  sub_services: z.array(z.string()).catch([]),
  use_cases: z.array(z.string()).catch([]),
  process_steps: z.array(z.string()).catch([]),
  coordination: z.string().nullable().catch(null),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).catch([]),
  localization_version: z.number().int(),
  hero_asset_id: z.string().uuid().nullable().catch(null),
  has_draft_changes: z.boolean().catch(false),
});
export type ServiceDetails = z.infer<typeof serviceDetailsSchema>;

/** CR1 owner detail fields for a service (the client-approved category shape). */
export async function loadServiceDetails(serviceId: string): Promise<ServiceDetails | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_service_details", { target_id: serviceId });
  if (error || data === null) return null;
  const parsed = serviceDetailsSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

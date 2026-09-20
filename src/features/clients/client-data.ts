import "server-only";

import {
  clientDetailSchema,
  clientListResultSchema,
  clientOverviewSchema,
  clientPickerListSchema,
  duplicateClientListSchema,
  type ClientDetail,
  type ClientListResult,
  type ClientOverview,
  type ClientPickerEntry,
  type DuplicateClient,
} from "@/features/clients/client-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ClientListFilters = Readonly<{
  search: string;
  tier: "" | "standard" | "vip" | "premium";
  statusScope: "active" | "archived" | "all";
  cursorUpdatedAt: string;
  cursorId: string;
}>;

export function normalizeClientListFilters(
  raw: Readonly<Record<string, string | string[] | undefined>>,
): ClientListFilters {
  const first = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };
  const tier = first("tier");
  const status = first("status");
  return {
    search: first("q").trim().slice(0, 100),
    tier: tier === "vip" || tier === "premium" || tier === "standard" ? tier : "",
    statusScope: status === "archived" || status === "all" ? status : "active",
    cursorUpdatedAt: first("cu"),
    cursorId: first("ci"),
  };
}

export async function loadClientOverview(): Promise<ClientOverview> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_clients_overview");
  if (error) throw new Error("The client overview could not be loaded.");
  return clientOverviewSchema.parse(data);
}

export async function loadClientList(filters: ClientListFilters): Promise<ClientListResult> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_clients", {
    page_size: 25,
    status_scope: filters.statusScope,
    ...(filters.search ? { search_query: filters.search } : {}),
    ...(filters.tier ? { tier_filter: filters.tier } : {}),
    ...(filters.cursorUpdatedAt && filters.cursorId
      ? { cursor_updated_at: filters.cursorUpdatedAt, cursor_id: filters.cursorId }
      : {}),
  });
  if (error) throw new Error("The client register could not be loaded.");
  return clientListResultSchema.parse(data);
}

export async function loadClientDetail(clientId: string): Promise<ClientDetail | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_client", { target_id: clientId });
  if (error) return null;
  return clientDetailSchema.parse(data);
}

export async function findDuplicateClients(
  fullName: string,
  email: string,
  phone: string,
  excludeId?: string,
): Promise<readonly DuplicateClient[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("find_possible_duplicate_clients", {
    ...(fullName ? { candidate_full_name: fullName } : {}),
    ...(email ? { candidate_email: email } : {}),
    ...(phone ? { candidate_phone: phone } : {}),
    ...(excludeId ? { exclude_id: excludeId } : {}),
  });
  if (error) return [];
  return duplicateClientListSchema.parse(data);
}

export async function loadActiveClientsForPicker(
  search = "",
): Promise<readonly ClientPickerEntry[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_active_clients_for_picker", {
    limit_count: 20,
    ...(search ? { search_query: search } : {}),
  });
  if (error) return [];
  return clientPickerListSchema.parse(data);
}

import "server-only";

import {
  duplicatePartnerSchema,
  partnerDetailSchema,
  partnerListResultSchema,
  partnerPickerSchema,
  type DuplicatePartner,
  type PartnerCapability,
  type PartnerDetail,
  type PartnerListResult,
  type PartnerPickerEntry,
} from "@/features/partners/partner-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PartnerListFilters = Readonly<{
  capability: PartnerCapability;
  search: string;
  availability: string;
  specialization: string;
  statusScope: "active" | "archived" | "all";
  cursorUpdatedAt: string;
  cursorId: string;
}>;

export function normalizePartnerListFilters(
  capability: PartnerCapability,
  raw: Readonly<Record<string, string | string[] | undefined>>,
): PartnerListFilters {
  const first = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };
  const scope = first("status");
  const availability = first("availability");
  return {
    capability,
    search: first("q").trim().slice(0, 100),
    availability: ["available", "busy", "unavailable"].includes(availability) ? availability : "",
    specialization: first("specialization").trim().slice(0, 60),
    statusScope: scope === "archived" || scope === "all" ? scope : "active",
    cursorUpdatedAt: first("cu"),
    cursorId: first("ci"),
  };
}

export async function loadPartnerList(filters: PartnerListFilters): Promise<PartnerListResult> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_trade_partners", {
    capability_filter: filters.capability,
    page_size: 25,
    status_scope: filters.statusScope,
    ...(filters.search ? { search_query: filters.search } : {}),
    ...(filters.availability ? { availability_filter: filters.availability } : {}),
    ...(filters.specialization ? { specialization_filter: filters.specialization } : {}),
    ...(filters.cursorUpdatedAt && filters.cursorId
      ? { cursor_updated_at: filters.cursorUpdatedAt, cursor_id: filters.cursorId }
      : {}),
  });
  if (error) throw new Error("The partner register could not be loaded.");
  return partnerListResultSchema.parse(data);
}

export async function loadPartnerDetail(partnerId: string): Promise<PartnerDetail | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_trade_partner", { target_id: partnerId });
  if (error) return null;
  return partnerDetailSchema.parse(data);
}

export async function loadPartnersForPicker(
  capability: PartnerCapability,
  query: string,
): Promise<readonly PartnerPickerEntry[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_partners_for_picker", {
    capability,
    limit_count: 10,
    ...(query.trim() ? { search_query: query.trim().slice(0, 100) } : {}),
  });
  if (error) return [];
  return partnerPickerSchema.parse(data);
}

export async function findDuplicatePartners(
  displayName: string,
  email: string,
  phone: string,
  company: string,
  excludeId?: string,
): Promise<readonly DuplicatePartner[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("find_possible_duplicate_trade_partners", {
    ...(displayName ? { target_display_name: displayName } : {}),
    ...(email ? { target_email: email } : {}),
    ...(phone ? { target_phone: phone } : {}),
    ...(company ? { target_company: company } : {}),
    ...(excludeId ? { exclude_id: excludeId } : {}),
  });
  if (error) return [];
  return duplicatePartnerSchema.parse(data);
}

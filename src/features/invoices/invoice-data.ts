import "server-only";

import {
  financeActionQueueSchema,
  financeOverviewSchema,
  invoiceDetailSchema,
  invoiceDocumentSchema,
  invoiceListResultSchema,
  relationshipInvoicesSchema,
  type FinanceActionQueueItem,
  type FinanceOverview,
  type InvoiceDetail,
  type InvoiceDocument,
  type InvoiceListResult,
  type RelationshipInvoices,
} from "@/features/invoices/invoice-contract";
import { createPublicSupabaseClient } from "@/lib/supabase/public-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type InvoiceListFilters = Readonly<{
  search: string;
  clientId: string;
  projectId: string;
  lifecycle: string;
  payment: string;
  overdue: boolean;
  currency: string;
  issuedFrom: string;
  issuedTo: string;
  includeArchived: boolean;
  cursorUpdatedAt: string;
  cursorId: string;
}>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const datePattern = /^\d{4}-\d{2}-\d{2}$/u;

export function normalizeInvoiceListFilters(
  raw: Readonly<Record<string, string | string[] | undefined>>,
): InvoiceListFilters {
  const first = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };
  const lifecycle = first("lifecycle");
  const payment = first("payment");
  const currency = first("currency").toUpperCase();
  return {
    search: first("q").trim().slice(0, 100),
    clientId: uuidPattern.test(first("client")) ? first("client") : "",
    projectId: uuidPattern.test(first("project")) ? first("project") : "",
    lifecycle: ["draft", "issued", "void"].includes(lifecycle) ? lifecycle : "",
    payment: ["unpaid", "partially_paid", "paid"].includes(payment) ? payment : "",
    overdue: first("overdue") === "1",
    currency: /^[A-Z]{3}$/u.test(currency) ? currency : "",
    issuedFrom: datePattern.test(first("from")) ? first("from") : "",
    issuedTo: datePattern.test(first("to")) ? first("to") : "",
    includeArchived: first("archived") === "1",
    cursorUpdatedAt: first("cu"),
    cursorId: first("ci"),
  };
}

export async function loadInvoiceList(filters: InvoiceListFilters): Promise<InvoiceListResult> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_invoices", {
    page_size: 25,
    overdue_only: filters.overdue,
    include_archived: filters.includeArchived,
    ...(filters.search ? { search_query: filters.search } : {}),
    ...(filters.clientId ? { client_id_filter: filters.clientId } : {}),
    ...(filters.projectId ? { project_id_filter: filters.projectId } : {}),
    ...(filters.lifecycle ? { lifecycle_filter: filters.lifecycle } : {}),
    ...(filters.payment ? { payment_filter: filters.payment } : {}),
    ...(filters.currency ? { currency_filter: filters.currency } : {}),
    ...(filters.issuedFrom ? { issued_from: filters.issuedFrom } : {}),
    ...(filters.issuedTo ? { issued_to: filters.issuedTo } : {}),
    ...(filters.cursorUpdatedAt && filters.cursorId
      ? { cursor_updated_at: filters.cursorUpdatedAt, cursor_id: filters.cursorId }
      : {}),
  });
  if (error) throw new Error("The invoice register could not be loaded.");
  return invoiceListResultSchema.parse(data);
}

export async function loadInvoiceDetail(invoiceId: string): Promise<InvoiceDetail | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_invoice", { target_id: invoiceId });
  if (error) return null;
  return invoiceDetailSchema.parse(data);
}

export async function loadFinanceOverview(): Promise<FinanceOverview> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_finance_overview");
  if (error) throw new Error("The finance overview could not be loaded.");
  return financeOverviewSchema.parse(data);
}

export async function loadFinanceActionQueue(
  limit = 20,
): Promise<readonly FinanceActionQueueItem[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_finance_action_queue", { limit_count: limit });
  if (error) return [];
  return financeActionQueueSchema.parse(data);
}

export async function loadClientInvoices(clientId: string): Promise<RelationshipInvoices | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_client_invoices", {
    target_client_id: clientId,
  });
  if (error) return null;
  return relationshipInvoicesSchema.parse(data);
}

export async function loadProjectInvoices(projectId: string): Promise<RelationshipInvoices | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_project_invoices", {
    target_project_id: projectId,
  });
  if (error) return null;
  return relationshipInvoicesSchema.parse(data);
}

/**
 * The single anonymous finance read path: a raw share token resolved
 * server-side through the stateless public client. Returns null for any
 * unknown, malformed, revoked, or draft-only token — identical shape on
 * every miss, so nothing is enumerable.
 */
export async function loadSharedInvoiceDocument(rawToken: string): Promise<InvoiceDocument | null> {
  if (!/^[A-Za-z0-9_-]{40,64}$/u.test(rawToken)) return null;
  const client = createPublicSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.rpc("public_invoice_by_share_token", {
    raw_token: rawToken,
  });
  if (error || data === null) return null;
  const parsed = invoiceDocumentSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/**
 * Staff-only draft document model (D1.5 §63). Built from the same detail
 * the Command Center renders: no official number, the current
 * configuration as issuer, and the draft's own financials. Never reachable
 * through a share token — drafts have none.
 */
export function draftInvoiceDocument(
  detail: InvoiceDetail,
  issuer: Readonly<{ name: string; email?: string; whatsapp?: string }>,
): InvoiceDocument | null {
  if (detail.invoice.lifecycle_state !== "draft") return null;
  return {
    id: detail.invoice.id,
    invoice_number: null,
    lifecycle_state: "draft",
    currency: detail.invoice.currency,
    tax_rate: detail.invoice.tax_rate,
    issue_date: detail.invoice.issue_date,
    due_date: detail.invoice.due_date,
    reference: detail.invoice.reference,
    notes: detail.invoice.notes,
    payment_terms: detail.invoice.payment_terms,
    voided_at: null,
    issuer: {
      name: issuer.name,
      ...(issuer.email ? { email: issuer.email } : {}),
      ...(issuer.whatsapp ? { whatsapp: issuer.whatsapp } : {}),
      tax_label: "Tax",
    },
    client: {
      full_name: detail.client.full_name,
      ...(detail.client.company ? { company: detail.client.company } : {}),
      ...(detail.client.email ? { email: detail.client.email } : {}),
      ...(detail.client.phone_display ? { phone: detail.client.phone_display } : {}),
    },
    project: detail.project ? { title: detail.project.title } : null,
    lines: detail.lines,
    subtotal: detail.financials.subtotal,
    tax_amount: detail.financials.tax_amount,
    total: detail.financials.total,
    paid_amount: detail.financials.paid_amount,
    balance_due: detail.financials.balance_due,
    payment_state: detail.financials.payment_state,
    is_overdue: false,
    payments: [],
  };
}

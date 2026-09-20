"use server";

import { revalidatePath } from "next/cache";

import {
  actionState,
  authorize,
  commandId,
  commandReason,
  commandReasonCode,
  commandSucceeded,
  commandVersion,
} from "@/features/admin-shared/action-helpers";
import { type AdminActionState } from "@/features/admin-shared/action-state";
import { loadProjectList } from "@/features/operational-projects/project-data";
import {
  materialCreateInput,
  materialEditInput,
  materialRefInput,
  poCreateInput,
  poEditInput,
  poIssueInput,
  poReasonInput,
  poRefInput,
  receiptRecordInput,
  receiptReverseInput,
  requirementCreateInput,
  requirementEditInput,
  zodFieldErrors,
  type DuplicateMaterial,
  type MaterialPickerEntry,
} from "@/features/procurement/procurement-contract";
import {
  orderableRequirements,
  type PoEditorRequirement,
} from "@/features/procurement/po-editor-model";
import {
  findDuplicateMaterials,
  loadMaterialsForPicker,
  loadProjectProcurement,
} from "@/features/procurement/procurement-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function revalidateProcurement(
  options: Readonly<{
    orderId?: string | undefined;
    materialId?: string | undefined;
    projectId?: string | undefined;
    supplierId?: string | undefined;
  }> = {},
): void {
  revalidatePath("/admin");
  revalidatePath("/admin/procurement/orders");
  revalidatePath("/admin/procurement/materials");
  revalidatePath("/admin/procurement/suppliers");
  if (options.orderId) revalidatePath(`/admin/procurement/orders/${options.orderId}`);
  if (options.materialId) revalidatePath(`/admin/procurement/materials/${options.materialId}`);
  if (options.projectId) revalidatePath(`/admin/operations/projects/${options.projectId}`);
  if (options.supplierId) revalidatePath(`/admin/procurement/suppliers/${options.supplierId}`);
}

function conflictOrError(data: unknown): AdminActionState {
  return actionState(
    commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
    commandReason(data),
    { currentVersion: commandVersion(data, "current_version") },
  );
}

function commandString(value: unknown, key: string): string | null {
  const candidate =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)[key]
      : null;
  return typeof candidate === "string" ? candidate : null;
}

// Materials --------------------------------------------------------------

export async function createMaterialAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("procurement.materials.write");
  if (denied) return denied;
  const parsed = materialCreateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before creating this material.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_admin_material", {
    target_name: input.name,
    target_unit: input.unit,
    ...(input.code ? { target_code: input.code } : {}),
    ...(input.category ? { target_category: input.category } : {}),
    ...(input.specification ? { target_specification: input.specification } : {}),
    ...(input.supplierId ? { target_supplier_id: input.supplierId } : {}),
  });
  if (error || !commandSucceeded(data)) {
    const code = commandReasonCode(data);
    return actionState("error", commandReason(data), {
      fieldErrors:
        code === "duplicate" || code === "duplicate_code"
          ? { code: commandReason(data) }
          : code === "capability_missing"
            ? { supplierId: commandReason(data) }
            : {},
    });
  }
  const createdId = commandId(data);
  revalidateProcurement({ materialId: createdId ?? undefined });
  return actionState("success", "Material created.", {
    currentVersion: commandVersion(data),
    createdId,
  });
}

export async function updateMaterialAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("procurement.materials.write");
  if (denied) return denied;
  const parsed = materialEditInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before saving.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_admin_material", {
    target_id: input.materialId,
    expected_version: input.expectedVersion,
    target_name: input.name,
    target_unit: input.unit,
    target_active: input.active,
    ...(input.code ? { target_code: input.code } : {}),
    ...(input.category ? { target_category: input.category } : {}),
    ...(input.specification ? { target_specification: input.specification } : {}),
    ...(input.supplierId ? { target_supplier_id: input.supplierId } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateProcurement({ materialId: input.materialId });
  return actionState("success", "Material saved.", { currentVersion: commandVersion(data) });
}

export async function archiveMaterialAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("procurement.materials.write");
  if (denied) return denied;
  const parsed = materialRefInput(formData);
  if (!parsed.success) return actionState("error", "The material reference is invalid.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("archive_admin_material", {
    target_id: parsed.data.materialId,
    expected_version: parsed.data.expectedVersion,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateProcurement({ materialId: parsed.data.materialId });
  return actionState("success", "Material archived.", { currentVersion: commandVersion(data) });
}

export async function searchMaterialsAction(
  query: string,
): Promise<readonly MaterialPickerEntry[]> {
  const denied = await authorize("procurement.materials.read");
  if (denied) return [];
  return loadMaterialsForPicker(query);
}

export async function checkDuplicateMaterialsAction(
  name: string,
  code: string,
  excludeId?: string,
): Promise<readonly DuplicateMaterial[]> {
  const denied = await authorize("procurement.materials.read");
  if (denied) return [];
  if (name.trim().length < 3 && code.trim() === "") return [];
  return findDuplicateMaterials(name, code, excludeId);
}

// Requirements -----------------------------------------------------------

export async function createRequirementAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("procurement.materials.write");
  if (denied) return denied;
  const parsed = requirementCreateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before adding this requirement.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_material_requirement", {
    target_project_id: input.projectId,
    target_item_name: input.itemName,
    target_quantity: Number(input.quantity),
    target_unit: input.unit,
    target_priority: input.priority,
    target_state: input.state,
    ...(input.materialId ? { target_material_id: input.materialId } : {}),
    ...(input.specification ? { target_specification: input.specification } : {}),
    ...(input.requiredBy ? { target_required_by: input.requiredBy } : {}),
    ...(input.note ? { target_note: input.note } : {}),
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  revalidateProcurement({ projectId: input.projectId });
  return actionState("success", "Requirement added.", {
    currentVersion: commandVersion(data),
    createdId: commandId(data),
  });
}

export async function updateRequirementAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("procurement.materials.write");
  if (denied) return denied;
  const parsed = requirementEditInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before saving.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_material_requirement", {
    target_id: input.requirementId,
    expected_version: input.expectedVersion,
    target_item_name: input.itemName,
    target_quantity: Number(input.quantity),
    target_unit: input.unit,
    target_priority: input.priority,
    target_state: input.state,
    ...(input.materialId ? { target_material_id: input.materialId } : {}),
    ...(input.specification ? { target_specification: input.specification } : {}),
    ...(input.requiredBy ? { target_required_by: input.requiredBy } : {}),
    ...(input.note ? { target_note: input.note } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  const projectRaw = formData.get("projectId");
  revalidateProcurement({
    projectId:
      typeof projectRaw === "string" && /^[0-9a-f-]{36}$/iu.test(projectRaw)
        ? projectRaw
        : undefined,
  });
  return actionState("success", "Requirement saved.", { currentVersion: commandVersion(data) });
}

// Purchase orders --------------------------------------------------------

function poFieldErrors(data: unknown): Readonly<Record<string, string>> {
  const code = commandReasonCode(data);
  const reasons =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)["reasons"]
      : null;
  const first: unknown = Array.isArray(reasons) && reasons.length > 0 ? reasons[0] : null;
  const field =
    typeof first === "object" && first !== null
      ? (first as Record<string, unknown>)["field"]
      : null;
  if (code === "capability_missing" || field === "supplier_id") {
    return { supplierId: commandReason(data) };
  }
  if (field === "lines") return { lines: commandReason(data) };
  return {};
}

export async function createPurchaseOrderAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("procurement.orders.write");
  if (denied) return denied;
  const parsed = poCreateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before saving this draft.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_admin_purchase_order", {
    target_project_id: input.projectId,
    target_supplier_id: input.supplierId,
    target_currency: input.currency,
    target_tax_rate: Number(input.taxRate),
    lines: input.lines,
    ...(input.reference ? { target_reference: input.reference } : {}),
    ...(input.expectedDeliveryDate
      ? { target_expected_delivery_date: input.expectedDeliveryDate }
      : {}),
    ...(input.notes ? { target_notes: input.notes } : {}),
    ...(input.terms ? { target_terms: input.terms } : {}),
  });
  if (error || !commandSucceeded(data)) {
    return actionState("error", commandReason(data), {
      fieldErrors: poFieldErrors(data),
      detail: commandReasonCode(data),
    });
  }
  const createdId = commandId(data);
  revalidateProcurement({
    orderId: createdId ?? undefined,
    projectId: input.projectId,
    supplierId: input.supplierId,
  });
  return actionState("success", "Draft saved.", {
    currentVersion: commandVersion(data),
    createdId,
  });
}

export async function updatePurchaseOrderAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("procurement.orders.write");
  if (denied) return denied;
  const parsed = poEditInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before saving this draft.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_admin_purchase_order", {
    target_id: input.orderId,
    expected_version: input.expectedVersion,
    target_supplier_id: input.supplierId,
    target_currency: input.currency,
    target_tax_rate: Number(input.taxRate),
    lines: input.lines,
    ...(input.reference ? { target_reference: input.reference } : {}),
    ...(input.expectedDeliveryDate
      ? { target_expected_delivery_date: input.expectedDeliveryDate }
      : {}),
    ...(input.notes ? { target_notes: input.notes } : {}),
    ...(input.terms ? { target_terms: input.terms } : {}),
  });
  if (error || !commandSucceeded(data)) {
    if (commandReasonCode(data) === "version_conflict") return conflictOrError(data);
    return actionState("error", commandReason(data), {
      fieldErrors: poFieldErrors(data),
      detail: commandReasonCode(data),
    });
  }
  revalidateProcurement({
    orderId: input.orderId,
    projectId: input.projectId,
    supplierId: input.supplierId,
  });
  return actionState("success", "Draft saved.", { currentVersion: commandVersion(data) });
}

export async function issuePurchaseOrderAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("procurement.orders.issue");
  if (denied) return denied;
  const parsed = poIssueInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the dates before issuing.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("issue_admin_purchase_order", {
    target_id: input.orderId,
    expected_version: input.expectedVersion,
    target_issue_date: input.issueDate,
    ...(input.expectedDeliveryDate
      ? { target_expected_delivery_date: input.expectedDeliveryDate }
      : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateProcurement({ orderId: input.orderId });
  return actionState("success", "Purchase order issued.", {
    currentVersion: commandVersion(data),
    detail: commandString(data, "purchase_order_number"),
  });
}

export async function cancelPurchaseOrderAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("procurement.orders.issue");
  if (denied) return denied;
  const parsed = poReasonInput(formData);
  if (!parsed.success) {
    return actionState("error", "A cancellation reason is required.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("cancel_admin_purchase_order", {
    target_id: parsed.data.orderId,
    expected_version: parsed.data.expectedVersion,
    reason: parsed.data.reason,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateProcurement({ orderId: parsed.data.orderId });
  return actionState("success", "Purchase order cancelled.", {
    currentVersion: commandVersion(data),
  });
}

export async function closePurchaseOrderAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("procurement.orders.issue");
  if (denied) return denied;
  const parsed = poReasonInput(formData);
  if (!parsed.success) {
    return actionState("error", "A closing reason is required.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("close_admin_purchase_order", {
    target_id: parsed.data.orderId,
    expected_version: parsed.data.expectedVersion,
    reason: parsed.data.reason,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateProcurement({ orderId: parsed.data.orderId });
  return actionState("success", "Purchase order closed.", {
    currentVersion: commandVersion(data),
  });
}

export async function duplicatePurchaseOrderAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("procurement.orders.write");
  if (denied) return denied;
  const parsed = poRefInput(formData);
  if (!parsed.success) return actionState("error", "The purchase order reference is invalid.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("duplicate_admin_purchase_order", {
    target_id: parsed.data.orderId,
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  const createdId = commandId(data);
  revalidateProcurement({ orderId: createdId ?? undefined });
  return actionState("success", "Draft duplicated.", {
    currentVersion: commandVersion(data),
    createdId,
  });
}

export async function recordGoodsReceiptAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("procurement.receipts.write");
  if (denied) return denied;
  const parsed = receiptRecordInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before recording this delivery.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("record_goods_receipt", {
    target_po_id: input.orderId,
    target_received_at: input.receivedAt,
    items: input.items
      .filter((item) => Number.parseFloat(item.quantity_received) > 0)
      .map((item) => ({
        line_item_id: item.line_item_id,
        quantity_received: Number(item.quantity_received),
      })),
    ...(input.reference ? { target_reference: input.reference } : {}),
    ...(input.note ? { target_note: input.note } : {}),
  });
  if (error || !commandSucceeded(data)) {
    return actionState("error", commandReason(data), {
      fieldErrors: commandReasonCode(data) === "over_receipt" ? { items: commandReason(data) } : {},
      detail: commandReasonCode(data),
    });
  }
  revalidateProcurement({ orderId: input.orderId });
  return actionState("success", "Delivery recorded.", {
    currentVersion: commandVersion(data),
    detail: commandString(data, "delivery_state"),
  });
}

export async function reverseGoodsReceiptAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("procurement.receipts.write");
  if (denied) return denied;
  const parsed = receiptReverseInput(formData);
  if (!parsed.success) {
    return actionState("error", "A reversal reason is required.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("reverse_goods_receipt", {
    target_receipt_id: parsed.data.receiptId,
    reason: parsed.data.reason,
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  revalidateProcurement({ orderId: commandId(data) ?? undefined });
  return actionState("success", "Delivery receipt reversed.", {
    currentVersion: commandVersion(data),
  });
}

/** Returns the raw supplier token exactly once via the action state detail channel. */
export async function createPoShareLinkAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("procurement.orders.write");
  if (denied) return denied;
  const parsed = poRefInput(formData);
  if (!parsed.success) return actionState("error", "The purchase order reference is invalid.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_purchase_order_share_link", {
    target_id: parsed.data.orderId,
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  revalidateProcurement({ orderId: parsed.data.orderId });
  return actionState("success", "Supplier link generated.", {
    currentVersion: commandVersion(data),
    detail: commandString(data, "token"),
  });
}

export async function revokePoShareLinkAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("procurement.orders.write");
  if (denied) return denied;
  const parsed = poRefInput(formData);
  if (!parsed.success) return actionState("error", "The purchase order reference is invalid.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("revoke_purchase_order_share_link", {
    target_id: parsed.data.orderId,
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  revalidateProcurement({ orderId: parsed.data.orderId });
  return actionState("success", "Supplier link revoked.", {
    currentVersion: commandVersion(data),
  });
}

export type ProcurementProjectEntry = Readonly<{ id: string; title: string; client: string }>;

/** Active operational projects for the supplier-first purchase order entry point. */
export async function searchProjectsForProcurementAction(
  query: string,
): Promise<readonly ProcurementProjectEntry[]> {
  const denied = await authorize("procurement.orders.write");
  if (denied) return [];
  try {
    const result = await loadProjectList({
      search: query.trim().slice(0, 100),
      clientId: "",
      status: "",
      phase: "",
      priority: "",
      statusScope: "active",
      caseStudy: "",
      cursorUpdatedAt: "",
      cursorId: "",
    });
    return result.items.map((item) => ({
      id: item.id,
      title: item.title,
      client: item.client.full_name,
    }));
  } catch {
    return [];
  }
}

/** Approved requirements with quantity left to order, for the purchase order editor. */
export async function listOrderableRequirementsAction(
  projectId: string,
): Promise<readonly PoEditorRequirement[]> {
  const denied = await authorize("procurement.orders.write");
  if (denied) return [];
  if (!/^[0-9a-f-]{36}$/iu.test(projectId)) return [];
  const data = await loadProjectProcurement(projectId);
  if (!data) return [];
  return orderableRequirements(data.requirements);
}

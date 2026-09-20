/**
 * Editor-side purchase order draft model shared by the client editor and the
 * server pages that seed it. Keys are local only; the server never sees them.
 */
export type PoEditorLine = Readonly<{
  key: string;
  description: string;
  quantity: string;
  unit_label: string;
  unit_price: string;
  material_requirement_id: string;
  material_id: string;
  over_order_confirmed: boolean;
  /** Display-only context for a requirement-linked line. */
  requirement_label: string;
  requirement_remaining: string;
}>;

export type PoEditorRequirement = Readonly<{
  id: string;
  item_name: string;
  unit_label: string;
  required_quantity: string;
  remaining_to_order: string;
  material_id: string;
  specification: string;
}>;

export type PoEditorInitial = Readonly<{
  projectId: string;
  projectTitle: string;
  supplierId: string;
  supplierLabel: string;
  currency: string;
  taxRate: string;
  reference: string;
  expectedDeliveryDate: string;
  notes: string;
  terms: string;
  lines: readonly PoEditorLine[];
  /** Approved requirements of the project with quantity left to order. */
  requirements: readonly PoEditorRequirement[];
  /** Requirement to pre-add as a line (project-first "Order" entry). */
  preselectedRequirementId: string;
}>;

let lineKeySeed = 0;
export function newPoLine(partial: Partial<PoEditorLine> = {}): PoEditorLine {
  lineKeySeed += 1;
  return {
    key: `po-line-${lineKeySeed}-${Date.now()}`,
    description: "",
    quantity: "1",
    unit_label: "",
    unit_price: "",
    material_requirement_id: "",
    material_id: "",
    over_order_confirmed: false,
    requirement_label: "",
    requirement_remaining: "",
    ...partial,
  };
}

export function lineFromRequirement(requirement: PoEditorRequirement): PoEditorLine {
  const remaining = Number.parseFloat(requirement.remaining_to_order);
  return newPoLine({
    description: requirement.item_name,
    quantity: Number.isFinite(remaining) && remaining > 0 ? requirement.remaining_to_order : "1",
    unit_label: requirement.unit_label,
    material_requirement_id: requirement.id,
    material_id: requirement.material_id,
    requirement_label: `${requirement.item_name} · ${requirement.remaining_to_order} ${requirement.unit_label} left to order`,
    requirement_remaining: requirement.remaining_to_order,
  });
}

/** True when a requirement-linked line asks for more than the requirement still needs. */
export function lineOverOrders(line: PoEditorLine): boolean {
  if (!line.material_requirement_id || line.requirement_remaining === "") return false;
  const quantity = Number.parseFloat(line.quantity);
  const remaining = Number.parseFloat(line.requirement_remaining);
  return Number.isFinite(quantity) && Number.isFinite(remaining) && quantity > remaining;
}

/** Project requirements → editor entries (approved, with something left to order). */
export function orderableRequirements(
  rows: readonly Readonly<{
    id: string;
    item_name: string;
    unit_label: string;
    required_quantity: string | number;
    remaining_to_order: string | number;
    approval_state: string;
    specification: string | null;
    material: Readonly<{ id: string }> | null;
  }>[],
): PoEditorRequirement[] {
  return rows
    .filter(
      (row) =>
        row.approval_state === "approved" && Number.parseFloat(String(row.remaining_to_order)) > 0,
    )
    .map((row) => ({
      id: row.id,
      item_name: row.item_name,
      unit_label: row.unit_label,
      required_quantity: String(row.required_quantity),
      remaining_to_order: String(row.remaining_to_order),
      material_id: row.material?.id ?? "",
      specification: row.specification ?? "",
    }));
}

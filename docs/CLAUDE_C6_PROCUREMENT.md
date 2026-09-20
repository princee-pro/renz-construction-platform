# C6 — PROCUREMENT: MATERIALS, REQUIREMENTS, SUPPLIERS

## Materials (catalog)

`public.materials`: `internal_code` (optional, unique case-insensitively),
`name`, `category`, `specification`, `default_unit`, `preferred_supplier_id`
(supplier-capable partner), `active`, `version`, `archived_at`.

Facades (`procurement.materials.*`): `admin_list_materials`,
`admin_get_material` (with recent order lines and activity),
`admin_list_materials_for_picker`, `find_possible_duplicate_materials`
(exact code or normalized name, advisory), `create_admin_material`,
`update_admin_material`, `archive_admin_material`. Duplicate codes are
refused (`duplicate_code`).

Free-text items remain allowed everywhere — the catalog is a convenience,
not a gate.

## Project material requirements

`public.project_material_requirements` belongs to exactly one project:
`item_name`, `material_id` (optional), `specification`,
`required_quantity`, `unit_label`, `required_by`, `priority`
(`low | medium | high`), `approval_state` (`draft | approved | cancelled`),
`private_note` (never printed), `version`. `unique (id, operational_project_id)`
backs the composite FK from purchase order lines so a line can only reference
a requirement of the **same project** (DB-enforced; `invalid_relationship`).

Derived, never stored — `private.requirement_quantities(id)`:
`ordered_quantity` (lines on **issued or closed** orders only; drafts do not
count), `received_quantity` (effective receipts), `remaining_to_order`,
`remaining_to_receive`, `procurement_state`
(`not_ordered | partially_ordered | ordered | partially_received | received`).

Facades: `admin_project_procurement(target_project_id)` (requirements with
quantities, the project's purchase orders, `ordered_value_by_currency`,
summary counts, `due_soon_window_days = 14`), `create_material_requirement`,
`update_material_requirement` (quantity cannot drop below ordered; cancelling
an ordered requirement is refused).

## Suppliers

The Suppliers register (`/admin/procurement/suppliers`) is the trade partner
register filtered to `supplier`; Supplier 360 shows purchase orders, activity
and notes, and offers **New purchase order** (supplier-first entry). See
`CLAUDE_C6_TRADE_PARTNERS.md`.

## Project Procurement tab

Requirements table (Required / Ordered / Received / Remaining, approval and
procurement badges, “Due soon” within 14 days), inline **Add Requirement** /
Edit forms, **Create Purchase Order** (project-first) and per-requirement
**Order** links that pre-add the requirement line, the project's purchase
orders, and ordered value by currency (issued + closed).

## Action queue rule

`material_due_soon` — approved requirement with `remaining_to_order > 0` and
`required_by` within 14 days (links to the project's Procurement tab).

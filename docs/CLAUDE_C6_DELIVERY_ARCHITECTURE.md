# C6 DELIVERY — ARCHITECTURE

Entry point for the delivery side of the RENZ operating system. Read this
first, then `CLAUDE_C6_TRADE_PARTNERS.md`, `CLAUDE_C6_CONTRACTOR_ASSIGNMENTS.md`,
`CLAUDE_C6_CONTRACTOR_FINANCE.md`, `CLAUDE_C6_PROCUREMENT.md`,
`CLAUDE_C6_PURCHASE_ORDER_LIFECYCLE.md` and `CLAUDE_C6_GOODS_RECEIVING.md`.

## What C6 is

C6 adds the **cost side** of an operational project, beside — never inside —
the C5 client-invoice tables:

- **Trade partners**: one identity for the people and companies RENZ works
  with, carrying one or both **capabilities** (`contractor`, `supplier`).
- **Contractor assignments**: a contractor on a project with scope,
  schedule, rate, agreed amount and append-only **contractor payments**.
- **Materials** (catalog) and **project material requirements**.
- **Purchase orders** to suppliers with official `RENZ-PO-YYYY-NNNNNN`
  numbering, frozen snapshots, a supplier share link, and append-only
  **goods receipts** with reversals.
- The **project cost / delivery position** by currency, the Control Room
  delivery module and delivery action queue, Quick Find kinds, realtime
  pointers, and Contractor Payables under Finance.

C6 records commitments and money paid out; it does not process payments,
keep a ledger, track inventory, or compute profitability.

## Pattern reused, not reinvented

Everything continues the C4/C5 pattern:

- Default-deny RLS on all 12 C6 tables; `SECURITY DEFINER` facades with an
  empty `search_path` are the only access path. One non-staff facade:
  `public_purchase_order_by_share_token(text)` (token-scoped, hash-verified,
  granted to `anon`).
- `private.has_permission(...)` (AAL2 + active profile), `private.s4_audit`,
  `private.failure` → `{ok:false, reasons:[...]}`, integer `version` +
  `expected_version`, `private.emit_realtime_event(...)` value-free pointers.
- Keyset pagination on every register; every list/detail/summary is one
  bounded RPC using `lateral` projections (`private.assignment_financials`,
  `private.purchase_order_financials`, `private.requirement_quantities`).
- The same admin-shared primitives: `AdminActionState`, `usePinnedEdit`,
  controlled drafts, `RealtimeRefresh`, `RegisterSkeleton`, `Field`,
  `StatusBadge`, the bounded pickers.

## Domain model

```
trade_partners (capabilities ⊂ {contractor, supplier})
   │                              │
   │ contractor                   │ supplier
   ▼                              ▼
contractor_assignments ──< contractor_payments      purchase_orders ──< purchase_order_line_items
   │        └──< contractor_assignment_adjustments       │    │             │ (material_requirement_id,
   │                                                     │    │             │  operational_project_id) composite FK
   └── operational_projects ◄─────────────────────────────┘    └──< purchase_order_receipts ──< purchase_order_receipt_items
             │                                                 └──< purchase_order_share_links (hash only)
             └──< project_material_requirements ──? materials (catalog, optional preferred_supplier_id)
```

Money invariants inherited from C5 (`CLAUDE_C5_FINANCE_ARCHITECTURE.md`):
numeric money, one currency per assignment / purchase order, per-currency
aggregation only (never a combined figure), append-only payment and receipt
history with reversals, immutable issued documents.

## Migrations and tests

- `supabase/migrations/20260913100000_establish_c6_partners_contractors.sql`
  — permissions, partners, assignments, payments, adjustments, projections,
  partner/assignment/payables facades.
- `supabase/migrations/20260913110000_establish_c6_procurement.sql` —
  materials, requirements, purchase orders, lines, receipts, share links,
  numbering counters, procurement facades, delivery overview / action queue /
  project delivery summary, and the recreated `admin_recent_activity` and
  `admin_global_quick_find`.
- `supabase/tests/database/014_c6_delivery.sql` (pgTAP, 117 assertions) plus
  updated inventories in `001`, `006`, `007`.
- `scripts/verify-c6.mjs` (`pnpm c6:verify`) — synthetic lifecycle + race
  proofs; `tests/e2e/c6-delivery.spec.ts` (`pnpm test:e2e:c6`) — browser
  acceptance; `tests/unit/c6-delivery-contracts.test.ts`,
  `tests/unit/po-pdf.test.ts`.

## Permissions (exact, seeded to admin and super_admin)

`partners.read`, `partners.write`, `contractors.assign`,
`contractors.payments.write`, `procurement.materials.read`,
`procurement.materials.write`, `procurement.orders.read`,
`procurement.orders.write`, `procurement.orders.issue`,
`procurement.receipts.write`. Every facade checks exactly one of them;
composite reads (`admin_delivery_overview`, `admin_project_delivery_summary`)
return `null` for the parts the caller cannot read rather than denying.

## Realtime

Entity types added to the C4 pointer channel: `trade_partner`,
`contractor_assignment`, `material`, `material_requirement`,
`purchase_order`; actions added: `capability_changed`, `adjusted`, `rated`,
`approved`, `cancelled`, `closed`, `receipt_recorded`, `receipt_reversed`.
Every emission is `(entity_type, entity_id, action)` only — no amounts,
quantities or names. Pages subscribe through `useAdminRealtimeInvalidation`
/ `RealtimeRefresh`; the assignment and purchase order command centers refresh
in place (proved by the two-session E2E tests).

## Routes

| Route | Purpose |
| --- | --- |
| `/admin/operations/contractors` (+ `/new`, `/[partnerId]`, `/[partnerId]/edit`) | Contractor register, create, 360, edit |
| `/admin/operations/assignments/new`, `/[assignmentId]` (+ `/edit`) | Assign from project or contractor; assignment command view |
| `/admin/finance/contractor-payables` | Contractor Payables register |
| `/admin/procurement/materials` (+ `/new`, `/[materialId]`, `/[materialId]/edit`) | Material catalog |
| `/admin/procurement/suppliers` (+ `/new`, `/[partnerId]`, `/[partnerId]/edit`) | Supplier register / 360 |
| `/admin/procurement/orders` (+ `/new`, `/[orderId]`, `/edit`, `/print`, `/pdf`) | Purchase orders |
| `/po/[token]` (+ `/pdf`) | Supplier share page |
| `/admin/operations/projects/[projectId]?tab=contractors|procurement` | Project Contractors / Procurement tabs |

## Deliberately not built

Supplier payments (no silent creation, no payables for suppliers), payment
gateways, inventory/warehouses, payroll, general ledger, tax filing,
profitability/margin, C7 settings, C8 intake.

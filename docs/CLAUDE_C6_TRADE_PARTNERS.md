# C6 — TRADE PARTNERS

## One identity, one or two capabilities

`public.trade_partners` is the shared record for contractors and suppliers.
`capabilities text[]` is constrained to a non-empty subset of
`{contractor, supplier}`. A person or company that both builds and supplies
is **one row** with both capabilities — the Contractors register shows
partners holding `contractor`, the Suppliers register shows partners holding
`supplier`, and both 360 pages open the same record (`/admin/operations/contractors/[id]`
and `/admin/procurement/suppliers/[id]`; opening a partner under the wrong
register redirects to the right one).

Fields: `display_name`, `company_name`, `contact_name`, `email`,
`phone_display`, `address`, `notes` (private), `specializations text[]`,
`availability_status` (`available | busy | unavailable`), `version`,
`archived_at`.

## Facades

| Facade | Permission | Notes |
| --- | --- | --- |
| `admin_list_trade_partners(capability_filter, search_query, availability_filter, specialization_filter, status_scope, cursor…)` | `partners.read` | Keyset; each row carries active assignment count, open order count, derived performance and outstanding by currency |
| `admin_list_partners_for_picker(capability, search_query, limit_count)` | `partners.read` | Bounded picker (active, capability-filtered) |
| `admin_get_trade_partner(target_id)` | `partners.read` | 360: assignments, purchase orders, rated assignments, activity, private notes |
| `find_possible_duplicate_trade_partners(target_display_name, target_email, target_phone, target_company, exclude_id)` | `partners.read` | Advisory: email / phone / exact normalized name or company |
| `create_admin_trade_partner(...)` | `partners.write` | Capabilities chosen at creation |
| `update_admin_trade_partner(target_id, expected_version, …)` | `partners.write` | Identity/contact/profile; capabilities untouched |
| `add_trade_partner_capability(target_id, expected_version, capability)` | `partners.write` | Audited `partner.capability_change`; the only way a capability changes (never removed) |
| `archive_admin_trade_partner(target_id, expected_version)` | `partners.write` | Refused with active assignments or open (issued) purchase orders |

## Capability enforcement

- `create_contractor_assignment` refuses a partner without `contractor`
  (`capability_missing`, field `partner_id`).
- `create_admin_purchase_order` / `update_admin_purchase_order` refuse a
  supplier without `supplier` (`capability_missing`, field `supplier_id`).
- The 360 page offers “Add supplier capability” / “Add contractor capability”
  instead of a second record; the register empty states and the duplicate
  panel say the same.

## Performance

`private.partner_performance(partner_id)` averages `performance_rating` over
completed, non-archived assignments (`average_rating`, `rated_count`). The
average is derived at read time and never stored. The scale is 1–5 with
accessible labels (`1 — Poor` … `5 — Excellent`, `ratingScale` in
`partner-contract.ts`).

## Outstanding by currency

`private.partner_outstanding_by_currency(partner_id)` sums agreed / paid /
remaining per currency over non-cancelled assignments with an agreed amount.
Registers and the 360 render one line per currency; nothing is combined.

## Audit and privacy

`partner.create`, `partner.update`, `partner.archive`,
`partner.capability_change` are written with metadata limited to
capabilities and availability — never `notes`, `address`, `email` or `phone`.
`scripts/verify-c6.mjs` asserts the audit text contains neither the private
note nor the address.

# C5 INVOICE NUMBERING

## Format

`RENZ-YYYY-NNNNNN` — e.g. `RENZ-2026-000001`. `YYYY` is the year of the
**issue date** the staff member confirms at issue; `NNNNNN` is a six-digit,
zero-padded, per-year sequence. Enforced by
`invoices_number_format_check` and `invoices_number_unique`.

## Assignment

Numbers exist only for issued (and therefore void) invoices — a draft has
`invoice_number = null` (`invoices_issued_shape_check` makes any other
combination impossible). The number is assigned inside
`issue_admin_invoice`, in the same transaction as the snapshots and the state
flip:

```sql
insert into public.invoice_number_counters as counter (year_key, last_value)
values (issue_year, 1)
on conflict (year_key) do update set last_value = counter.last_value + 1
returning counter.last_value;
```

`ON CONFLICT … DO UPDATE` takes a row-level lock on that year's counter row,
so concurrent issuers **serialize** on it and can never read the same value.
There is no `SELECT MAX(number) + 1` anywhere. The invoice row itself is
also locked `FOR UPDATE` before validation, so two staff issuing the *same*
draft resolve to exactly one issued invoice and one number.

Proven by `scripts/verify-c5.mjs` (two drafts issued with `Promise.all` →
two distinct valid numbers; two actors issuing one draft → one success) and
by `013_c5_finance.sql` (`…000001`, then `…000002`).

## Gaps

Because the counter increment is part of the issue transaction, a failed
issue rolls the increment back — no gap is created by failure. Gaps *can*
appear only in ways that are correct: a voided invoice keeps its number (a
void document is still a document), and per-year counters simply restart at
`000001` each January. No logic attempts to "fill" or renumber; uniqueness
and integrity matter more than cosmetic continuity.

The counter table (`invoice_number_counters`) is default-deny RLS and has no
facade; it is only ever touched by the issue transaction.

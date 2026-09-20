-- S4 senior-review correction: a projected canonical override is public URL
-- data and therefore must fail closed in the database, not only in a future
-- admin form. Null remains the safe default.

alter table public.page_localizations
  add constraint page_localizations_canonical_override_safe
  check (
    canonical_override is null
    or (
      canonical_override = btrim(canonical_override)
      and canonical_override ~* '^https://[^[:space:]/@<>"]+(?::[0-9]{1,5})?(?:/[^[:space:]<>"'']*)?$'
    )
  );

comment on constraint page_localizations_canonical_override_safe on public.page_localizations is
  'Optional public canonical overrides must be trimmed absolute HTTPS URLs without userinfo, markup, or whitespace.';

-- S4: keep the media provenance vocabulary explicit.
-- `production_asset` is reserved for a future rights-cleared production asset;
-- it does not grant publication by itself. Eligibility still requires the
-- derivative, rights, consent, and usage checks in the publication commands.

alter table public.media_assets
  drop constraint if exists media_assets_s4_provenance_class_check,
  add constraint media_assets_s4_provenance_class_check
    check (provenance_class in (
      'client_original',
      'client_derivative',
      'production_asset',
      'concept_demo',
      'generated_reference',
      'synthetic_test'
    ));

comment on column public.media_assets.provenance_class is
  'S4 controlled provenance: client originals/derivatives and future production assets are distinct from concept, generated-reference, and synthetic media.';

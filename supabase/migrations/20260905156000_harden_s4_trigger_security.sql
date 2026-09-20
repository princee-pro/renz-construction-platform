-- S4: execute integrity triggers with their database-owner privileges.
--
-- The private schema is deliberately unavailable to API roles. Trigger
-- functions still need to call private validation helpers when a reviewed
-- command or a local service-role fixture mutates a public row. SECURITY
-- DEFINER keeps that boundary narrow; each function already pins
-- search_path = '' and uses schema-qualified references.

alter function private.validate_content_json_trigger() security definer;
alter function private.validate_page_section_trigger() security definer;
alter function private.validate_navigation_item_trigger() security definer;
alter function private.validate_navigation_localization_trigger() security definer;
alter function private.validate_public_setting_trigger() security definer;
alter function private.validate_media_asset_trigger() security definer;
alter function private.prevent_direct_project_media_promotion() security definer;
alter function private.touch_mutable_row() security definer;

comment on function private.validate_content_json_trigger() is
  'S4 owner-evaluated structured-content trigger; private schema remains unavailable to API roles.';
comment on function private.validate_page_section_trigger() is
  'S4 owner-evaluated page-section registry trigger; private schema remains unavailable to API roles.';
comment on function private.validate_navigation_item_trigger() is
  'S4 owner-evaluated navigation URL trigger; private schema remains unavailable to API roles.';
comment on function private.validate_navigation_localization_trigger() is
  'S4 owner-evaluated navigation text trigger; private schema remains unavailable to API roles.';
comment on function private.validate_public_setting_trigger() is
  'S4 owner-evaluated public-setting allow-list trigger; private schema remains unavailable to API roles.';
comment on function private.validate_media_asset_trigger() is
  'S4 owner-evaluated media metadata and rights trigger; private schema remains unavailable to API roles.';
comment on function private.prevent_direct_project_media_promotion() is
  'S4 owner-evaluated project-media promotion trigger; command marker remains required.';
comment on function private.touch_mutable_row() is
  'Owner-evaluated mutable-row trigger; the private schema remains unavailable to API roles.';

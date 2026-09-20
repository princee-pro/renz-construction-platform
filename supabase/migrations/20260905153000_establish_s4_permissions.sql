-- RENZ Phase 1 / S4: exact capability seeds for content, claims, and media.
--
-- S3 intentionally stopped before product-domain permissions. S4 adds only
-- the capabilities required by the evidence-safe editorial kernel. No role
-- receives a capability merely because a row exists in the registry.

insert into public.permissions (key, display_name, description, is_system)
values
  ('content.read', 'Read content', 'Read bounded editorial content and publication state.', true),
  ('content.write', 'Write content', 'Create and update bounded editorial content in draft state.', true),
  ('content.publish', 'Publish content', 'Run evidence-gated publication and unpublication operations.', true),
  ('content.archive', 'Archive content', 'Archive editorial records without deleting their history.', true),
  ('media.read', 'Read media', 'Read controlled editorial media metadata and private objects.', true),
  ('media.upload', 'Upload media', 'Register and upload controlled editorial media objects.', true),
  ('media.manage', 'Manage media', 'Manage media metadata, derivatives, rights, and replacements.', true),
  ('claims.verify', 'Verify claims', 'Verify or reject evidence, rights, and claim-bearing records.', true),
  ('website.manage', 'Manage website settings', 'Manage allow-listed website settings and navigation.', true)
on conflict (key) do update
set display_name = excluded.display_name,
    description = excluded.description,
    is_system = true;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.key in (
  'content.read', 'content.write', 'media.read', 'media.upload', 'media.manage'
)
where roles.key = 'admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
cross join public.permissions
where roles.key = 'super_admin'
  and permissions.key in (
    'content.read', 'content.write', 'content.publish', 'content.archive',
    'media.read', 'media.upload', 'media.manage', 'claims.verify',
    'website.manage'
  )
on conflict do nothing;

-- The S4 default-deny sweep revokes public-schema function execution before
-- it grants the S4 command surface. Restore the already-reviewed S3 facades
-- explicitly so the security contract remains monotonic across slices.
grant execute on function public.current_user_has_permission(text) to authenticated;
grant execute on function public.record_audit_event(text, text, text, text, jsonb, uuid) to authenticated;
grant execute on function public.current_user_access() to authenticated;
grant execute on function public.activate_current_profile() to authenticated;
grant execute on function public.assign_invited_admin(uuid) to authenticated;
grant execute on function public.disable_user(uuid) to authenticated;
grant execute on function public.assign_user_role(uuid, text) to authenticated;
grant execute on function public.remove_user_role(uuid, text) to authenticated;

comment on table public.permissions is
  'S3 identity/security capabilities plus the bounded S4 editorial capabilities; unknown capabilities are not implied.';

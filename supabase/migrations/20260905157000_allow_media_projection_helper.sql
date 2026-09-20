-- S4: the named public media projection needs its boolean-only usage helper.
-- This is a read predicate, not a content or Storage mutation surface.

grant execute on function private.is_public_media_usage(uuid) to anon, authenticated;

comment on function private.is_public_media_usage(uuid) is
  'Boolean-only public projection predicate for eligible project media usage; exposes no media metadata by itself.';

-- AV Flash — Phase 2 hardening, applied after Supabase's own security
-- advisor flagged two real (if low-severity) issues on the first apply to
-- the dev project:
--  1. set_updated_at() had no fixed search_path (function_search_path_mutable).
--  2. The four SECURITY DEFINER trigger functions were EXECUTE-able directly
--     by anon/authenticated via PostgREST RPC (they can't actually run that
--     way — Postgres refuses to invoke a RETURNS TRIGGER function outside a
--     trigger context — but there's no reason to leave that RPC surface
--     exposed at all). Revoking EXECUTE doesn't affect trigger firing —
--     triggers aren't invoked via a role's EXECUTE privilege.

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.set_updated_at() from public;
revoke execute on function public.enforce_same_owner() from public;
revoke execute on function public.enforce_max_images_per_side() from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_subscription_status_change() from public;

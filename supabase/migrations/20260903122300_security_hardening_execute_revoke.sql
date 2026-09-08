-- AV Flash — Phase 2 hardening, part 2. Supabase's project-level default
-- privileges grant EXECUTE on new public-schema functions directly to
-- anon/authenticated (not just PUBLIC), so revoking from PUBLIC alone
-- (20260903122200_security_hardening.sql) didn't close the advisor's
-- SECURITY DEFINER RPC-exposure warning. Revoking from anon/authenticated
-- explicitly does. This doesn't affect the triggers that call these
-- functions — trigger firing isn't gated by the calling role's EXECUTE
-- privilege on the trigger function.

revoke execute on function public.enforce_same_owner() from anon, authenticated;
revoke execute on function public.enforce_max_images_per_side() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.handle_subscription_status_change() from anon, authenticated;

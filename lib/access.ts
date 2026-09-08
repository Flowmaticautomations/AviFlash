export type AccessState = 'trial' | 'active' | 'locked';

// Deliberately typed against only the fields this function reads (not the
// full `subscriptions` row) so it stays a pure function with zero runtime
// imports — trivially unit-testable without pulling in Supabase/React Native.
export interface AccessSubscription {
  status: string;
  trial_ends_at: string;
  paid_until: string | null;
}

// "If trial is active, allow. If paid/active *and not past its paid_until*,
// allow. Otherwise lock." past_due/cancelled/expired all fall through to
// locked — see TODO_DECISIONS.md for the past_due judgment call.
//
// Phase 9: an `active` subscription with a `paid_until` in the past now
// locks, same as an expired trial — this is what makes manual/admin
// activation actually expire without someone remembering to flip `status`
// by hand. A `paid_until` of `null` is treated as still valid (nothing
// proves it's expired) rather than locked defensively — admin is expected
// to set `paid_until` when activating (see PHASE_9_MANUAL_ACTIVATION_PLAN.md
// §3/§4), so this only matters for a row that was never given one.
export function computeAccess(subscription: AccessSubscription | null): AccessState {
  if (!subscription) return 'locked';
  if (subscription.status === 'active') {
    if (subscription.paid_until && new Date(subscription.paid_until).getTime() <= Date.now()) {
      return 'locked';
    }
    return 'active';
  }
  if (subscription.status === 'trialing' && new Date(subscription.trial_ends_at).getTime() > Date.now()) {
    return 'trial';
  }
  return 'locked';
}

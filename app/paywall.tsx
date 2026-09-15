import { Banner, ScreenContainer, ScreenSubtitle, ScreenTitle, SecondaryButton } from '../components/ui';
import { useAuth } from '../lib/auth';

// AV Flash activates and renews subscriptions manually (Phase 9 — see
// PHASE_9_MANUAL_ACTIVATION_PLAN.md) rather than through an in-app purchase
// flow, so this screen is informational only: it explains *why* the student
// is locked out and that activation happens outside the app. There is no
// "Subscribe" button because there is nothing in the app for it to do yet.
export default function Paywall() {
  const { subscription, signOut } = useAuth();

  const paidUntilPassed =
    subscription?.status === 'active' &&
    !!subscription.paid_until &&
    new Date(subscription.paid_until).getTime() <= Date.now();

  const message = paidUntilPassed
    ? `Your subscription ended on ${new Date(subscription!.paid_until as string).toLocaleDateString()}.`
    : subscription?.status === 'trialing'
      ? `Your 7-day free trial ended on ${new Date(subscription.trial_ends_at).toLocaleDateString()}.`
      : subscription?.status === 'cancelled'
        ? 'Your subscription was cancelled.'
        : subscription?.status === 'expired'
          ? 'Your subscription has ended.'
          : 'Your account doesn’t have active access right now.';

  return (
    <ScreenContainer>
      <ScreenTitle>Studying is paused</ScreenTitle>
      <ScreenSubtitle>{message}</ScreenSubtitle>

      <Banner kind="info">
        AviFlash subscriptions are activated by AviFlash directly — there&apos;s no in-app checkout yet. Email{' '}
        demo@aviflash.co.za (temporary contact) to activate or renew your subscription, and you&apos;ll be
        studying again as soon as it&apos;s confirmed.
      </Banner>

      <SecondaryButton title="Log out" onPress={() => signOut()} />
    </ScreenContainer>
  );
}

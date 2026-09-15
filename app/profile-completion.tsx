import { useState } from 'react';
import { Banner, FormField, PrimaryButton, ScreenContainer, ScreenSubtitle, ScreenTitle } from '../components/ui';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export default function ProfileCompletion() {
  const { session, profile, refreshProfile } = useAuth();

  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [surname, setSurname] = useState(profile?.surname ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [country, setCountry] = useState(profile?.country ?? 'South Africa');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = 'Name is required.';
    if (!surname.trim()) next.surname = 'Surname is required.';
    if (!phone.trim()) next.phone = 'Phone number is required.';
    if (!country.trim()) next.country = 'Country is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    setError(null);
    if (!validate() || !session) return;

    setSubmitting(true);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim(),
        surname: surname.trim(),
        phone: phone.trim(),
        country: country.trim(),
        profile_completed: true,
      })
      .eq('id', session.user.id);
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    await refreshProfile();
    // Root layout guard routes to the paywall or dashboard automatically
    // once profile_completed is true.
  }

  return (
    <ScreenContainer>
      <ScreenTitle>Complete your profile</ScreenTitle>
      <ScreenSubtitle>Just a few details before you get started.</ScreenSubtitle>

      {error ? <Banner kind="error">{error}</Banner> : null}

      <FormField label="Name" value={firstName} onChangeText={setFirstName} error={errors.firstName} />
      <FormField label="Surname" value={surname} onChangeText={setSurname} error={errors.surname} />
      <FormField
        label="Phone number"
        value={phone}
        onChangeText={setPhone}
        error={errors.phone}
        keyboardType="phone-pad"
      />
      <FormField label="Country" value={country} onChangeText={setCountry} error={errors.country} />

      <PrimaryButton title="Save and continue" onPress={handleSave} loading={submitting} />
    </ScreenContainer>
  );
}

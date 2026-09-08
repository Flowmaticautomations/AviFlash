import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Banner, FormField, LinkText, PrimaryButton, ScreenContainer, ScreenSubtitle, ScreenTitle } from '../components/ui';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { isValidEmail, isValidPhone, passwordIssue } from '../lib/validation';

export default function Register() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [gradeOrYear, setGradeOrYear] = useState('');
  const [country, setCountry] = useState('South Africa');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = 'Name is required.';
    if (!surname.trim()) next.surname = 'Surname is required.';
    if (!phone.trim()) next.phone = 'Phone number is required.';
    else if (!isValidPhone(phone)) next.phone = 'Enter a valid phone number.';
    if (!email.trim()) next.email = 'Email is required.';
    else if (!isValidEmail(email)) next.email = 'Enter a valid email address.';
    const pwIssue = passwordIssue(password);
    if (pwIssue) next.password = pwIssue;
    if (!gradeOrYear.trim()) next.gradeOrYear = 'Grade or year is required.';
    if (birthYear.trim() && !/^\d{4}$/.test(birthYear.trim())) next.birthYear = 'Enter a 4-digit year.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleRegister() {
    setBanner(null);
    if (!validate()) return;

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setBanner({ kind: 'error', text: error.message });
      setSubmitting(false);
      return;
    }

    if (!data.session || !data.user) {
      // Email confirmation is on for this project — no session yet, so the
      // profile can't be updated from here (RLS needs an authenticated
      // session). The rest of these fields get collected again on first
      // login via the profile-completion screen.
      setBanner({
        kind: 'success',
        text: 'Check your email to confirm your account, then log in to finish setting up your profile.',
      });
      setSubmitting(false);
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim(),
        surname: surname.trim(),
        phone: phone.trim(),
        grade_or_year: gradeOrYear.trim(),
        country: country.trim() || 'South Africa',
        birth_year: birthYear.trim() ? Number(birthYear.trim()) : null,
        profile_completed: true,
      })
      .eq('id', data.user.id);

    if (profileError) {
      // Account exists; profile just didn't save. Profile-completion screen
      // (routed to automatically, since profile_completed is still false)
      // covers this without losing the account.
      setBanner({ kind: 'error', text: `Account created, but saving your profile failed: ${profileError.message}` });
      setSubmitting(false);
      return;
    }

    await refreshProfile();
    setSubmitting(false);
  }

  return (
    <ScreenContainer>
      <ScreenTitle>Create your account</ScreenTitle>
      <ScreenSubtitle>Start your 7-day free trial — no card required.</ScreenSubtitle>

      {banner ? <Banner kind={banner.kind}>{banner.text}</Banner> : null}

      <FormField label="Name" value={firstName} onChangeText={setFirstName} error={errors.firstName} />
      <FormField label="Surname" value={surname} onChangeText={setSurname} error={errors.surname} />
      <FormField
        label="Phone number"
        value={phone}
        onChangeText={setPhone}
        error={errors.phone}
        keyboardType="phone-pad"
      />
      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <FormField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
      />
      <FormField
        label="Birth year (optional)"
        value={birthYear}
        onChangeText={setBirthYear}
        error={errors.birthYear}
        keyboardType="number-pad"
        maxLength={4}
      />
      <FormField
        label="Grade or year of study"
        value={gradeOrYear}
        onChangeText={setGradeOrYear}
        error={errors.gradeOrYear}
        placeholder="e.g. Grade 10, 1st year"
      />
      <FormField label="Country" value={country} onChangeText={setCountry} />

      <PrimaryButton title="Register account" onPress={handleRegister} loading={submitting} />
      <LinkText onPress={() => router.push('/login')}>Already have an account? Log in</LinkText>
    </ScreenContainer>
  );
}

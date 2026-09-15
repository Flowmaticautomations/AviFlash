import * as Linking from 'expo-linking';

// Where Supabase sends the browser after a signup-confirmation or
// password-reset email link is clicked. Linking.createURL() resolves to
// whatever actually gets the user back into this running app instance --
// exp://<lan-ip>:8081/--/auth-callback in Expo Go, aviflash://auth-callback
// in a standalone/dev-client build -- instead of a hardcoded value that only
// works in one of those. Must also be added to the Supabase dashboard's
// Auth > URL Configuration > Redirect URLs allow-list, or Supabase silently
// falls back to the Site URL instead (see app/auth-callback.tsx).
export const AUTH_REDIRECT_URL = Linking.createURL('/auth-callback');

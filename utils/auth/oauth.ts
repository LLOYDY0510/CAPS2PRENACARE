/**
 * Which social sign-in buttons are live.
 *
 * Supabase has no client-side endpoint that lists the OAuth providers enabled
 * on a project, so the allow-list is supplied by configuration:
 *   NEXT_PUBLIC_OAUTH_PROVIDERS="google,github"
 *
 * When the variable is unset or empty every button renders disabled, which is
 * the correct state for a project with no provider configured.
 */

export type OAuthProviderId = 'google' | 'github';

export type OAuthProviderConfig = {
  id: OAuthProviderId;
  label: string;
  enabled: boolean;
};

const SUPPORTED_PROVIDERS: { id: OAuthProviderId; label: string }[] = [
  { id: 'google', label: 'Google' },
  { id: 'github', label: 'GitHub' },
];

export function getConfiguredOAuthProviders(): OAuthProviderConfig[] {
  const configured = new Set(
    (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? '')
      .split(',')
      .map((provider) => provider.trim().toLowerCase())
      .filter(Boolean),
  );

  return SUPPORTED_PROVIDERS.map((provider) => ({
    ...provider,
    enabled: configured.has(provider.id),
  }));
}

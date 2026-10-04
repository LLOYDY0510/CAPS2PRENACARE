/**
 * "Remember me" for the sign-in form.
 *
 * `@supabase/ssr` always persists the session in a long-lived (400 day) cookie:
 * `createStorageFromOptions` hard-codes `maxAge: DEFAULT_COOKIE_OPTIONS.maxAge`
 * on every write, so a per-login cookie lifetime cannot be requested. The only
 * way to honour an unchecked "remember me" is therefore to end the Supabase
 * session when the browser session that created it is gone.
 *
 * The decision is recorded once at sign-in:
 *   - remember = true  -> key = 'persistent' (session restored on return).
 *   - remember = false -> key = 'session' in localStorage, plus a per-tab
 *     marker in sessionStorage. Closing the browser drops the sessionStorage
 *     marker, so the next visit knows the session must be ended.
 *
 * An absent key is treated as "persistent" so accounts that signed in before
 * this behaviour existed are never signed out unexpectedly.
 *
 * The module is deliberately free of server-only imports so the guard and the
 * login form can both use it in the browser.
 */

const PERSISTENCE_KEY = 'prenatrack:session-persistence';
const TAB_MARKER_KEY = 'prenatrack:session-tab';

export function persistRememberPreference(remember: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (remember) {
      window.localStorage.setItem(PERSISTENCE_KEY, 'persistent');
      window.sessionStorage.removeItem(TAB_MARKER_KEY);
    } else {
      window.localStorage.setItem(PERSISTENCE_KEY, 'session');
      window.sessionStorage.setItem(TAB_MARKER_KEY, '1');
    }
  } catch {
    // Private-mode browsers can refuse storage access; treat that as "persist".
  }
}

export function clearRememberPreference(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PERSISTENCE_KEY);
    window.sessionStorage.removeItem(TAB_MARKER_KEY);
  } catch {
    // Ignore storage failures.
  }
}

/**
 * True only when the user asked not to be remembered and the browser session
 * that signed in no longer exists.
 */
export function shouldEndSessionOnLoad(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.localStorage.getItem(PERSISTENCE_KEY) === 'session' &&
      window.sessionStorage.getItem(TAB_MARKER_KEY) === null
    );
  } catch {
    return false;
  }
}

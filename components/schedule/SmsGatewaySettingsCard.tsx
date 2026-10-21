'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, KeyRound, LoaderCircle, Save, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { useConfirmation } from '@/components/ui/useConfirmation';

type GatewayStatus = {
  configured: boolean;
  encryptionKeyReady: boolean;
  authMode: 'token' | 'credentials' | null;
  deviceHint: string | null;
  simHint: string | null;
  updatedAt: string | null;
};

export default function SmsGatewaySettingsCard() {
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [mode, setMode] = useState<'token' | 'credentials'>('token');
  const [deviceId, setDeviceId] = useState('');
  const [simNumber, setSimNumber] = useState('');
  const [useSim, setUseSim] = useState(false);
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');
  const submitting = useRef(false);
  const { confirm, confirmation } = useConfirmation();

  const fetchSettings = useCallback(async () => {
    const response = await fetch('/api/sms/settings', { cache: 'no-store' });
    const payload = await response.json();
    if (payload.encryptionKeyReady === false) return payload;
    if (!response.ok) throw new Error(payload.error ?? 'SMS Gateway settings could not be loaded.');
    return payload;
  }, []);

  async function loadSettings() {
    try {
      const payload = await fetchSettings();
      if (payload.encryptionKeyReady === false) {
        setStatus({ configured: false, encryptionKeyReady: false, authMode: null, deviceHint: null, simHint: null, updatedAt: null });
        setError(payload.error ?? 'The server encryption key is not configured.');
        return;
      }
      const next: GatewayStatus = payload;
      setStatus(next);
      setMode(next.authMode ?? 'token');
      setUseSim(!!next.simHint);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'SMS Gateway settings could not be loaded.');
    }
  }

  useEffect(() => {
    let active = true;
    fetchSettings().then(payload => {
      if (!active) return;
      if (payload.encryptionKeyReady === false) {
        setStatus({ configured: false, encryptionKeyReady: false, authMode: null, deviceHint: null, simHint: null, updatedAt: null });
        setError(payload.error ?? 'The server encryption key is not configured.');
        return;
      }
      const next: GatewayStatus = payload;
      setStatus(next);
      setMode(next.authMode ?? 'token');
      setUseSim(!!next.simHint);
    }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : 'SMS Gateway settings could not be loaded.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchSettings]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(''); setSuccess(''); setWarning('');
    try {
      const body: Record<string, string> = { authMode: mode, deviceId };
      if (useSim) {
        if (simNumber.trim()) body.simNumber = simNumber.trim();
      } else {
        body.simNumber = '';
      }
      if (mode === 'token') body.token = token;
      else { body.username = username; body.password = password; }
      const response = await fetch('/api/sms/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'SMS Gateway settings could not be saved.');
      setToken(''); setUsername(''); setPassword(''); setDeviceId(''); setSimNumber('');
      setSuccess('SMS Gateway settings saved.');
      if (payload.warning) setWarning(payload.warning);
      await loadSettings();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'SMS Gateway settings could not be saved.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function clearSettings() {
    const approved = await confirm({ title: 'Clear SMS Gateway settings?', description: 'SMS dispatch will stop until a BHW saves valid Gateway settings again.', confirmText: 'Clear settings' });
    if (!approved || submitting.current) return;
    submitting.current = true;
    setBusy(true); setError(''); setSuccess(''); setWarning('');
    try {
      const response = await fetch('/api/sms/settings', { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'SMS Gateway settings could not be cleared.');
      setToken(''); setUsername(''); setPassword(''); setDeviceId(''); setSimNumber(''); setUseSim(false);
      setMode('token'); setSuccess('SMS Gateway settings cleared.');
      if (payload.warning) setWarning(payload.warning);
      await loadSettings();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'SMS Gateway settings could not be cleared.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const inputClass = 'mt-1.5 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3.5 text-base text-neutral-900 shadow-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100 disabled:bg-neutral-100';

  return <>
    {confirmation}
    <section aria-labelledby="sms-gateway-title" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-800" aria-hidden="true"><ShieldCheck size={22}/></span>
          <div>
            <h2 id="sms-gateway-title" className="text-lg font-bold text-neutral-950">SMS Gateway settings</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">Configure the shared Public Cloud account and sending phone. Saved credentials stay encrypted on the server and are never shown here.</p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${status?.configured ? 'border-green-200 bg-green-50 text-green-900' : 'border-neutral-300 bg-neutral-50 text-neutral-700'}`}>
          <span className={`h-2 w-2 rounded-full ${status?.configured ? 'bg-green-700' : 'bg-neutral-400'}`} aria-hidden="true"/>
          {loading ? 'Checking settings' : status?.configured ? 'Saved · not tested' : 'Not configured'}
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p>}
      {success && <p role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900"><CheckCircle2 size={18} aria-hidden="true"/>{success}</p>}
      {warning && <p role="status" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">{warning}</p>}

      {!loading && status?.configured && <p className="mt-4 text-sm text-neutral-700">Current device: <span className="font-semibold">{status.deviceHint}</span>{status.simHint ? <> · SIM: <span className="font-semibold">{status.simHint}</span></> : ' · Using the phone default SIM'} · Authentication: <span className="font-semibold">{status.authMode === 'token' ? 'API token' : 'Username and password'}</span></p>}

      <form className="mt-5 space-y-5" onSubmit={saveSettings}>
        <fieldset disabled={loading || busy || status?.encryptionKeyReady !== true} className="space-y-5 disabled:opacity-70">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-neutral-800">
              Authentication method
              <select className={inputClass} value={mode} onChange={event => setMode(event.target.value as 'token' | 'credentials')}>
                <option value="token">API token</option>
                <option value="credentials">Username and password</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-neutral-800">
              <span className="inline-flex items-center gap-2"><Smartphone size={16} aria-hidden="true"/>Device ID</span>
              <input className={inputClass} value={deviceId} onChange={event => setDeviceId(event.target.value)} autoComplete="off" maxLength={200} placeholder={status?.deviceHint ? 'Leave blank to keep current device' : 'Enter the SMS Gateway device ID'} />
              <span className="mt-1 block text-xs font-normal text-neutral-600">{status?.deviceHint ? `Saved device ${status.deviceHint}; leave blank to keep it.` : 'Find this ID in your SMS Gateway Public Cloud device list.'}</span>
            </label>
          </div>

          {mode === 'token' ? <label className="block text-sm font-semibold text-neutral-800">
            <span className="inline-flex items-center gap-2"><KeyRound size={16} aria-hidden="true"/>SMS Gateway API token</span>
            <input className={inputClass} type="password" value={token} onChange={event => setToken(event.target.value)} autoComplete="new-password" maxLength={4096} placeholder={status?.configured && status.authMode === 'token' ? 'Leave blank to keep the saved token' : 'Enter a token with messages:send and messages:read access'} />
            <span className="mt-1 block text-xs font-normal text-neutral-600">{status?.configured && status.authMode === 'token' ? 'Saved token is hidden. Enter a new one only to replace it.' : 'The token is encrypted before it is stored.'}</span>
          </label> : <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-neutral-800">
              SMS Gateway username
              <input className={inputClass} type="text" value={username} onChange={event => setUsername(event.target.value)} autoComplete="off" maxLength={320} placeholder={status?.configured && status.authMode === 'credentials' ? 'Leave blank to keep saved username' : 'Enter Public Cloud username'} />
              <span className="mt-1 block text-xs font-normal text-neutral-600">Saved username is hidden; leave blank to keep it.</span>
            </label>
            <label className="block text-sm font-semibold text-neutral-800">
              SMS Gateway password
              <input className={inputClass} type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" maxLength={2048} placeholder={status?.configured && status.authMode === 'credentials' ? 'Leave blank to keep saved password' : 'Enter Public Cloud password'} />
              <span className="mt-1 block text-xs font-normal text-neutral-600">Saved password is hidden; leave blank to keep it.</span>
            </label>
          </div>}

          <div className="max-w-sm">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-neutral-800">
              <input type="checkbox" checked={useSim} onChange={event => setUseSim(event.target.checked)} className="h-5 w-5 rounded border-neutral-400 accent-green-800"/>
              Select a specific SIM
            </label>
            {useSim && <label className="mt-2 block text-sm font-semibold text-neutral-800">
              SIM number
              <input className={inputClass} inputMode="numeric" value={simNumber} onChange={event => setSimNumber(event.target.value)} maxLength={8} placeholder={status?.simHint ? `Leave blank to keep ${status.simHint}` : 'For example, 1'} />
              <span className="mt-1 block text-xs font-normal text-neutral-600">Leave blank to keep the saved SIM. Turn off the option to use the phone default.</span>
            </label>}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-4">
            <button type="submit" disabled={busy || loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-800 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true"/> : <Save size={17} aria-hidden="true"/>}{busy ? 'Saving settings' : 'Save settings'}
            </button>
            {status?.configured && <button type="button" disabled={busy || loading} onClick={() => void clearSettings()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 text-sm font-semibold text-red-800 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"><Trash2 size={16} aria-hidden="true"/>Clear configuration</button>}
          </div>
        </fieldset>
      </form>
    </section>
  </>;
}

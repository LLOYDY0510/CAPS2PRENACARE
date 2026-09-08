'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  purok: string | null;
  pregnant_mother_id: string | null;
  created_at: string;
};

type MotherOption = {
  id: string;
  full_name: string;
  serial_no: string | null;
};

const ROLES = ['pending', 'bhw_head', 'bhw_purok', 'nurse', 'admin', 'pregnant_mother'];

export default function UserRoleEditor({
  profile,
  availableMothers,
}: {
  profile: Profile;
  availableMothers: MotherOption[];
}) {
  const supabase = createClient();
  const router   = useRouter();

  const [role, setRole]         = useState(profile.role ?? 'pending');
  const [purok, setPurok]       = useState(profile.purok ?? '');
  const [motherId, setMotherId] = useState(profile.pregnant_mother_id ?? '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const isDirty =
    role     !== (profile.role ?? 'pending') ||
    purok    !== (profile.purok ?? '') ||
    motherId !== (profile.pregnant_mother_id ?? '');

  async function handleSave() {
    if (role === 'pregnant_mother' && !motherId) {
      setError('Please select which record to link.');
      return;
    }

    setSaving(true);
    setError('');

    const selectedMother = availableMothers.find((m) => m.id === motherId);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role,
        purok:              role === 'bhw_purok'        ? purok || null    : null,
        pregnant_mother_id: role === 'pregnant_mother'  ? motherId || null : null,
        full_name:
          role === 'pregnant_mother' && selectedMother
            ? selectedMother.full_name
            : profile.full_name,
      })
      .eq('id', profile.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  return (
    <tr>
      <td style={{ color: 'var(--ink)', fontWeight: 500 }}>{profile.full_name || '—'}</td>
      <td style={{ color: 'var(--muted)' }}>{profile.email || '—'}</td>
      <td>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setError(''); }}
          className="form-select"
          style={{ width: 'auto', minWidth: '130px' }}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </td>
      <td>
        {role === 'bhw_purok' ? (
          <input
            type="text"
            value={purok}
            onChange={(e) => setPurok(e.target.value)}
            placeholder="e.g. 4"
            className="form-input"
            style={{ width: '72px' }}
          />
        ) : role === 'pregnant_mother' ? (
          <select
            value={motherId}
            onChange={(e) => setMotherId(e.target.value)}
            className="form-select"
            style={{ maxWidth: '220px' }}
          >
            <option value="">Select record…</option>
            {availableMothers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.serial_no ?? '—'} · {m.full_name}
              </option>
            ))}
          </select>
        ) : (
          <span style={{ color: 'var(--muted-2)' }}>—</span>
        )}
      </td>
      <td style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
        {new Date(profile.created_at).toLocaleDateString()}
      </td>
      <td style={{ textAlign: 'right' }}>
        {error && (
          <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginBottom: '0.25rem' }}>
            {error}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="btn-primary"
          style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </td>
    </tr>
  );
}

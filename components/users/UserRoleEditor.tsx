'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { USER_ROLES } from '@/utils/auth/role-constants';
import { Check } from 'lucide-react';

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

const ROLE_LABELS: Record<string, string> = {
  pending: 'Pending',
  bhw_head: 'BHW Head',
  bhw_purok: 'BHW (Purok)',
  nurse: 'Nurse',
  admin: 'Admin',
  pregnant_mother: 'Pregnant Mother',
};

export default function UserRoleEditor({
  profile,
  availableMothers,
}: {
  profile: Profile;
  availableMothers: MotherOption[];
}) {
  const router = useRouter();

  const [role, setRole] = useState(profile.role ?? 'pending');
  const [purok, setPurok] = useState(profile.purok ?? '');
  const [motherId, setMotherId] = useState(profile.pregnant_mother_id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedMother = availableMothers.find((mother) => mother.id === motherId);

  const isDirty =
    role !== (profile.role ?? 'pending') ||
    purok !== (profile.purok ?? '') ||
    motherId !== (profile.pregnant_mother_id ?? '');

  async function handleSave() {
    setError('');
    setNotice('');

    if (role === 'pregnant_mother' && !motherId) {
      setError('Please select which record to link.');
      return;
    }
    if (role === 'bhw_purok' && !purok.trim()) {
      setError('A BHW (Purok) must be assigned to a purok.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          role,
          purok: role === 'bhw_purok' ? purok.trim() || null : null,
          pregnantMotherId: role === 'pregnant_mother' ? motherId || null : null,
          fullName:
            role === 'pregnant_mother' && selectedMother
              ? selectedMother.full_name
              : profile.full_name ?? undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? 'Failed to update the account.');
        return;
      }

      setNotice('Saved.');
      // Advisories only; a failure here must not look like a failed save.
      await Promise.allSettled([
        fetch('/api/notifications/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'role_alert',
            recipientUserId: profile.id,
            title: 'Account access updated',
            message: `Your Prenatrack role is now ${role.replace(/_/g, ' ')}${
              role === 'bhw_purok' && purok ? ` for Purok ${purok}` : ''
            }.`,
          }),
        }),
        fetch('/api/notifications/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'role_alert',
            recipientRole: 'admin',
            title: 'Staff account updated',
            message: `${profile.full_name || profile.email || 'A user'} was assigned the ${role.replace(/_/g, ' ')} role.`,
          }),
        }),
      ]);

      router.refresh();
    } catch {
      setError('Network error while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="px-6 py-4">
        <div className="font-semibold text-slate-800">
          {profile.full_name || '—'}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-slate-600">
          {profile.email || '—'}
        </div>
      </td>
      <td className="px-6 py-4">
        <label className="sr-only" htmlFor={`role-${profile.id}`}>
          Role for {profile.full_name || profile.email}
        </label>
        <select
          id={`role-${profile.id}`}
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setError('');
            setNotice('');
          }}
          className="form-select"
          style={{ width: 'auto', minWidth: '150px' }}
        >
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r] ?? r}
            </option>
          ))}
        </select>
      </td>
      <td className="px-6 py-4">
        {role === 'bhw_purok' ? (
          <>
            <label className="sr-only" htmlFor={`purok-${profile.id}`}>
              Purok for {profile.full_name || profile.email}
            </label>
            <input
              id={`purok-${profile.id}`}
              type="text"
              inputMode="numeric"
              value={purok}
              onChange={(e) => setPurok(e.target.value)}
              placeholder="e.g. 4"
              className="form-input"
              style={{ width: '84px' }}
            />
          </>
        ) : role === 'pregnant_mother' ? (
          <>
            <label className="sr-only" htmlFor={`mother-${profile.id}`}>
              Linked record for {profile.full_name || profile.email}
            </label>
            <select
              id={`mother-${profile.id}`}
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
          </>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-slate-500">
          {new Date(profile.created_at).toLocaleDateString()}
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex flex-col items-end gap-1.5">
          {error && (
            <p className="text-xs text-red-600 font-medium" role="alert">
              {error}
            </p>
          )}
          {notice && !error && (
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1" role="status">
              <Check size={12} />
              {notice}
            </p>
          )}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isDirty || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </td>
    </tr>
  );
}

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
  const router = useRouter();
 
  const [role, setRole] = useState(profile.role ?? 'pending');
  const [purok, setPurok] = useState(profile.purok ?? '');
  const [motherId, setMotherId] = useState(profile.pregnant_mother_id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
 
  const isDirty =
    role !== (profile.role ?? 'pending') ||
    purok !== (profile.purok ?? '') ||
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
        purok: role === 'bhw_purok' ? purok || null : null,
        pregnant_mother_id: role === 'pregnant_mother' ? motherId || null : null,
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
    <tr className="border-b last:border-0">
      <td className="px-4 py-3 font-medium">{profile.full_name || '—'}</td>
      <td className="px-4 py-3 text-muted">{profile.email || '—'}</td>
      <td className="px-4 py-3">
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setError('');
          }}
          className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        {role === 'bhw_purok' ? (
          <input
            type="text"
            value={purok}
            onChange={(e) => setPurok(e.target.value)}
            placeholder="e.g. 4"
            className="w-16 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        ) : role === 'pregnant_mother' ? (
          <select
            value={motherId}
            onChange={(e) => setMotherId(e.target.value)}
            className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand max-w-[220px]"
          >
            <option value="">Select record...</option>
            {availableMothers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.serial_no ?? '—'} · {m.full_name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-muted-2">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-muted text-xs">
        {new Date(profile.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="bg-brand text-white px-3 py-1.5 rounded-lg text-xs hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  );
}
 
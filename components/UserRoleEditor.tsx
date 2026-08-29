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
  created_at: string;
};
 
const ROLES = ['pending', 'bhw_head', 'bhw_purok', 'nurse', 'admin'];
 
export default function UserRoleEditor({ profile }: { profile: Profile }) {
  const supabase = createClient();
  const router = useRouter();
 
  const [role, setRole] = useState(profile.role ?? 'pending');
  const [purok, setPurok] = useState(profile.purok ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
 
  const isDirty = role !== (profile.role ?? 'pending') || purok !== (profile.purok ?? '');
 
  async function handleSave() {
    setSaving(true);
    setError('');
 
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role,
        purok: role === 'bhw_purok' ? purok || null : null,
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
          onChange={(e) => setRole(e.target.value)}
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
 
'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import SearchBar from '@/components/ui/SearchBar';

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  purok: string | null;
};

export default function BhwTable({
  initialUsers,
  countsByPurok,
}: {
  initialUsers: UserRow[];
  countsByPurok: Record<string, number>;
}) {
  const supabase = createClient();
  const [users, setUsers] = useState(initialUsers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  async function promoteToBhw(id: string) {
    setSavingId(id);
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'bhw_purok' })
      .eq('id', id);

    if (!error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role: 'bhw_purok' } : u))
      );
    }
    setSavingId(null);
  }

  async function demoteToPending(id: string) {
    const confirmed = window.confirm(
      'Remove this BHW? They will be set back to pending and lose their purok assignment.'
    );
    if (!confirmed) return;

    setSavingId(id);
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'pending', purok: null })
      .eq('id', id);

    if (!error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role: 'pending', purok: null } : u))
      );
    }
    setSavingId(null);
  }

  async function saveAssignment(id: string, purok: string) {
    setSavingId(id);
    await supabase.from('profiles').update({ purok }).eq('id', id);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, purok } : u)));
    setSavingId(null);
  }

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.full_name ?? '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.purok ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or purok…"
        />
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)' }}>
          {filteredUsers.length} of {users.length} users
        </span>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name / Email</th>
              <th>Role</th>
              <th>Purok</th>
              <th>Workload</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-2)' }}>
                  No matching users found.
                </td>
              </tr>
            )}
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <p style={{ fontWeight: 500, color: 'var(--ink)' }}>{user.full_name || 'No name set'}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{user.email}</p>
                </td>
                <td>
                  <span className={user.role === 'bhw_purok' ? 'badge-low' : 'badge-warning'}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <input
                    type="text"
                    defaultValue={user.purok ?? ''}
                    placeholder="e.g. 1"
                    className="form-input"
                    style={{ width: '72px' }}
                    onBlur={(e) => saveAssignment(user.id, e.target.value)}
                  />
                </td>
                <td>
                  {user.purok ? (
                    <span style={{ color: 'var(--muted)' }}>
                      {countsByPurok[user.purok] ?? 0}{' '}
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted-2)' }}>mothers</span>
                    </span>
                  ) : (
                    <span style={{ color: 'var(--muted-2)' }}>—</span>
                  )}
                </td>
                <td>
                  {user.role === 'pending' ? (
                    <button
                      onClick={() => promoteToBhw(user.id)}
                      disabled={savingId === user.id}
                      className="btn-primary"
                      style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
                    >
                      {savingId === user.id ? 'Saving…' : 'Make BHW'}
                    </button>
                  ) : (
                    <button
                      onClick={() => demoteToPending(user.id)}
                      disabled={savingId === user.id}
                      className="btn-danger"
                      style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
                    >
                      {savingId === user.id ? 'Removing…' : 'Remove'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
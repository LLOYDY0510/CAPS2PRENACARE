'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

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
      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or purok..."
          className="w-full max-w-sm border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">Name / Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Purok</th>
              <th className="px-4 py-3">Workload</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No matching users found.
                </td>
              </tr>
            )}
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{user.full_name || 'No name set'}</p>
                  <p className="text-gray-500 text-xs">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'bhw_purok'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    defaultValue={user.purok ?? ''}
                    placeholder="e.g. 1"
                    className="border rounded-lg px-2 py-1 w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onBlur={(e) => saveAssignment(user.id, e.target.value)}
                  />
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {user.purok ? (
                    <span>
                      {countsByPurok[user.purok] ?? 0}{' '}
                      <span className="text-gray-400 text-xs">mothers</span>
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 space-x-3">
                  {user.role === 'pending' ? (
                    <button
                      onClick={() => promoteToBhw(user.id)}
                      disabled={savingId === user.id}
                      className="text-blue-600 hover:underline text-sm disabled:opacity-50"
                    >
                      {savingId === user.id ? 'Saving...' : 'Make BHW'}
                    </button>
                  ) : (
                    <button
                      onClick={() => demoteToPending(user.id)}
                      disabled={savingId === user.id}
                      className="text-red-600 hover:underline text-sm disabled:opacity-50"
                    >
                      {savingId === user.id ? 'Removing...' : 'Remove'}
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
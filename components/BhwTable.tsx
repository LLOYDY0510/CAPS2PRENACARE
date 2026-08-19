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

export default function BhwTable({ initialUsers }: { initialUsers: UserRow[] }) {
  const supabase = createClient();
  const [users, setUsers] = useState(initialUsers);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function updatePurok(id: string, purok: string) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, purok } : u)));
  }

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

  async function saveAssignment(id: string, purok: string) {
    setSavingId(id);
    await supabase.from('profiles').update({ purok }).eq('id', id);
    setSavingId(null);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b text-left text-gray-500">
          <tr>
            <th className="px-4 py-3">Name / Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Purok</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                No BHW or pending users found.
              </td>
            </tr>
          )}
          {users.map((user) => (
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
              <td className="px-4 py-3">
                {user.role === 'pending' ? (
                  <button
                    onClick={() => promoteToBhw(user.id)}
                    disabled={savingId === user.id}
                    className="text-blue-600 hover:underline text-sm disabled:opacity-50"
                  >
                    {savingId === user.id ? 'Saving...' : 'Make BHW'}
                  </button>
                ) : (
                  <span className="text-gray-400 text-sm">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
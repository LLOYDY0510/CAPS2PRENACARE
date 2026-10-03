'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [draftPurok, setDraftPurok] = useState<Record<string, string>>({});

  // Account changes always go through the admin API: the browser session has no
  // write access to public.profiles, and role changes must be validated there.
  async function updateAccount(
    id: string,
    payload: Record<string, string | null>,
    savingLabel: string
  ): Promise<boolean> {
    setSavingId(id);
    setError(null);
    setDraftPurok((prev) => ({ ...prev, [id]: savingLabel }));
    try {
      const response = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, ...payload }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? 'Failed to save the account.');
        return false;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...(result.profile ?? payload) } : u))
      );
      router.refresh();
      return true;
    } catch {
      setError('Network error while saving. Please try again.');
      return false;
    } finally {
      setSavingId(null);
      setDraftPurok((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  async function promoteToBhw(id: string) {
    const purok = (draftPurok[id] ?? users.find((u) => u.id === id)?.purok ?? '').trim();
    if (!purok) {
      setError('Enter a purok first — a BHW (Purok) must be assigned to one purok.');
      return;
    }
    await updateAccount(id, { role: 'bhw_purok', purok }, '');
  }

  async function demoteToPending(id: string) {
    const confirmed = window.confirm(
      'Remove this BHW? They will be set back to pending and lose their purok assignment.'
    );
    if (!confirmed) return;
    await updateAccount(id, { role: 'pending', purok: null }, '');
  }

  async function saveAssignment(id: string) {
    const purok = (draftPurok[id] ?? '').trim();
    await updateAccount(id, { purok: purok || null }, '');
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
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or purok…"
        />
        <span className="ml-auto text-xs text-muted">
          {filteredUsers.length} of {users.length} users
        </span>
      </div>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
        </div>
      )}

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
                <td colSpan={5} className="text-center py-8 text-muted-2">
                  No matching users found.
                </td>
              </tr>
            )}
            {filteredUsers.map((user) => {
              const isSaving = savingId === user.id;
              const isBhw = user.role === 'bhw_purok';
              return (
                <tr key={user.id}>
                  <td data-label="Name / Email">
                    <p className="font-medium text-ink">{user.full_name || 'No name set'}</p>
                    <p className="text-xs text-muted">{user.email}</p>
                  </td>
                  <td data-label="Role">
                    <span className={isBhw ? 'badge-low' : 'badge-warning'}>
                      {user.role === 'bhw_purok' ? 'BHW (Purok)' : user.role}
                    </span>
                  </td>
                  <td data-label="Purok">
                    <label className="sr-only" htmlFor={`purok-${user.id}`}>
                      Purok for {user.full_name || user.email}
                    </label>
                    <input
                      id={`purok-${user.id}`}
                      type="text"
                      inputMode="numeric"
                      value={draftPurok[user.id] ?? user.purok ?? ''}
                      placeholder="e.g. 1"
                      className="form-input"
                      style={{ width: '84px' }}
                      disabled={isSaving}
                      onChange={(e) =>
                        setDraftPurok((prev) => ({ ...prev, [user.id]: e.target.value }))
                      }
                      onBlur={() => {
                        if ((draftPurok[user.id] ?? user.purok ?? '') !== (user.purok ?? '')) {
                          void saveAssignment(user.id);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void saveAssignment(user.id);
                        }
                      }}
                    />
                    {isSaving && <span className="ml-2 text-xs text-muted">Saving…</span>}
                  </td>
                  <td data-label="Workload">
                    {user.purok ? (
                      <span className="text-muted">
                        {countsByPurok[user.purok] ?? 0}{' '}
                        <span className="text-xs text-muted-2">mothers</span>
                      </span>
                    ) : (
                      <span className="text-muted-2">Not assigned</span>
                    )}
                  </td>
                  <td data-label="Action">
                    {user.role === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => void promoteToBhw(user.id)}
                        disabled={isSaving}
                        className="btn-primary"
                      >
                        {isSaving ? 'Saving…' : 'Make BHW'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void demoteToPending(user.id)}
                        disabled={isSaving}
                        className="btn-danger"
                      >
                        {isSaving ? 'Saving…' : 'Remove'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

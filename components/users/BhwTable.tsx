'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/ui/SearchBar';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { UserMinus, UserCheck, Loader2 } from 'lucide-react';

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  purok: string | null;
};

const PAGE_SIZE = 10;

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
  const [currentPage, setCurrentPage] = useState(1);
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

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      return (
        (u.full_name ?? '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.purok ?? '').toLowerCase().includes(q) ||
        (u.purok ? `zone ${u.purok.toLowerCase()}` : '').includes(q)
      );
    });
  }, [users, search]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or purok…"
        />
        <span className="ml-auto text-xs text-slate-500 font-medium">
          {filteredUsers.length} of {users.length} users
        </span>
      </div>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden p-6 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/60 bg-slate-50/50">
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Name / Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Purok</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Workload</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={UserCheck}
                      title="No matching users found"
                      description="Try adjusting your search criteria."
                    />
                  </td>
                </tr>
              )}
              {paginatedUsers.map((user) => {
                const isSaving = savingId === user.id;
                const isBhw = user.role === 'bhw_purok';
                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{user.full_name || 'No name set'}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        isBhw
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {user.role === 'bhw_purok' ? 'BHW (Purok)' : user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <label className="sr-only" htmlFor={`purok-${user.id}`}>
                        Purok for {user.full_name || user.email}
                      </label>
                      <div className="flex items-center gap-2">
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
                        {isSaving && <Loader2 size={14} className="text-slate-400 animate-spin" />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.purok ? (
                        <span className="text-slate-600 font-medium">
                          {countsByPurok[user.purok] ?? 0}{' '}
                          <span className="text-xs text-slate-400 font-normal">mothers</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.role === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => void promoteToBhw(user.id)}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              Saving…
                            </>
                          ) : (
                            <>
                              <UserCheck size={12} />
                              Make BHW
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void demoteToPending(user.id)}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              Saving…
                            </>
                          ) : (
                            <>
                              <UserMinus size={12} />
                              Remove
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Component */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredUsers.length}
          itemsPerPage={PAGE_SIZE}
        />
      </div>
    </div>
  );
}

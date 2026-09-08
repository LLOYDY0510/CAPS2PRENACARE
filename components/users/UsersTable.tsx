'use client';

import { useState, useMemo } from 'react';
import SearchBar from '@/components/ui/SearchBar';
import UserRoleEditor from '@/components/users/UserRoleEditor';

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
  pending:          'Pending',
  bhw_head:         'BHW Head',
  bhw_purok:        'BHW (Purok)',
  nurse:            'Nurse',
  admin:            'Admin',
  pregnant_mother:  'Pregnant Mother',
};

export default function UsersTable({
  profiles,
  availableMothers,
  allMothers,
}: {
  profiles: Profile[];
  availableMothers: MotherOption[];
  allMothers: MotherOption[];
}) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Distinct roles in data
  const roles = useMemo(() => {
    const set = new Set(profiles.map((p) => p.role ?? 'pending'));
    return Array.from(set).sort();
  }, [profiles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter((p) => {
      if (roleFilter !== 'all' && (p.role ?? 'pending') !== roleFilter) return false;
      if (q) {
        const matchName  = (p.full_name ?? '').toLowerCase().includes(q);
        const matchEmail = (p.email ?? '').toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }
      return true;
    });
  }, [profiles, search, roleFilter]);

  const hasFilters = search || roleFilter !== 'all';

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email…"
        />

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="form-select"
          style={{ width: 'auto', minWidth: '140px' }}
          aria-label="Filter by role"
        >
          <option value="all">All Roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setRoleFilter('all'); }}
            className="btn-ghost"
            style={{ fontSize: '0.75rem' }}
          >
            Clear filters
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)' }}>
          {filtered.length} of {profiles.length} accounts
        </span>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table whitespace-nowrap">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Purok / Linked Record</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-2)' }}>
                  {hasFilters ? 'No accounts match the current filters.' : 'No user accounts found.'}
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <UserRoleEditor
                key={p.id}
                profile={p}
                availableMothers={
                  p.pregnant_mother_id
                    ? [
                        ...availableMothers,
                        ...(allMothers.filter((m) => m.id === p.pregnant_mother_id)),
                      ]
                    : availableMothers
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

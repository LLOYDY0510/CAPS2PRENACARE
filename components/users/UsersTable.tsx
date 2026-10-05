'use client';

import { useState, useMemo } from 'react';
import SearchBar from '@/components/ui/SearchBar';
import UserRoleEditor from '@/components/users/UserRoleEditor';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { X, Users } from 'lucide-react';

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

const PAGE_SIZE = 10;

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
  const [currentPage, setCurrentPage] = useState(1);

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
        const matchPurok = (p.purok ?? '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPurok) return false;
      }
      return true;
    });
  }, [profiles, search, roleFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const page = Math.min(currentPage, totalPages);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const hasFilters = search || roleFilter !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <SearchBar
          value={search}
          onChange={(val) => { setSearch(val); setCurrentPage(1); }}
          placeholder="Search by name or email…"
        />

        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
          className="form-select"
          style={{ width: 'auto', minWidth: '160px' }}
          aria-label="Filter by role"
        >
          <option value="all">All Roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setRoleFilter('all'); setCurrentPage(1); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <X size={14} />
            Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-slate-500 font-medium">
          {filtered.length} of {profiles.length} accounts
        </span>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden p-6 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/60 bg-slate-50/50">
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Purok / Linked Record</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Users}
                      title={hasFilters ? 'No accounts match filters' : 'No user accounts found'}
                      description={hasFilters ? 'Try adjusting your search or filter criteria.' : 'When users register, they will appear here.'}
                    />
                  </td>
                </tr>
              )}
              {paginated.map((p) => (
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

        {/* Pagination Component */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filtered.length}
          itemsPerPage={PAGE_SIZE}
        />
      </div>
    </div>
  );
}

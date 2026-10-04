'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/ui/SearchBar';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import { prenatalStatusLabel, type PrenatalVisitStatus } from '@/utils/prenatalStatus';
import { ChevronRight } from 'lucide-react';

export type CheckupRecord = {
  id: string;
  serial_no: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  purok: string | null;
  edd: string | null;
  checkupCount: number;
  trimesterStatuses: Record<'1st' | '2nd' | '3rd', PrenatalVisitStatus | null>;
};

const PAGE_SIZE = 10;

export default function CheckupsTable({ records }: { records: CheckupRecord[] }) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const name = [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ').toLowerCase();
      return (
        name.includes(q) ||
        (r.serial_no ?? '').toLowerCase().includes(q) ||
        (r.purok ?? '').toLowerCase().includes(q) ||
        (r.purok ? `zone ${r.purok.toLowerCase()}` : '').includes(q)
      );
    });
  }, [records, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  return (
    <div className="space-y-4">
      {/* Search Card */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-lg shadow-slate-200/40 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search by name, serial no, or zone..."
          />
        </div>
        <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
          {filtered.length} of {records.length} mothers
        </span>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 overflow-hidden">
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Serial No.</th>
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Purok / Zone</th>
                <th className="py-3.5 px-4">EDC</th>
                <th className="py-3.5 px-4">Completed Visits</th>
                <th className="py-3.5 px-4">1st Tri</th>
                <th className="py-3.5 px-4">2nd Tri</th>
                <th className="py-3.5 px-4">3rd Tri</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400 font-medium">
                    {search ? 'No records match your search.' : 'No pregnant mothers registered yet.'}
                  </td>
                </tr>
              )}
              {paginated.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-500">{r.serial_no ?? '—'}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {[r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">{r.purok ? `Zone ${r.purok}` : '—'}</td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">{r.edd ?? '—'}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${r.checkupCount > 0 ? 'bg-teal-50 text-[var(--brand)]' : 'bg-slate-100 text-slate-400'}`}>
                      {r.checkupCount} visits
                    </span>
                  </td>
                  {(['1st', '2nd', '3rd'] as const).map((trimester) => {
                    const status = r.trimesterStatuses[trimester];
                    const statusColor =
                      status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : status === 'missed'
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200';
                    return (
                      <td key={trimester} className="py-3.5 px-4">
                        {status ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColor}`}>
                            {prenatalStatusLabel(status)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-3.5 px-4 text-right">
                    <Link href={`/dashboard/pregnant/${r.id}?view=checkups`}>
                      <Button variant="secondary" size="sm" rightIcon={<ChevronRight size={14} />}>
                        View Checkups
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Component */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filtered.length}
          itemsPerPage={PAGE_SIZE}
        />
      </div>
    </div>
  );
}

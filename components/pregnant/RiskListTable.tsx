'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/ui/SearchBar';

export type RiskRecord = {
  id: string;
  serial_no: string | null;
  full_name: string | null;
  purok: string | null;
  age: number | null;
  contact_number: string | null;
  risk_level: string | null;
};

export default function RiskListTable({
  records,
  isHigh,
}: {
  records: RiskRecord[];
  isHigh: boolean;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      (r.full_name ?? '').toLowerCase().includes(q) ||
      (r.purok ? `zone ${r.purok}` : '').includes(q) ||
      (r.purok ?? '').includes(q) ||
      (r.serial_no ?? '').toLowerCase().includes(q)
    );
  }, [records, search]);

  return (
    <div>
      {/* Search bar */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, serial, or zone…"
        />
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)' }}>
          {filtered.length} of {records.length} records
        </span>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table whitespace-nowrap">
          <thead>
            <tr>
              <th>Serial No.</th>
              <th>Name</th>
              <th>Zone</th>
              <th>Age</th>
              <th>Contact Number</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-2)' }}>
                  {search
                    ? 'No records match your search.'
                    : `No ${isHigh ? 'high' : 'low'} risk records found.`}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.serial_no ?? '—'}</td>
                <td style={{ color: 'var(--ink)', fontWeight: 500 }}>{r.full_name ?? '—'}</td>
                <td>{r.purok ? `Zone ${r.purok}` : 'Unassigned'}</td>
                <td>{r.age ?? '—'}</td>
                <td>{r.contact_number ?? '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  <Link
                    href={`/dashboard/pregnant/${r.id}`}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

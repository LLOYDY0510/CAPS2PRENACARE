'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/ui/SearchBar';

export type CheckupRecord = {
  id: string;
  serial_no: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  purok: string | null;
  edd: string | null;
  checkupCount: number;
};

export default function CheckupsTable({ records }: { records: CheckupRecord[] }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const name = [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ').toLowerCase();
      return (
        name.includes(q) ||
        (r.serial_no ?? '').toLowerCase().includes(q) ||
        (r.purok ?? '').toLowerCase().includes(q)
      );
    });
  }, [records, search]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, serial, or purok…"
        />
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)' }}>
          {filtered.length} of {records.length} mothers
        </span>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Serial No.</th>
              <th>Name</th>
              <th>Purok</th>
              <th>EDC</th>
              <th>Checkups Recorded</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-2)' }}>
                  {search ? 'No records match your search.' : 'No pregnant mothers registered yet.'}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.serial_no ?? '—'}</td>
                <td style={{ color: 'var(--ink)', fontWeight: 500 }}>
                  {[r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ') || '—'}
                </td>
                <td>{r.purok ?? '—'}</td>
                <td>{r.edd ?? '—'}</td>
                <td>
                  <span
                    style={{
                      fontWeight: r.checkupCount > 0 ? 600 : 400,
                      color: r.checkupCount > 0 ? 'var(--brand)' : 'var(--muted-2)',
                    }}
                  >
                    {r.checkupCount}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Link
                    href={`/dashboard/pregnant/${r.id}`}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                  >
                    View Checkups
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

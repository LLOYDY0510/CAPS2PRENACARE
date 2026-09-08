'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/ui/SearchBar';
import DeleteRecordButton from '@/components/pregnant/DeleteRecordButton';

export type PregnantRecord = {
  id: string;
  serial_no: string | null;
  date_registered: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  address: string | null;
  age: number | null;
  lmp: string | null;
  gravida_para: string | null;
  edd: string | null;
  blood_pressure: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  risk_level: string | null;
};

export default function PregnantRecordsTable({
  records,
  canEdit,
}: {
  records: PregnantRecord[];
  canEdit: boolean;
}) {
  const [search, setSearch]   = useState('');
  const [zone, setZone]       = useState('all');
  const [risk, setRisk]       = useState('all');

  // Derive distinct zones from records
  const zones = useMemo(() => {
    const set = new Set(records.map((r) => r.address).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const name = [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ').toLowerCase();
      const serial = (r.serial_no ?? '').toLowerCase();
      if (q && !name.includes(q) && !serial.includes(q)) return false;
      if (zone !== 'all' && r.address !== zone) return false;
      if (risk !== 'all' && r.risk_level !== risk) return false;
      return true;
    });
  }, [records, search, zone, risk]);

  const hasFilters = search || zone !== 'all' || risk !== 'all';

  return (
    <div>
      {/* Filter bar */}
      <div
        className="flex flex-wrap gap-2 mb-4 items-center"
        style={{ rowGap: '0.5rem' }}
      >
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name or serial no."
        />

        <select
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          className="form-select"
          style={{ width: 'auto', minWidth: '130px' }}
          aria-label="Filter by risk level"
        >
          <option value="all">All Risk Levels</option>
          <option value="high">High Risk</option>
          <option value="low">Low Risk</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setZone('all'); setRisk('all'); }}
            className="btn-ghost"
            style={{ fontSize: '0.75rem' }}
          >
            Clear filters
          </button>
        )}

        <span
          style={{
            marginLeft: 'auto',
            fontSize: '0.75rem',
            color: 'var(--muted)',
            whiteSpace: 'nowrap',
          }}
        >
          {filtered.length} of {records.length} records
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="data-table whitespace-nowrap">
          <thead>
            <tr>
              <th>Serial No.</th>
              <th>Date Registered</th>
              <th>Name</th>
              <th>Address</th>
              <th>Age</th>
              <th>LMP</th>
              <th>G-P</th>
              <th>EDC</th>
              <th>BP</th>
              <th>Height (cm)</th>
              <th>Weight (kg)</th>
              <th>Risk</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={13}
                  style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-2)' }}
                >
                  {hasFilters ? 'No records match the current filters.' : 'No pregnant mothers registered yet.'}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.serial_no ?? '—'}</td>
                <td>{r.date_registered ?? '—'}</td>
                <td style={{ color: 'var(--ink)', fontWeight: 500 }}>
                  {[r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ') || '—'}
                </td>
                <td>{r.address ?? '—'}</td>
                <td>{r.age ?? '—'}</td>
                <td>{r.lmp ?? '—'}</td>
                <td>{r.gravida_para ?? '—'}</td>
                <td>{r.edd ?? '—'}</td>
                <td>{r.blood_pressure ?? '—'}</td>
                <td>{r.height_cm ?? '—'}</td>
                <td>{r.weight_kg ?? '—'}</td>
                <td>
                  {r.risk_level === 'high'
                    ? <span className="badge-high">High Risk</span>
                    : <span className="badge-low">Low Risk</span>}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Link
                    href={`/dashboard/pregnant/${r.id}`}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                  >
                    View
                  </Link>
                  {canEdit && (
                    <span style={{ marginLeft: '0.5rem' }}>
                      <DeleteRecordButton id={r.id} />
                    </span>
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

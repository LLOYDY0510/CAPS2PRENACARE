'use client';

import { useState, useMemo, useRef } from 'react';
import SearchBar from '@/components/ui/SearchBar';
import ReportExport, { type ReportRow } from '@/components/reports/ReportExport';

/* ─── Extended row type (id is internal only, not exported) ─── */
export type ReportRowWithId = ReportRow & { _id: string };

export type RowMeta = {
  checkupCount: number;
  nextVisit: string | null;
};

/* ─── Report type definitions ─── */
type ReportType =
  | 'all'
  | 'high_risk'
  | 'low_risk'
  | 'missed_checkups'
  | 'upcoming_edc';

const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  {
    value: 'all',
    label: 'All Records',
    description: 'Complete registry of all registered pregnant mothers.',
  },
  {
    value: 'high_risk',
    label: 'High Risk',
    description: 'Mothers currently flagged as high risk.',
  },
  {
    value: 'low_risk',
    label: 'Low Risk',
    description: 'Mothers currently classified as low risk.',
  },
  {
    value: 'missed_checkups',
    label: 'Missed Checkups',
    description: 'Mothers with no prenatal checkup recorded yet.',
  },
  {
    value: 'upcoming_edc',
    label: 'Upcoming EDC (30 days)',
    description: 'Mothers whose expected delivery date falls within the next 30 days.',
  },
];

/* ─── Date helpers ─── */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysFromToday(dateStr: string): number {
  const d = new Date(dateStr);
  const t = new Date(today());
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}
function printDate(): string {
  return new Date().toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function ReportsTable({
  rowsWithId,
  meta,
}: {
  rowsWithId: ReportRowWithId[];
  meta: Record<string, RowMeta>;
}) {
  const [reportType, setReportType] = useState<ReportType>('all');
  const [search, setSearch]         = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const printRef = useRef<HTMLDivElement>(null);

  /* ── Distinct zones ── */
  const zones = useMemo(() => {
    const set = new Set(rowsWithId.map((r) => r.purok).filter(Boolean) as string[]);
    return Array.from(set).sort((a, b) => parseInt(a) - parseInt(b));
  }, [rowsWithId]);

  /* ── Primary filter by report type ── */
  const byType = useMemo(() => {
    const t = today();
    return rowsWithId.filter((r) => {
      switch (reportType) {
        case 'high_risk':
          return r.risk_level === 'high';
        case 'low_risk':
          return r.risk_level === 'low';
        case 'missed_checkups':
          return (meta[r._id]?.checkupCount ?? 0) === 0;
        case 'upcoming_edc':
          if (!r.edd) return false;
          const days = daysFromToday(r.edd);
          return days >= 0 && days <= 30;
        default:
          return true;
      }
    });
  }, [rowsWithId, reportType, meta]);

  /* ── Secondary: search + zone ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return byType.filter((r) => {
      if (zoneFilter !== 'all' && r.purok !== zoneFilter) return false;
      if (q) {
        const matchName   = (r.name ?? '').toLowerCase().includes(q);
        const matchSerial = String(r.serial_no ?? '').toLowerCase().includes(q);
        if (!matchName && !matchSerial) return false;
      }
      return true;
    });
  }, [byType, search, zoneFilter]);

  /* ── Summary stats (over primary filter, ignore search/zone) ── */
  const stats = useMemo(() => ({
    total:    byType.length,
    highRisk: byType.filter((r) => r.risk_level === 'high').length,
    lowRisk:  byType.filter((r) => r.risk_level === 'low').length,
    noCheckup: byType.filter((r) => (meta[r._id]?.checkupCount ?? 0) === 0).length,
  }), [byType, meta]);

  const activeReportDef = REPORT_TYPES.find((t) => t.value === reportType)!;
  const hasSecondary    = search || zoneFilter !== 'all';

  /* ── Export rows = filtered (what user sees) ── */
  const exportRows: ReportRow[] = filtered.map(({ _id, ...rest }) => rest);

  /* ── Print ── */
  function handlePrint() {
    window.print();
  }

  return (
    <div>
      {/* ════════════════════════════════════
          SCREEN: controls + header
          (hidden when printing)
          ════════════════════════════════════ */}
      <div className="no-print">
        {/* Page header */}
        <div
          className="flex flex-wrap items-start justify-between gap-4 mb-5"
          style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}
        >
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1>Reports</h1>
            <p className="page-date">
              Generate and export the pregnant mothers registry.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="btn-secondary" style={{ gap: '0.375rem' }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                className="w-3.5 h-3.5" aria-hidden>
                <path d="M4 6V1h8v5"/>
                <path d="M4 11H2a1 1 0 01-1-1V7a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-1 1h-2"/>
                <rect x="4" y="9" width="8" height="6" rx="0.5"/>
                <path d="M4 3h5" strokeLinecap="round"/>
              </svg>
              Print Report
            </button>
            <ReportExport records={exportRows} />
          </div>
        </div>

        {/* ── Report type selector ── */}
        <div className="mb-5">
          <p
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--muted)',
              marginBottom: '0.5rem',
            }}
          >
            Report Type
          </p>
          <div className="flex flex-wrap gap-2">
            {REPORT_TYPES.map((t) => {
              const active = reportType === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => { setReportType(t.value); setSearch(''); setZoneFilter('all'); }}
                  style={{
                    padding: '0.375rem 0.875rem',
                    fontSize: '0.8125rem',
                    fontWeight: active ? 600 : 400,
                    borderRadius: 'var(--radius)',
                    border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                    background: active ? 'var(--brand-light)' : 'var(--surface)',
                    color: active ? 'var(--brand)' : 'var(--ink-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.375rem' }}>
            {activeReportDef.description}
          </p>
        </div>

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="Showing" value={byType.length} sub="records in this report" />
          <StatCard label="High Risk"  value={stats.highRisk}  color="var(--danger)"  />
          <StatCard label="Low Risk"   value={stats.lowRisk}   color="var(--success)" />
          <StatCard label="No Checkup" value={stats.noCheckup} color="var(--warning)" />
        </div>

        {/* ── Secondary filters ── */}
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name or serial no."
          />

          {zones.length > 0 && (
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="form-select"
              style={{ width: 'auto', minWidth: '120px' }}
              aria-label="Filter by zone"
            >
              <option value="all">All Zones</option>
              {zones.map((z) => (
                <option key={z} value={z}>Zone {z}</option>
              ))}
            </select>
          )}

          {hasSecondary && (
            <button
              onClick={() => { setSearch(''); setZoneFilter('all'); }}
              className="btn-ghost"
              style={{ fontSize: '0.75rem' }}
            >
              Clear
            </button>
          )}

          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)' }}>
            {filtered.length} of {byType.length} records
            {hasSecondary && <span style={{ color: 'var(--muted-2)' }}> (filtered)</span>}
          </span>
        </div>
      </div>

      {/* ════════════════════════════════════
          PRINT HEADER (visible only when printing)
          ════════════════════════════════════ */}
      <div className="print-only" style={{ display: 'none', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #333', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Prenatrack — {activeReportDef.label}
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#555', marginTop: '0.125rem' }}>
              {activeReportDef.description}
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#555' }}>
            <p>Generated: {printDate()}</p>
            <p>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          TABLE (screen + print)
          ════════════════════════════════════ */}
      <div ref={printRef} className="card overflow-x-auto" id="report-table">
        <table className="data-table" style={{ whiteSpace: 'nowrap' }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Serial No.</th>
              <th>Name</th>
              <th>Zone</th>
              <th>Age</th>
              <th>LMP</th>
              <th>EDC</th>
              <th>G-P</th>
              <th>BP</th>
              <th>Checkups</th>
              <th>Risk</th>
              {reportType === 'upcoming_edc' && <th>Days to EDC</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={reportType === 'upcoming_edc' ? 12 : 11}
                  style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted-2)' }}
                >
                  {hasSecondary
                    ? 'No records match the current search or zone filter.'
                    : `No records for this report type.`}
                </td>
              </tr>
            )}
            {filtered.map((r, i) => {
              const m        = meta[r._id];
              const daysLeft = r.edd ? daysFromToday(r.edd) : null;

              return (
                <tr key={r._id}>
                  <td style={{ color: 'var(--muted-2)', userSelect: 'none' }}>{i + 1}</td>
                  <td>{r.serial_no ?? '—'}</td>
                  <td style={{ color: 'var(--ink)', fontWeight: 500, whiteSpace: 'normal', minWidth: '160px' }}>
                    {r.name || '—'}
                  </td>
                  <td>{r.purok ? `Zone ${r.purok}` : '—'}</td>
                  <td>{r.age ?? '—'}</td>
                  <td>{r.lmp ?? '—'}</td>
                  <td>
                    {r.edd ? (
                      <span style={{
                        fontWeight: daysLeft !== null && daysLeft <= 7 ? 600 : 400,
                        color: daysLeft !== null && daysLeft <= 7 ? 'var(--danger)' : 'inherit',
                      }}>
                        {r.edd}
                      </span>
                    ) : '—'}
                  </td>
                  <td>{r.gravida_para ?? '—'}</td>
                  <td>{r.blood_pressure ?? '—'}</td>
                  <td>
                    <span style={{
                      fontWeight: 500,
                      color: (m?.checkupCount ?? 0) === 0 ? 'var(--danger)' : 'var(--success)',
                    }}>
                      {m?.checkupCount ?? 0}
                    </span>
                  </td>
                  <td>
                    {r.risk_level === 'high'
                      ? <span className="badge-high">High Risk</span>
                      : r.risk_level === 'low'
                        ? <span className="badge-low">Low Risk</span>
                        : '—'}
                  </td>
                  {reportType === 'upcoming_edc' && (
                    <td>
                      {daysLeft !== null ? (
                        <span style={{
                          fontWeight: 600,
                          color: daysLeft <= 7 ? 'var(--danger)' : daysLeft <= 14 ? 'var(--warning)' : 'var(--ink)',
                        }}>
                          {daysLeft === 0 ? 'Today' : `${daysLeft}d`}
                        </span>
                      ) : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Print footer ── */}
      <div
        className="print-only"
        style={{
          display: 'none',
          marginTop: '1.5rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #ccc',
          fontSize: '0.75rem',
          color: '#777',
          textAlign: 'center',
        }}
      >
        Prenatrack — Barangay Maternal Health Tracking System &nbsp;|&nbsp; Confidential
      </div>
    </div>
  );
}

/* ─── Stat card ─── */
function StatCard({
  label,
  value,
  color = 'var(--ink)',
  sub,
}: {
  label: string;
  value: number;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value" style={{ color }}>{value}</p>
      {sub && (
        <p style={{ fontSize: '0.6875rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{sub}</p>
      )}
    </div>
  );
}

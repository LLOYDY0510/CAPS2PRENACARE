'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

/* ─── Types ─── */
type RiskPoint = {
  id: string;
  serial_no: string | null;
  full_name: string;
  purok: string | null;
  risk_level: 'low' | 'high' | 'moderate' | string;
  latitude: number;
  longitude: number;
};

type RiskFilter = 'all' | 'high' | 'moderate' | 'low';

/* ─── Dynamic import of the actual map (SSR off) ─── */
const RiskMap = dynamic<{ records: RiskPoint[]; pendingClick?: (lat: number, lng: number) => void }>(
  () => import('@/components/maps/RiskMap'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: '600px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface-alt)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}
      >
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Loading map…</p>
      </div>
    ),
  }
);

/* ─── Legend pin swatch ─── */
function PinSwatch({ color, stroke }: { color: string; stroke: string }) {
  return (
    <svg
      viewBox="0 0 28 38"
      width="14"
      height="19"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
      aria-hidden
    >
      <path
        d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 24 14 24S28 23.33 28 14C28 6.27 21.73 0 14 0z"
        fill={color}
        stroke={stroke}
        strokeWidth="1.5"
      />
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9" />
    </svg>
  );
}

/* ─── Static config ─── */
const RISK_META = {
  high:     { label: 'High Risk',     fill: '#DC2626', stroke: '#991B1B' },
  moderate: { label: 'Moderate Risk', fill: '#D97706', stroke: '#92400E' },
  low:      { label: 'Low Risk',      fill: '#16A34A', stroke: '#14532D' },
} as const;

const FILTER_TABS: { key: RiskFilter; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'high',     label: 'High Risk' },
  { key: 'moderate', label: 'Moderate Risk' },
  { key: 'low',      label: 'Low Risk' },
];

/* ─── Main component ─── */
export default function RiskMapClient({
  records,
  pendingClick,
}: {
  records: RiskPoint[];
  pendingClick?: (lat: number, lng: number) => void;
}) {
  const [riskFilter, setRiskFilter]   = useState<RiskFilter>('all');
  const [purokFilter, setPurokFilter] = useState<string>('');
  const [search, setSearch]           = useState('');

  /* Derive sorted purok options from data */
  const purokOptions = useMemo(() => {
    const puroks = Array.from(
      new Set(records.map((r) => r.purok).filter(Boolean))
    ) as string[];
    return puroks.sort((a, b) => a.localeCompare(b));
  }, [records]);

  /* Apply all three filters */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      // Risk level filter
      if (riskFilter !== 'all' && r.risk_level !== riskFilter) return false;
      // Purok/Zone filter
      if (purokFilter && r.purok !== purokFilter) return false;
      // Search by name or serial number
      if (q) {
        const nameMatch   = r.full_name.toLowerCase().includes(q);
        const serialMatch = r.serial_no?.toLowerCase().includes(q) ?? false;
        if (!nameMatch && !serialMatch) return false;
      }
      return true;
    });
  }, [records, riskFilter, purokFilter, search]);

  const hasActiveFilters = riskFilter !== 'all' || purokFilter !== '' || search !== '';

  function resetFilters() {
    setRiskFilter('all');
    setPurokFilter('');
    setSearch('');
  }

  return (
    <div>
      {/* ── Controls row ── */}
      <div
        className="flex flex-wrap gap-3 mb-4 items-center"
        style={{ fontSize: '0.875rem' }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '320px' }}>
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
              pointerEvents: 'none',
              display: 'flex',
            }}
          >
            {/* Search icon */}
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M14 14l3.5 3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search name or serial no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '32px',
              paddingRight: '10px',
              paddingTop: '7px',
              paddingBottom: '7px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              fontSize: '0.875rem',
              outline: 'none',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand)')}
            onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Purok / Zone select */}
        <select
          value={purokFilter}
          onChange={(e) => setPurokFilter(e.target.value)}
          aria-label="Filter by Purok/Zone"
          style={{
            padding: '7px 10px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--surface)',
            color: purokFilter ? 'var(--ink)' : 'var(--muted)',
            fontSize: '0.875rem',
            cursor: 'pointer',
            outline: 'none',
            minWidth: '160px',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand)')}
          onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <option value="">All Purok/Zones</option>
          {purokOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* Reset button (only visible when filters are active) */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            style={{
              padding: '7px 14px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              color: 'var(--ink-secondary)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background    = 'var(--surface-alt)';
              e.currentTarget.style.borderColor   = 'var(--brand)';
              e.currentTarget.style.color         = 'var(--brand)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background    = 'var(--surface)';
              e.currentTarget.style.borderColor   = 'var(--border)';
              e.currentTarget.style.color         = 'var(--ink-secondary)';
            }}
          >
            {/* × icon */}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Risk-level filter tabs ── */}
      <div
        className="flex flex-wrap gap-2 mb-4"
        role="group"
        aria-label="Filter by risk level"
      >
        {FILTER_TABS.map(({ key, label }) => {
          const active = riskFilter === key;
          const meta   = key !== 'all' ? RISK_META[key] : null;
          return (
            <button
              key={key}
              onClick={() => setRiskFilter(key)}
              aria-pressed={active}
              style={{
                padding: '5px 14px',
                borderRadius: '999px',
                border: `1.5px solid ${active ? (meta?.stroke ?? 'var(--brand-dark)') : 'var(--border)'}`,
                background: active ? (meta?.fill ?? 'var(--brand)') : 'var(--surface)',
                color: active ? '#fff' : 'var(--ink-secondary)',
                fontSize: '0.8125rem',
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.12s',
              }}
            >
              {meta && <PinSwatch color={active ? '#fff' : meta.fill} stroke={active ? 'rgba(255,255,255,0.6)' : meta.stroke} />}
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '10px 14px',
          marginBottom: '12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8125rem',
          color: 'var(--ink-secondary)',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--muted)', marginRight: '4px' }}>Legend:</span>
        {Object.entries(RISK_META).map(([key, { label, fill, stroke }]) => (
          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <PinSwatch color={fill} stroke={stroke} />
            <span>{label}</span>
            <span style={{ color: 'var(--muted-2)', marginLeft: '2px' }}>
              ({records.filter((r) => r.risk_level === key).length})
            </span>
          </span>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>
          Showing <strong style={{ color: 'var(--ink)' }}>{filtered.length}</strong> of {records.length} records
        </span>
      </div>

      {/* ── Map ── */}
      <RiskMap records={filtered} pendingClick={pendingClick} />
    </div>
  );
}

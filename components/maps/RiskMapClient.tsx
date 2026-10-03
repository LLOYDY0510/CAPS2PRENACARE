'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '@/components/ui/SearchBar';
import { Select } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { RotateCcw } from 'lucide-react';

/* ─── Types ─── */
type RiskPoint = {
  id: string;
  serial_no: string | null;
  full_name: string;
  purok: string | null;
  age: number | null;
  address: string | null;
  contact_number: string | null;
  lmp: string | null;
  edd: string | null;
  gravida_para: string | null;
  risk_level: 'low' | 'high' | string;
  latitude: number;
  longitude: number;
};

type RiskFilter = 'all' | 'high' | 'low';

/* ─── Dynamic import of the actual map (SSR off) ─── */
const RiskMap = dynamic<{ records: RiskPoint[]; pendingClick?: (lat: number, lng: number) => void }>(
  () => import('@/components/maps/RiskMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] w-full flex items-center justify-center bg-slate-50 rounded-[28px] border border-slate-100">
        <p className="text-slate-400 text-xs font-semibold">Loading interactive map...</p>
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
      className="shrink-0"
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

const RISK_META = {
  high: { label: 'High Risk', fill: '#DC2626', stroke: '#991B1B' },
  low: { label: 'Low Risk', fill: '#16A34A', stroke: '#14532D' },
} as const;

const FILTER_TABS: { key: RiskFilter; label: string }[] = [
  { key: 'all', label: 'All Cases' },
  { key: 'high', label: 'High Risk' },
  { key: 'low', label: 'Low Risk' },
];

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

  const purokOptions = useMemo(() => {
    const puroks = Array.from(
      new Set(records.map((r) => r.purok).filter(Boolean))
    ) as string[];
    return puroks.sort((a, b) => a.localeCompare(b));
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (riskFilter !== 'all' && r.risk_level !== riskFilter) return false;
      if (purokFilter && r.purok !== purokFilter) return false;
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
    <div className="space-y-4">
      {/* Controls Card */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-lg shadow-slate-200/40 p-4 sm:p-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px]">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search mother by name or serial no..."
          />
        </div>

        <div className="w-44">
          <Select
            value={purokFilter}
            onChange={(e) => setPurokFilter(e.target.value)}
            options={[
              { value: '', label: 'All Zones / Puroks' },
              ...purokOptions.map((p) => ({ value: p, label: `Zone ${p}` })),
            ]}
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-full border border-slate-200/60">
          {FILTER_TABS.map(({ key, label }) => {
            const active = riskFilter === key;
            return (
              <button
                key={key}
                onClick={() => setRiskFilter(key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  active ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {key !== 'all' && (
                  <PinSwatch
                    color={RISK_META[key].fill}
                    stroke={RISK_META[key].stroke}
                  />
                )}
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} leftIcon={<RotateCcw size={14} />}>
            Reset
          </Button>
        )}
      </div>

      {/* Legend & Stats Banner */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-md p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-600">
        <div className="flex items-center gap-5 flex-wrap">
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Legend:</span>
          {Object.entries(RISK_META).map(([key, { label, fill, stroke }]) => (
            <span key={key} className="flex items-center gap-2">
              <PinSwatch color={fill} stroke={stroke} />
              <span>{label}</span>
              <span className="text-slate-400 font-bold">
                ({records.filter((r) => r.risk_level === key).length})
              </span>
            </span>
          ))}
        </div>

        <div>
          Showing <span className="text-slate-900 font-bold">{filtered.length}</span> of {records.length} mapped records
        </div>
      </div>

      {/* Map Card */}
      <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-3 overflow-hidden">
        <RiskMap records={filtered} pendingClick={pendingClick} />
      </div>
    </div>
  );
}

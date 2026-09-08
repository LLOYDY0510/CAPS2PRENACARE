'use client';

import dynamic from 'next/dynamic';

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

type RiskPoint = {
  id: string;
  full_name: string;
  purok: string | null;
  risk_level: 'low' | 'high' | 'moderate' | string;
  latitude: number;
  longitude: number;
};

/* Pin swatch — mini SVG matching the marker shape */
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

const LEGEND = [
  { label: 'High Risk',     fill: '#DC2626', stroke: '#991B1B' },
  { label: 'Moderate Risk', fill: '#D97706', stroke: '#92400E' },
  { label: 'Low Risk',      fill: '#16A34A', stroke: '#14532D' },
];

export default function RiskMapClient({
  records,
  pendingClick,
}: {
  records: RiskPoint[];
  pendingClick?: (lat: number, lng: number) => void;
}) {
  return (
    <div>
      {/* Legend */}
      <div
        className="flex flex-wrap gap-4 mb-3"
        style={{ fontSize: '0.8125rem', color: 'var(--ink-secondary)' }}
      >
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <PinSwatch color={l.fill} stroke={l.stroke} />
            {l.label}
          </span>
        ))}
      </div>

      <RiskMap records={records} pendingClick={pendingClick} />
    </div>
  );
}

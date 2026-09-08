'use client';

import dynamic from 'next/dynamic';

const RiskMap = dynamic<{ records: RiskPoint[] }>(
  () => import('@/components/maps/RiskMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] flex items-center justify-center bg-gray-100 rounded-lg border">
        <p className="text-muted">Loading map...</p>
      </div>
    ),
  }
);

type RiskPoint = {
  id: string;
  full_name: string;
  purok: string | null;
  risk_level: 'low' | 'high';
  latitude: number;
  longitude: number;
};

export default function RiskMapClient({ records }: { records: RiskPoint[] }) {
  return (
    <div>
      {/* Legend */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span>
          High risk
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-600 inline-block"></span>
          Low risk
        </div>
      </div>

      <RiskMap records={records} />
    </div>
  );
}
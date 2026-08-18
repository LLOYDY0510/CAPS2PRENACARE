'use client';

import dynamic from 'next/dynamic';

// Leaflet needs the browser's `window` object, so we disable SSR for this component
const RiskMap = dynamic(() => import('@/components/RiskMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] flex items-center justify-center bg-gray-100 rounded-lg border">
      <p className="text-gray-500">Loading map...</p>
    </div>
  ),
});

export default function RiskMapPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Risk Map</h1>
      <p className="text-gray-600 mb-6">
        Overview of pregnant mothers by risk level per purok.
      </p>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span>
          High risk
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
          Medium risk
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-600 inline-block"></span>
          Low risk
        </div>
      </div>

      <RiskMap />
    </div>
  );
}
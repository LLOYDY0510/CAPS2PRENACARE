'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const RISK_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  high: { fill: '#DC2626', stroke: '#991B1B', label: 'High Risk' },
  low: { fill: '#16A34A', stroke: '#14532D', label: 'Low Risk' },
};

function getRiskColor(level: string) {
  return RISK_COLORS[level] ?? { fill: '#6B7280', stroke: '#374151', label: level };
}

function makePinIcon(riskLevel: string) {
  const { fill, stroke } = getRiskColor(riskLevel);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 38" width="28" height="38">
      <path
        d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 24 14 24S28 23.33 28 14C28 6.27 21.73 0 14 0z"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="1.5"
      />
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>
  `.trim();

  return divIcon({
    html: svg,
    className: '',
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -40],
  });
}

const DEFAULT_CENTER: [number, number] = [8.315242, 124.860898];

function AutoResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

function ClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function RiskMap({
  records,
  pendingClick,
}: {
  records: RiskPoint[];
  pendingClick?: (lat: number, lng: number) => void;
}) {
  return (
    <div className="relative w-full h-[520px] rounded-[24px] overflow-hidden border border-slate-100 shadow-inner">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={16}
        className="h-full w-full rounded-[24px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AutoResize />
        <ClickHandler onClick={pendingClick} />

        {records.map((point) => (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude]}
            icon={makePinIcon(point.risk_level)}
          >
            <Popup className="rounded-2xl shadow-xl">
              <div className="p-1 space-y-2 text-xs font-medium text-slate-700 min-w-[200px]">
                <div>
                  <p className="font-extrabold text-sm text-slate-900">{point.full_name}</p>
                  {point.serial_no && (
                    <p className="text-[10px] font-mono font-semibold text-slate-400">
                      {point.serial_no}
                    </p>
                  )}
                </div>
                <div className="space-y-0.5 border-t border-slate-100 pt-2 text-[11px]">
                  <p><strong className="text-slate-900">Zone:</strong> {point.purok ? `Zone ${point.purok}` : '—'}</p>
                  {point.age != null && <p><strong className="text-slate-900">Age:</strong> {point.age}</p>}
                  {point.address && <p><strong className="text-slate-900">Address:</strong> {point.address}</p>}
                  {point.contact_number && <p><strong className="text-slate-900">Contact:</strong> {point.contact_number}</p>}
                  {point.edd && <p><strong className="text-slate-900">EDC:</strong> {point.edd}</p>}
                </div>
                <div className="pt-1">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs ${
                      point.risk_level === 'high' ? 'bg-red-600' : 'bg-emerald-600'
                    }`}
                  >
                    {getRiskColor(point.risk_level).label}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

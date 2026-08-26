'use client';

import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type RiskPoint = {
  id: string;
  full_name: string;
  purok: string | null;
  risk_level: 'low' | 'high';
  latitude: number;
  longitude: number;
};

const RISK_COLORS: Record<string, string> = {
  high: '#dc2626',
  low: '#16a34a',
};

// Sankanan, Manolo Fortich, Bukidnon
const DEFAULT_CENTER: [number, number] = [8.315242, 124.860898];

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
    <div className="rounded-lg overflow-hidden border" style={{ height: '600px' }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickHandler onClick={pendingClick} />

        {records.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.latitude, point.longitude]}
            radius={12}
            pathOptions={{
              color: RISK_COLORS[point.risk_level],
              fillColor: RISK_COLORS[point.risk_level],
              fillOpacity: 0.6,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{point.full_name}</p>
                <p>Purok: {point.purok ?? '—'}</p>
                <p className="capitalize">
                  Risk level:{' '}
                  <span
                    className="font-medium"
                    style={{ color: RISK_COLORS[point.risk_level] }}
                  >
                    {point.risk_level}
                  </span>
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
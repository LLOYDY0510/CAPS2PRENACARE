'use client';

import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type RiskPoint = {
  id: string;
  name: string;
  purok: string;
  risk_level: 'low' | 'medium' | 'high';
  lat: number;
  lng: number;
};

// Sample/placeholder data — replace with real data from pregnant_mothers table later
const SAMPLE_DATA: RiskPoint[] = [
  { id: '1', name: 'Purok 1 area', purok: '1', risk_level: 'high', lat: 8.4822, lng: 124.6472 },
  { id: '2', name: 'Purok 2 area', purok: '2', risk_level: 'medium', lat: 8.4842, lng: 124.6502 },
  { id: '3', name: 'Purok 3 area', purok: '3', risk_level: 'low', lat: 8.4802, lng: 124.6442 },
  { id: '4', name: 'Purok 4 area', purok: '4', risk_level: 'high', lat: 8.4862, lng: 124.6412 },
  { id: '5', name: 'Purok 5 area', purok: '5', risk_level: 'low', lat: 8.4792, lng: 124.6522 },
];

const RISK_COLORS: Record<string, string> = {
  high: '#dc2626',    // red
  medium: '#f59e0b',  // amber
  low: '#16a34a',     // green
};

export default function RiskMap() {
  // Center roughly on the average of sample points (Cagayan de Oro area as placeholder)
  const center: [number, number] = [8.4822, 124.6472];

  return (
    <div className="rounded-lg overflow-hidden border" style={{ height: '600px' }}>
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {SAMPLE_DATA.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.lat, point.lng]}
            radius={12}
            pathOptions={{
              color: RISK_COLORS[point.risk_level],
              fillColor: RISK_COLORS[point.risk_level],
              fillOpacity: 0.6,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{point.name}</p>
                <p>Purok: {point.purok}</p>
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
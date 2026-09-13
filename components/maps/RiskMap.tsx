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
  risk_level: 'low' | 'high' | 'moderate' | string;
  latitude: number;
  longitude: number;
};

/* ─── Color per risk level ─── */
const RISK_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  high:     { fill: '#DC2626', stroke: '#991B1B', label: 'High Risk' },
  moderate: { fill: '#D97706', stroke: '#92400E', label: 'Moderate Risk' },
  low:      { fill: '#16A34A', stroke: '#14532D', label: 'Low Risk' },
};

function getRiskColor(level: string) {
  return RISK_COLORS[level] ?? { fill: '#6B7280', stroke: '#374151', label: level };
}

/* ─── SVG pin as a Leaflet DivIcon ─── */
function makePinIcon(riskLevel: string) {
  const { fill, stroke } = getRiskColor(riskLevel);

  // Classic teardrop/pinpoint shape: 28px wide, 38px tall
  // The tip of the pin is at the bottom-center → anchor at (14, 38)
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
    className: '',          // clear Leaflet's default white-box class
    iconSize:   [28, 38],
    iconAnchor: [14, 38],   // tip of pin
    popupAnchor:[0, -40],   // popup appears above the pin tip
  });
}

// Sankanan, Manolo Fortich, Bukidnon
const DEFAULT_CENTER: [number, number] = [8.315242, 124.860898];

/* ─── Invalidates Leaflet's size whenever the map container resizes ─── */
function AutoResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      // invalidateSize triggers Leaflet to recalculate and repaint the map
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
    <div
      style={{
        height: '600px',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
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
                       <Popup>
              <div style={{ fontSize: '13px', lineHeight: 1.5, minWidth: '200px' }}>
                <p style={{ fontWeight: 600, marginBottom: '2px' }}>{point.full_name}</p>
                {point.serial_no && (
                  <p style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '6px' }}>
                    {point.serial_no}
                  </p>
                )}
                <div style={{ color: '#374151', marginBottom: '8px' }}>
                  <p>Zone: {point.purok ?? '—'}</p>
                  {point.age != null && <p>Age: {point.age}</p>}
                  {point.address && <p>Address: {point.address}</p>}
                  {point.contact_number && <p>Contact: {point.contact_number}</p>}
                  {point.lmp && <p>LMP: {point.lmp}</p>}
                  {point.edd && <p>EDC: {point.edd}</p>}
                  {point.gravida_para && <p>G-P: {point.gravida_para}</p>}
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '1px 7px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#fff',
                    background: getRiskColor(point.risk_level).fill,
                  }}
                >
                  {getRiskColor(point.risk_level).label}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { reverseGeocode, parseLocationFromGeocode, debounce } from '@/utils/maps/reverseGeocode';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';

// Fix default marker icon paths (Leaflet + Next.js quirk)
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Sankanan, Manolo Fortich, Bukidnon
const DEFAULT_CENTER: [number, number] = [8.315242, 124.860898];

export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  barangay?: string;
  purok?: string;
  confidence?: 'high' | 'medium' | 'low';
}

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  onLocationDetected,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  onLocationDetected?: (data: LocationData) => void;
}) {
  const [position, setPosition] = useState<[number, number] | null>(
    latitude && longitude ? [latitude, longitude] : null
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // Debounced geocoding function to respect API rate limits
  const performGeocoding = useCallback(
    debounce(async (lat: number, lng: number) => {
      setIsGeocoding(true);
      setGeocodeError(null);

      try {
        const result = await reverseGeocode(lat, lng);
        if (result) {
          const parsed = parseLocationFromGeocode(result);
          setLocationData({
            lat,
            lng,
            address: parsed.fullAddress,
            barangay: parsed.barangay,
            purok: parsed.purok,
            confidence: parsed.confidence,
          });
          onLocationDetected?.({
            lat,
            lng,
            address: parsed.fullAddress,
            barangay: parsed.barangay,
            purok: parsed.purok,
            confidence: parsed.confidence,
          });
        } else {
          setGeocodeError('Could not retrieve location details');
        }
      } catch (error) {
        setGeocodeError('Error fetching location details');
        console.error('Geocoding error:', error);
      } finally {
        setIsGeocoding(false);
      }
    }, 1000), // 1 second debounce
    [onLocationDetected]
  );

  function handlePick(lat: number, lng: number) {
    setPosition([lat, lng]);
    onChange(lat, lng);
    performGeocoding(lat, lng);
  }

  function handleDragEnd(lat: number, lng: number) {
    setPosition([lat, lng]);
    onChange(lat, lng);
    performGeocoding(lat, lng);
  }

  return (
    <div className="space-y-3">
      <div
        className="rounded-3xl overflow-hidden border border-slate-200/60 shadow-sm relative"
        style={{ height: '300px' }}
      >
        {isGeocoding && (
          <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg border border-slate-200 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-[var(--brand)]" />
            <span className="text-xs font-semibold text-slate-600">Detecting location...</span>
          </div>
        )}

        <MapContainer
          center={position ?? DEFAULT_CENTER}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handlePick} />
          {position && (
            <Marker
              position={position}
              icon={defaultIcon}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const newPos = e.target.getLatLng();
                  handleDragEnd(newPos.lat, newPos.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Location info card */}
      {locationData && (
        <div className="bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-100 rounded-2xl p-4 space-y-2">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-[var(--brand)] mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 mb-1">Detected Location</p>
              <p className="text-[11px] text-slate-600 line-clamp-2">{locationData.address}</p>
            </div>
            {locationData.confidence && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  locationData.confidence === 'high'
                    ? 'bg-green-100 text-green-700'
                    : locationData.confidence === 'medium'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {locationData.confidence}
              </span>
            )}
          </div>

          {(locationData.barangay || locationData.purok) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {locationData.barangay && (
                <span className="px-2 py-1 bg-white/80 rounded-lg text-[11px] font-semibold text-slate-700 border border-slate-200">
                  Barangay: {locationData.barangay}
                </span>
              )}
              {locationData.purok && (
                <span className="px-2 py-1 bg-white/80 rounded-lg text-[11px] font-semibold text-slate-700 border border-slate-200">
                  Zone {locationData.purok}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {geocodeError && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle size={14} className="text-amber-600 shrink-0" />
          <p className="text-xs font-semibold text-amber-800">{geocodeError}</p>
        </div>
      )}

      <p className="text-xs text-slate-500">
        {position
          ? `Selected: ${position[0].toFixed(6)}, ${position[1].toFixed(6)}`
          : 'Click on the map or drag the pin to set this mother\'s location.'}
      </p>
    </div>
  );
}
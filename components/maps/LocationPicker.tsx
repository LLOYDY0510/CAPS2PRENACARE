'use client';

import { useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { reverseGeocode, parseLocationFromGeocode, debounce } from '@/utils/maps/reverseGeocode';
import { MapPin, Loader2, AlertCircle, Maximize2, Map as MapIcon, Navigation } from 'lucide-react';
import FullscreenMapModal from './FullscreenMapModal';

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

function LocationDetailsCard({
  locationData,
  isGeocoding,
  geocodeError,
  onApplyToForm,
  onOpenGoogleMaps,
  onOpenStreetView,
}: {
  locationData: LocationData | null;
  isGeocoding: boolean;
  geocodeError: string | null;
  onApplyToForm: () => void;
  onOpenGoogleMaps: () => void;
  onOpenStreetView: () => void;
}) {
  return (
    <div className="bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-100 rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MapPin size={16} className="text-[var(--brand)] shrink-0" />
        <span className="text-xs font-bold text-slate-800">Location Details</span>
      </div>

      {/* Loading state */}
      {isGeocoding && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 size={14} className="animate-spin text-[var(--brand)]" />
          <span className="text-xs font-semibold text-slate-600">Detecting location...</span>
        </div>
      )}

      {/* Error state */}
      {geocodeError && (
        <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle size={12} className="text-amber-600 shrink-0" />
          <span className="text-[11px] font-semibold text-amber-800">{geocodeError}</span>
        </div>
      )}

      {/* Location data */}
      {locationData && !isGeocoding && (
        <div className="space-y-2">
          {/* Coordinates */}
          <div className="bg-white/60 rounded-lg p-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Coordinates</p>
            <p className="text-xs font-mono text-slate-700">
              {locationData.lat.toFixed(6)}, {locationData.lng.toFixed(6)}
            </p>
          </div>

          {/* Address */}
          {locationData.address && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Address</p>
              <p className="text-xs text-slate-700 line-clamp-2">{locationData.address}</p>
            </div>
          )}

          {/* Barangay and Zone */}
          {(locationData.barangay || locationData.purok) && (
            <div className="flex flex-wrap gap-1.5">
              {locationData.barangay && (
                <span className="px-2 py-1 bg-white/80 rounded-lg text-[11px] font-semibold text-teal-800 border border-teal-200">
                  Barangay: {locationData.barangay}
                </span>
              )}
              {locationData.purok && (
                <span className="px-2 py-1 bg-white/80 rounded-lg text-[11px] font-semibold text-indigo-800 border border-indigo-200">
                  Zone {locationData.purok}
                </span>
              )}
            </div>
          )}

          {/* Confidence indicator */}
          {locationData.confidence && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-slate-500">Confidence:</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  locationData.confidence === 'high'
                    ? 'bg-green-100 text-green-700'
                    : locationData.confidence === 'medium'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {locationData.confidence}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {locationData && !isGeocoding && (
        <div className="space-y-2 pt-2 border-t border-teal-200/50">
          <button
            type="button"
            onClick={onApplyToForm}
            className="w-full px-3 py-2 bg-[var(--brand)] hover:bg-teal-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <MapPin size={14} />
            Apply Location to Form
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenGoogleMaps}
              className="px-3 py-2 bg-white/80 hover:bg-white text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-200"
            >
              <MapIcon size={14} />
              Google Maps
            </button>
            <button
              type="button"
              onClick={onOpenStreetView}
              className="px-3 py-2 bg-white/80 hover:bg-white text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-200"
            >
              <Navigation size={14} />
              Street View
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const markerRef = useRef<L.Marker>(null);
  const mapRef = useRef<L.Map>(null);

  // Debounced geocoding function to respect API rate limits
  const performGeocoding = useCallback(
    debounce(async (lat: number, lng: number) => {
      setIsGeocoding(true);
      setGeocodeError(null);

      try {
        const result = await reverseGeocode(lat, lng);
        if (result) {
          const parsed = parseLocationFromGeocode(result);
          const data: LocationData = {
            lat,
            lng,
            address: parsed.fullAddress,
            barangay: parsed.barangay,
            purok: parsed.purok,
            confidence: parsed.confidence,
          };
          setLocationData(data);
          onLocationDetected?.(data);
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

  function handleApplyToForm() {
    if (locationData) {
      onLocationDetected?.(locationData);
    }
  }

  function handleOpenGoogleMaps() {
    if (locationData) {
      const url = `https://www.google.com/maps/search/?api=1&query=${locationData.lat},${locationData.lng}`;
      window.open(url, '_blank');
    }
  }

  function handleOpenStreetView() {
    if (locationData) {
      const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${locationData.lat},${locationData.lng}`;
      window.open(url, '_blank');
    }
  }

  function handleFullscreenLocationSelected(data: LocationData) {
    setPosition([data.lat, data.lng]);
    onChange(data.lat, data.lng);
    setLocationData(data);
    onLocationDetected?.(data);
  }

  return (
    <div className="space-y-3">
      <div
        className="rounded-3xl overflow-hidden border border-slate-200/60 shadow-sm relative"
        style={{ height: '300px' }}
      >
        {/* Fullscreen button */}
        <button
          type="button"
          onClick={() => setIsFullscreenOpen(true)}
          className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-slate-200 hover:bg-white transition-colors"
          aria-label="Open fullscreen map"
        >
          <Maximize2 size={16} className="text-slate-600" />
        </button>

        <MapContainer
          center={position ?? DEFAULT_CENTER}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          ref={(map) => {
            if (map) {
              mapRef.current = map;
              // Auto-pan to position when set
              if (position) {
                map.setView(position, 16, { animate: true });
              }
            }
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handlePick} />
          {position && (
            <Marker
              ref={markerRef}
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

      {/* Location Details Card */}
      <LocationDetailsCard
        locationData={locationData}
        isGeocoding={isGeocoding}
        geocodeError={geocodeError}
        onApplyToForm={handleApplyToForm}
        onOpenGoogleMaps={handleOpenGoogleMaps}
        onOpenStreetView={handleOpenStreetView}
      />

      <p className="text-xs text-slate-500">
        {position
          ? `Selected: ${position[0].toFixed(6)}, ${position[1].toFixed(6)}`
          : 'Click on the map or drag the pin to set this mother\'s location.'}
      </p>

      {/* Fullscreen Map Modal */}
      <FullscreenMapModal
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
        initialPosition={position}
        onLocationSelected={handleFullscreenLocationSelected}
      />
    </div>
  );
}
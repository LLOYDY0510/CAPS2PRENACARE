'use client';

import { useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { X, MapPin, Loader2, AlertCircle, Map as MapIcon, Navigation } from 'lucide-react';
import { reverseGeocode, parseLocationFromGeocode, debounce } from '@/utils/maps/reverseGeocode';
import type { LocationData } from './LocationPicker';

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

interface FullscreenMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPosition: [number, number] | null;
  onLocationSelected: (data: LocationData) => void;
}

function MapClickHandler({
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

export default function FullscreenMapModal({
  isOpen,
  onClose,
  initialPosition,
  onLocationSelected,
}: FullscreenMapModalProps) {
  const [position, setPosition] = useState<[number, number] | null>(initialPosition);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const markerRef = useRef<L.Marker>(null);
  const mapRef = useRef<L.Map>(null);

  // Reset position when modal opens
  if (isOpen && !position && initialPosition) {
    setPosition(initialPosition);
  }

  // Debounced geocoding function
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
        } else {
          setGeocodeError('Could not retrieve location details');
        }
      } catch (error) {
        setGeocodeError('Error fetching location details');
        console.error('Geocoding error:', error);
      } finally {
        setIsGeocoding(false);
      }
    }, 1000),
    []
  );

  function handlePick(lat: number, lng: number) {
    setPosition([lat, lng]);
    performGeocoding(lat, lng);
  }

  function handleDragEnd(lat: number, lng: number) {
    setPosition([lat, lng]);
    performGeocoding(lat, lng);
  }

  function handleApplyLocation() {
    if (locationData) {
      onLocationSelected(locationData);
      onClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <MapPin size={20} className="text-[var(--brand)]" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Select Location</h2>
              <p className="text-xs text-slate-500">Click on the map or drag the pin to set the location</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <MapContainer
            center={position ?? DEFAULT_CENTER}
            zoom={17}
            style={{ height: '100%', width: '100%' }}
            ref={(map) => {
              if (map) {
                mapRef.current = map;
                // Auto-pan to position when set
                if (position) {
                  map.setView(position, 17, { animate: true });
                }
              }
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onPick={handlePick} />
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

          {/* Location Info Panel - Floating on Map */}
          <div className="absolute bottom-4 left-4 right-4 max-w-md">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-4 space-y-3">
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
                  <div className="bg-slate-50 rounded-lg p-2">
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
                        <span className="px-2 py-1 bg-teal-50 rounded-lg text-[11px] font-semibold text-teal-800 border border-teal-200">
                          Barangay: {locationData.barangay}
                        </span>
                      )}
                      {locationData.purok && (
                        <span className="px-2 py-1 bg-indigo-50 rounded-lg text-[11px] font-semibold text-indigo-800 border border-indigo-200">
                          Zone {locationData.purok}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              {locationData && !isGeocoding && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleApplyLocation}
                    className="w-full px-3 py-2 bg-[var(--brand)] hover:bg-teal-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <MapPin size={14} />
                    Apply Location to Form
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleOpenGoogleMaps}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <MapIcon size={14} />
                      Google Maps
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenStreetView}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Navigation size={14} />
                      Street View
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

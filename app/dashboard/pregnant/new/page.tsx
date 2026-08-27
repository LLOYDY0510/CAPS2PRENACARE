'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';

const LocationPicker = dynamic<{
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}>(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] flex items-center justify-center bg-gray-100 rounded-lg border">
      <p className="text-muted text-sm">Loading map...</p>
    </div>
  ),
});

export default function RegisterPregnantMotherPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    date_registered: new Date().toISOString().slice(0, 10),
    first_name: '',
    middle_name: '',
    last_name: '',
    address: '',
    purok: '',
    age: '',
    contact_number: '',
    lmp: '',
    gravida: '',
    para: '',
    edd: '',
    blood_pressure: '',
    height_cm: '',
    weight_kg: '',
  });
  const [location, setLocation] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [riskLevel, setRiskLevel] = useState<'low' | 'high'>('low');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showForm, setShowForm] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Auto-calculate EDC from LMP using Naegele's Rule (LMP + 280 days)
      if (field === 'lmp' && value) {
        const lmpDate = new Date(value);
        if (!isNaN(lmpDate.getTime())) {
          const edcDate = new Date(lmpDate);
          edcDate.setDate(edcDate.getDate() + 280);
          next.edd = edcDate.toISOString().slice(0, 10);
        }
      }

      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.last_name.trim() || !form.first_name.trim()) {
      setError('First and last name are required.');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Generate a unique serial number, e.g. SPM-2026-0001
      const currentYear = new Date().getFullYear();
      const { count } = await supabase
        .from('pregnant_mothers')
        .select('id', { count: 'exact', head: true })
        .gte('date_registered', `${currentYear}-01-01`)
        .lte('date_registered', `${currentYear}-12-31`);

      const nextNumber = (count ?? 0) + 1;
      const serial_no = `SPM-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

      const full_name = [form.first_name, form.middle_name, form.last_name]
        .filter(Boolean)
        .join(' ');

      const gravida_para =
        form.gravida && form.para ? `G${form.gravida}P${form.para}` : null;

      const { error: insertError } = await supabase.from('pregnant_mothers').insert({
        serial_no,
        date_registered: form.date_registered,
        first_name: form.first_name,
        middle_name: form.middle_name || null,
        last_name: form.last_name,
        full_name,
        address: form.address || null,
        purok: form.purok || null,
        age: form.age ? parseInt(form.age) : null,
        contact_number: form.contact_number || null,
        lmp: form.lmp || null,
        gravida_para,
        edd: form.edd || null,
        blood_pressure: form.blood_pressure || null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        latitude: location.lat,
        longitude: location.lng,
        risk_level: riskLevel,
        registered_by: user?.id ?? null,
      });

      if (insertError) {
        setError(`Save failed: ${insertError.message}`);
        setLoading(false);
        return;
      }

      window.location.href = '/dashboard/pregnant';
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  }

  if (!showForm) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold mb-1">Data Privacy Notice</h1>
        <p className="text-muted mb-6">
          Please read and agree before proceeding to the registration form.
        </p>

        <div className="card p-6">
          <div className="prose prose-sm max-w-none text-gray-700 space-y-3 mb-6">
            <p>
              In compliance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>,
              this health system collects personal and health-related information
              (such as name, address, contact number, and prenatal health details)
              for the purpose of prenatal care monitoring, scheduling, and reporting
              by authorized barangay health workers, midwives, and nurses.
            </p>
            <p>
              By proceeding, the pregnant mother (or her authorized representative)
              consents to the collection, use, storage, and processing of this
              information solely for maternal and community health purposes. Her
              information will not be shared with third parties outside of this
              health program without her consent, except as required by law.
            </p>
            <p>
              She may request access to, correction of, or deletion of her
              personal data at any time by coordinating with her assigned
              barangay health worker or midwife.
            </p>
          </div>

          <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer mb-6">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded border-gray-300"
            />
            <span>
              I confirm that the pregnant mother (or her authorized representative)
              has been informed of and agrees to the collection and processing of
              her personal information as described above.
            </span>
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={!agreed}
              onClick={() => setShowForm(true)}
              className="bg-brand text-white px-5 py-2 rounded-lg text-sm hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Agree &amp; Proceed
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/pregnant')}
              className="px-5 py-2 rounded-lg text-sm border hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">Register Pregnant Mother</h1>
      <p className="text-muted mb-6">
        Fill in the details below to add a new record.
      </p>

      <form
        onSubmit={handleSubmit}
        className="card p-6 space-y-5"
      >
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Date of Registration</label>
          <input
            type="date"
            value={form.date_registered}
            onChange={(e) => updateField('date_registered', e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => updateField('first_name', e.target.value)}
              placeholder="First name"
              required
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <input
              type="text"
              value={form.middle_name}
              onChange={(e) => updateField('middle_name', e.target.value)}
              placeholder="Middle name"
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => updateField('last_name', e.target.value)}
              placeholder="Last name"
              required
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Address</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => updateField('address', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Purok</label>
            <input
              type="text"
              value={form.purok}
              onChange={(e) => updateField('purok', e.target.value)}
              placeholder="e.g. 1"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Age</label>
            <input
              type="number"
              value={form.age}
              onChange={(e) => updateField('age', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Contact Number</label>
          <input
            type="text"
            value={form.contact_number}
            onChange={(e) => updateField('contact_number', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {/* Pregnancy details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">LMP (Last Menstrual Period)</label>
            <input
              type="date"
              value={form.lmp}
              onChange={(e) => updateField('lmp', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              EDC (Expected Date of Confinement)
            </label>
            <input
              type="date"
              value={form.edd}
              readOnly
              className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-2 mt-1">Auto-computed from LMP</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Gravida (G)</label>
            <select
              value={form.gravida}
              onChange={(e) => updateField('gravida', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Select...</option>
              {Array.from({ length: 11 }, (_, i) => (
                <option key={i} value={i}>
                  G{i}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Para (P)</label>
            <select
              value={form.para}
              onChange={(e) => updateField('para', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Select...</option>
              {Array.from({ length: 11 }, (_, i) => (
                <option key={i} value={i}>
                  P{i}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Vitals */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Blood Pressure</label>
            <select
              value={form.blood_pressure}
              onChange={(e) => updateField('blood_pressure', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Select...</option>
              {[
                '90/60', '100/60', '100/70', '110/70', '110/80',
                '120/80', '120/90', '130/85', '130/90', '140/90',
                '150/95', '160/100', '170/110', '180/120',
              ].map((bp) => (
                <option key={bp} value={bp}>
                  {bp}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Height (cm)</label>
            <select
              value={form.height_cm}
              onChange={(e) => updateField('height_cm', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Select...</option>
              {Array.from({ length: 61 }, (_, i) => 130 + i).map((cm) => (
                <option key={cm} value={cm}>
                  {cm}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Weight (kg)</label>
            <select
              value={form.weight_kg}
              onChange={(e) => updateField('weight_kg', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Select...</option>
              {Array.from({ length: 91 }, (_, i) => 30 + i).map((kg) => (
                <option key={kg} value={kg}>
                  {kg}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location (pin the mother&apos;s home)</label>
          <LocationPicker
            latitude={location.lat}
            longitude={location.lng}
            onChange={(lat, lng) => setLocation({ lat, lng })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Risk Level</label>
          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value as 'low' | 'high')}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="low">Low risk</option>
            <option value="high">High risk</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-brand text-white px-5 py-2 rounded-lg text-sm hover:bg-brand-dark disabled:opacity-50 transition"
          >
            {loading ? 'Saving...' : 'Save Record'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/pregnant')}
            className="px-5 py-2 rounded-lg text-sm border hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
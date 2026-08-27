'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type Record = {
  id: string;
  date_registered: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  address: string | null;
  purok: string | null;
  age: number | null;
  contact_number: string | null;
  lmp: string | null;
  gravida_para: string | null;
  edd: string | null;
  blood_pressure: string | null;
  height_cm: number | null;
  weight_kg: number | null;
};

function parseGP(gp: string | null) {
  const match = gp?.match(/G(\d+)P(\d+)/i);
  return {
    gravida: match ? match[1] : '',
    para: match ? match[2] : '',
  };
}

export default function EditPregnantMotherForm({ record }: { record: Record }) {
  const router = useRouter();
  const supabase = createClient();

  const { gravida: initGravida, para: initPara } = parseGP(record.gravida_para);

  const [form, setForm] = useState({
    date_registered: record.date_registered ?? '',
    first_name: record.first_name ?? '',
    middle_name: record.middle_name ?? '',
    last_name: record.last_name ?? '',
    address: record.address ?? '',
    purok: record.purok ?? '',
    age: record.age?.toString() ?? '',
    contact_number: record.contact_number ?? '',
    lmp: record.lmp ?? '',
    gravida: initGravida,
    para: initPara,
    edd: record.edd ?? '',
    blood_pressure: record.blood_pressure ?? '',
    height_cm: record.height_cm?.toString() ?? '',
    weight_kg: record.weight_kg?.toString() ?? '',
  });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
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
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.');
      return;
    }

    setLoading(true);

    const full_name = [form.first_name, form.middle_name, form.last_name]
      .filter(Boolean)
      .join(' ');
    const gravida_para = form.gravida && form.para ? `G${form.gravida}P${form.para}` : null;

    const { error: updateError } = await supabase
      .from('pregnant_mothers')
      .update({
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
      })
      .eq('id', record.id);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Redirect back to the records list after saving
    window.location.href = '/dashboard/pregnant';
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
      {saved && (
        <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
          Changes saved successfully.
        </p>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Date of Registration</label>
        <input
          type="date"
          value={form.date_registered}
          onChange={(e) => updateField('date_registered', e.target.value)}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">LMP</label>
          <input
            type="date"
            value={form.lmp}
            onChange={(e) => updateField('lmp', e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">EDC</label>
          <input
            type="date"
            value={form.edd}
            readOnly
            className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-muted cursor-not-allowed"
          />
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

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-brand text-white px-5 py-2 rounded-lg text-sm hover:bg-brand-dark disabled:opacity-50 transition"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/pregnant')}
          className="px-5 py-2 rounded-lg text-sm border hover:bg-gray-50 transition"
        >
          Back to Records
        </button>
      </div>
    </form>
  );
}
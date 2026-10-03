'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
  BLOOD_PRESSURE_OPTIONS,
  GRAVIDA_OPTIONS,
  HEIGHT_OPTIONS_CM,
  PARA_OPTIONS,
  WEIGHT_OPTIONS_KG,
  eddFromLmp,
} from '@/utils/maternalForm';

export type MotherEditRecord = {
  id: string;
  serial_no?: string | null;
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
  return { gravida: match ? match[1] : '', para: match ? match[2] : '' };
}

export default function EditPregnantMotherForm({
  record,
  onSaved,
}: {
  record: MotherEditRecord;
  onSaved?: () => void;
}) {
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
      // EDC follows the LMP (Naegele's rule) and is not typed directly.
      if (field === 'lmp') next.edd = value ? (eddFromLmp(value) ?? '') : '';
      return next;
    });
    setSaved(false);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.');
      return;
    }

    const age = form.age ? Number(form.age) : null;
    if (age != null && (!Number.isInteger(age) || age < 10 || age > 55)) {
      setError('Age must be a whole number between 10 and 55.');
      return;
    }
    const height = form.height_cm ? Number(form.height_cm) : null;
    const weight = form.weight_kg ? Number(form.weight_kg) : null;
    if (weight != null && (!Number.isFinite(weight) || weight <= 0)) {
      setError('Weight must be greater than 0.');
      return;
    }

    setLoading(true);

    try {
      const full_name = [form.first_name.trim(), form.middle_name.trim(), form.last_name.trim()]
        .filter(Boolean)
        .join(' ');
      const gravida = form.gravida ? Number(form.gravida) : null;
      const para = form.para ? Number(form.para) : null;
      if (gravida != null && para != null && para > gravida) {
        setError('Para cannot be greater than Gravida.');
        return;
      }

      const { error: updateError } = await supabase
        .from('pregnant_mothers')
        .update({
          date_registered: form.date_registered || null,
          first_name: form.first_name.trim(),
          middle_name: form.middle_name.trim() || null,
          last_name: form.last_name.trim(),
          full_name,
          address: form.address.trim() || null,
          purok: form.purok.trim() || null,
          age,
          contact_number: form.contact_number.trim() || null,
          lmp: form.lmp || null,
          gravida_para: gravida != null && para != null ? `G${gravida}P${para}` : null,
          edd: form.edd || null,
          blood_pressure: form.blood_pressure || null,
          height_cm: height,
          weight_kg: weight,
        })
        .eq('id', record.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSaved(true);
      onSaved?.();
      router.refresh();

      // Advisory only - a notification failure must not invalidate the save.
      await Promise.allSettled([
        fetch('/api/notifications/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'role_alert',
            recipientRole: 'nurse',
            title: 'Maternal record updated',
            message: `${full_name}'s maternal record was updated and is ready for review.`,
          }),
        }),
      ]);
    } catch {
      setError('Network error while saving. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5" noValidate>
      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="alert-success" role="status">
          Changes saved successfully.
        </p>
      )}

      <div>
        <label className="form-label" htmlFor="edit-date-registered">
          Date of Registration
        </label>
        <input
          id="edit-date-registered"
          type="date"
          value={form.date_registered}
          onChange={(e) => updateField('date_registered', e.target.value)}
          className="form-input"
        />
      </div>

      <fieldset>
        <legend className="form-label">Name *</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="sr-only" htmlFor="edit-first-name">
              First name
            </label>
            <input
              id="edit-first-name"
              type="text"
              value={form.first_name}
              onChange={(e) => updateField('first_name', e.target.value)}
              placeholder="First name"
              required
              className="form-input"
            />
          </div>
          <div>
            <label className="sr-only" htmlFor="edit-middle-name">
              Middle name
            </label>
            <input
              id="edit-middle-name"
              type="text"
              value={form.middle_name}
              onChange={(e) => updateField('middle_name', e.target.value)}
              placeholder="Middle name"
              className="form-input"
            />
          </div>
          <div>
            <label className="sr-only" htmlFor="edit-last-name">
              Last name
            </label>
            <input
              id="edit-last-name"
              type="text"
              value={form.last_name}
              onChange={(e) => updateField('last_name', e.target.value)}
              placeholder="Last name"
              required
              className="form-input"
            />
          </div>
        </div>
      </fieldset>

      <div>
        <label className="form-label" htmlFor="edit-address">
          Address
        </label>
        <input
          id="edit-address"
          type="text"
          value={form.address}
          onChange={(e) => updateField('address', e.target.value)}
          className="form-input"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label" htmlFor="edit-purok">
            Purok
          </label>
          <input
            id="edit-purok"
            type="text"
            value={form.purok}
            onChange={(e) => updateField('purok', e.target.value)}
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="edit-age">
            Age
          </label>
          <input
            id="edit-age"
            type="number"
            min={10}
            max={55}
            value={form.age}
            onChange={(e) => updateField('age', e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      <div>
        <label className="form-label" htmlFor="edit-contact">
          Contact Number
        </label>
        <input
          id="edit-contact"
          type="tel"
          value={form.contact_number}
          onChange={(e) => updateField('contact_number', e.target.value)}
          className="form-input"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label" htmlFor="edit-lmp">
            LMP
          </label>
          <input
            id="edit-lmp"
            type="date"
            value={form.lmp}
            onChange={(e) => updateField('lmp', e.target.value)}
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="edit-edd">
            EDC (computed from LMP)
          </label>
          <input
            id="edit-edd"
            type="date"
            value={form.edd}
            readOnly
            tabIndex={-1}
            className="form-input bg-surface-alt cursor-not-allowed"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label" htmlFor="edit-gravida">
            Gravida (G)
          </label>
          <select
            id="edit-gravida"
            value={form.gravida}
            onChange={(e) => updateField('gravida', e.target.value)}
            className="form-select"
          >
            <option value="">Select…</option>
            {GRAVIDA_OPTIONS.map((i) => (
              <option key={i} value={i}>
                G{i}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="edit-para">
            Para (P)
          </label>
          <select
            id="edit-para"
            value={form.para}
            onChange={(e) => updateField('para', e.target.value)}
            className="form-select"
          >
            <option value="">Select…</option>
            {PARA_OPTIONS.map((i) => (
              <option key={i} value={i}>
                P{i}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="form-label" htmlFor="edit-bp">
            Blood Pressure
          </label>
          <select
            id="edit-bp"
            value={form.blood_pressure}
            onChange={(e) => updateField('blood_pressure', e.target.value)}
            className="form-select"
          >
            <option value="">Select…</option>
            {BLOOD_PRESSURE_OPTIONS.map((bp) => (
              <option key={bp} value={bp}>
                {bp}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="edit-height">
            Height (cm)
          </label>
          <select
            id="edit-height"
            value={form.height_cm}
            onChange={(e) => updateField('height_cm', e.target.value)}
            className="form-select"
          >
            <option value="">Select…</option>
            {HEIGHT_OPTIONS_CM.map((cm) => (
              <option key={cm} value={cm}>
                {cm}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="edit-weight">
            Weight (kg)
          </label>
          <select
            id="edit-weight"
            value={form.weight_kg}
            onChange={(e) => updateField('weight_kg', e.target.value)}
            className="form-select"
          >
            <option value="">Select…</option>
            {WEIGHT_OPTIONS_KG.map((kg) => (
              <option key={kg} value={kg}>
                {kg}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/pregnant')}
          className="btn-secondary"
        >
          Back to Records
        </button>
      </div>
    </form>
  );
}

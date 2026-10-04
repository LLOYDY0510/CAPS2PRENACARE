'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import {
  BLOOD_PRESSURE_OPTIONS,
  GRAVIDA_OPTIONS,
  HEIGHT_OPTIONS_CM,
  PARA_OPTIONS,
  WEIGHT_OPTIONS_KG,
  eddFromLmp,
} from '@/utils/maternalForm';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { ShieldCheck, UserPlus, MapPin, AlertTriangle, FileText, CheckCircle } from 'lucide-react';

const LocationPicker = dynamic<{
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  onLocationDetected?: (data: { lat: number; lng: number; address?: string; barangay?: string; purok?: string; confidence?: 'high' | 'medium' | 'low' }) => void;
}>(() => import('@/components/maps/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-100">
      <p className="text-slate-400 text-xs font-semibold">Loading map location picker...</p>
    </div>
  ),
});

type Indicator = {
  id: string;
  label: string;
  indicator_type: string;
  threshold_value: number | null;
};

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
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [selectedIndicatorIds, setSelectedIndicatorIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadIndicators() {
      const { data } = await supabase
        .from('risk_indicators')
        .select('id, label, indicator_type, threshold_value')
        .eq('active', true)
        .eq('indicator_type', 'checklist')
        .order('created_at', { ascending: true });
      setIndicators(data ?? []);
    }
    loadIndicators();
  }, [supabase]);

  function updateField(field: string, value: string) {
    setError('');
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'lmp') {
        next.edd = value ? (eddFromLmp(value) ?? '') : '';
      }

      return next;
    });
  }

  function toggleIndicator(id: string) {
    setSelectedIndicatorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleLocationDetected(data: {
    lat: number;
    lng: number;
    address?: string;
    barangay?: string;
    purok?: string;
    confidence?: 'high' | 'medium' | 'low';
  }) {
    // Auto-fill address if not already set
    if (data.address && !form.address) {
      setForm((prev) => ({ ...prev, address: data.address || '' }));
      setAutoFilledFields((prev) => new Set([...prev, 'address']));
    }

    // Auto-fill purok if detected and not already set
    if (data.purok && !form.purok) {
      setForm((prev) => ({ ...prev, purok: data.purok || '' }));
      setAutoFilledFields((prev) => new Set([...prev, 'purok']));
    }
  }

  function handleFieldChange(field: string, value: string) {
    updateField(field, value);
    // Remove from auto-filled set when user manually edits
    setAutoFilledFields((prev) => {
      const next = new Set(prev);
      next.delete(field);
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

    const ageNum = form.age ? parseInt(form.age) : null;
    if (ageNum != null && (!Number.isInteger(ageNum) || ageNum < 10 || ageNum > 55)) {
      setError('Age must be a whole number between 10 and 55.');
      return;
    }
    const gravidaNum = form.gravida ? parseInt(form.gravida) : null;
    const paraNum = form.para ? parseInt(form.para) : null;
    if (gravidaNum != null && paraNum != null && paraNum > gravidaNum) {
      setError('Para cannot be greater than Gravida.');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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

      const { data: autoIndicators } = await supabase
        .from('risk_indicators')
        .select('id, indicator_type, threshold_value')
        .eq('active', true)
        .in('indicator_type', ['age_below', 'first_pregnancy_age_above']);

      const matchedAutoIds: string[] = [];
      autoIndicators?.forEach((ind) => {
        if (
          ind.indicator_type === 'age_below' &&
          ageNum != null &&
          ind.threshold_value != null &&
          ageNum < ind.threshold_value
        ) {
          matchedAutoIds.push(ind.id);
        }
        if (
          ind.indicator_type === 'first_pregnancy_age_above' &&
          ageNum != null &&
          gravidaNum === 1 &&
          ind.threshold_value != null &&
          ageNum >= ind.threshold_value
        ) {
          matchedAutoIds.push(ind.id);
        }
      });

      const matchedIndicatorIds = [...selectedIndicatorIds, ...matchedAutoIds];
      const risk_level = matchedIndicatorIds.length > 0 ? 'high' : 'low';

      const { data: inserted, error: insertError } = await supabase
        .from('pregnant_mothers')
        .insert({
          serial_no,
          date_registered: form.date_registered,
          first_name: form.first_name,
          middle_name: form.middle_name || null,
          last_name: form.last_name,
          full_name,
          address: form.address || null,
          purok: form.purok || null,
          age: ageNum,
          contact_number: form.contact_number || null,
          lmp: form.lmp || null,
          gravida_para,
          edd: form.edd || null,
          blood_pressure: form.blood_pressure || null,
          height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
          weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
          latitude: location.lat,
          longitude: location.lng,
          risk_level,
          registered_by: user?.id ?? null,
        })
        .select()
        .single();

      if (insertError) {
        setError(`Save failed: ${insertError.message}`);
        setLoading(false);
        return;
      }

      if (matchedIndicatorIds.length > 0 && inserted) {
        await supabase.from('pregnant_mother_indicators').insert(
          matchedIndicatorIds.map((indicator_id) => ({
            pregnant_mother_id: inserted.id,
            indicator_id,
          }))
        );

        await fetch('/api/notifications/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'risk_alert',
            pregnantMotherId: inserted.id,
            title: 'High-risk pregnancy alert',
            message: 'Your record has been flagged for enhanced prenatal monitoring. Please review your care plan with your BHW or nurse at your next visit.',
          }),
        });
        await Promise.all([
          fetch('/api/notifications/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'role_alert', recipientRole: 'nurse', title: 'High-risk mother registered', message: `${full_name} was registered as high risk and needs enhanced prenatal monitoring.` }) }),
          fetch('/api/notifications/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'role_alert', recipientRole: 'admin', title: 'High-risk maternal alert', message: `${full_name} was registered as high risk.` }) }),
          form.purok ? fetch('/api/notifications/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'role_alert', recipientRole: 'bhw_purok', recipientPurok: form.purok, title: 'High-risk mother in your purok', message: `${full_name} was registered as high risk in your assigned purok.` }) }) : Promise.resolve(),
        ]);
      }

      if (inserted) {
        await Promise.all([
          fetch('/api/notifications/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'role_alert', recipientRole: 'admin', title: 'New pregnant mother registered', message: `${full_name} was added to the maternal registry.` }) }),
          form.purok ? fetch('/api/notifications/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'role_alert', recipientRole: 'bhw_purok', recipientPurok: form.purok, title: 'New mother in your purok', message: `${full_name} was added to the maternal registry in your assigned purok.` }) }) : Promise.resolve(),
        ]);
      }

      router.push('/dashboard/pregnant');
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  }

  if (!showForm) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 anim-fade-up">
        <PageHeader
          title="Data Privacy Notice"
          subtitle="Please read and agree before proceeding to registration"
          icon={ShieldCheck}
          badge="RA 10173 Compliant"
        />

        <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6">
          <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-600 space-y-4 leading-relaxed font-medium">
            <p className="bg-teal-50/60 p-4 rounded-2xl border border-teal-100 text-teal-900 font-semibold">
              In compliance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>, this health system collects personal and health-related information for prenatal care monitoring, scheduling, and reporting by authorized barangay health workers, midwives, and nurses.
            </p>
            <p>
              By proceeding, the pregnant mother (or her authorized representative) consents to the collection, use, storage, and processing of this information solely for maternal and community health purposes. Her information will not be shared with third parties outside of this health program without her consent, except as required by law.
            </p>
            <p>
              She may request access to, correction of, or deletion of her personal data at any time by coordinating with her assigned barangay health worker or midwife.
            </p>
          </div>

          <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer text-xs sm:text-sm font-semibold text-slate-700 hover:bg-teal-50/50 transition-colors">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded-lg border-slate-300 text-[var(--brand)] focus:ring-[var(--brand)] w-4 h-4"
            />
            <span>
              I confirm that the pregnant mother (or her authorized representative) has been informed of and agrees to the collection and processing of her personal information as described above.
            </span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <Button
              disabled={!agreed}
              onClick={() => setShowForm(true)}
              leftIcon={<CheckCircle size={18} />}
            >
              Agree &amp; Proceed
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/pregnant')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 anim-fade-up">
      <PageHeader
        title="Register Pregnant Woman"
        subtitle="Fill in the maternal record details below"
        icon={UserPlus}
        badge="New Record"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold" role="alert">
            {error}
          </div>
        )}

        {/* Section 1: Personal & Demographics */}
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 sm:p-7 space-y-5">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <FileText size={18} className="text-[var(--brand)]" />
            <span>Personal Information</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Date of Registration"
              type="date"
              value={form.date_registered}
              onChange={(e) => updateField('date_registered', e.target.value)}
              required
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Full Name * (First, M.I., Last)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  placeholder="First name"
                  required
                  className="h-11 px-3 bg-slate-50 hover:bg-slate-50 focus:bg-white text-xs sm:text-sm font-medium rounded-2xl border border-slate-200 focus:border-[var(--brand)] outline-none"
                />
                <input
                  type="text"
                  value={form.middle_name}
                  onChange={(e) => updateField('middle_name', e.target.value)}
                  placeholder="M.I."
                  maxLength={2}
                  className="h-11 px-3 bg-slate-50 hover:bg-slate-50 focus:bg-white text-xs sm:text-sm font-medium rounded-2xl border border-slate-200 focus:border-[var(--brand)] outline-none"
                />
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  placeholder="Last name"
                  required
                  className="h-11 px-3 bg-slate-50 hover:bg-slate-50 focus:bg-white text-xs sm:text-sm font-medium rounded-2xl border border-slate-200 focus:border-[var(--brand)] outline-none"
                />
              </div>
            </div>
          </div>

          <Input
            label="Address"
            type="text"
            value={form.address}
            onChange={(e) => handleFieldChange('address', e.target.value)}
            placeholder="Enter complete residential address"
            helperText={autoFilledFields.has('address') ? 'Auto-filled from map location' : undefined}
            autoFilled={autoFilledFields.has('address')}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Purok / Zone"
              value={form.purok}
              onChange={(e) => handleFieldChange('purok', e.target.value)}
              options={[
                { value: '', label: 'Select Zone...' },
                ...Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Zone ${i + 1}` })),
              ]}
              helperText={autoFilledFields.has('purok') ? 'Auto-filled from map location' : undefined}
              autoFilled={autoFilledFields.has('purok')}
            />
            <Input
              label="Age"
              type="number"
              value={form.age}
              onChange={(e) => updateField('age', e.target.value)}
              placeholder="Enter age (10-55)"
            />
            <Input
              label="Contact Number"
              type="text"
              value={form.contact_number}
              onChange={(e) => updateField('contact_number', e.target.value)}
              placeholder="09xx xxx xxxx"
            />
          </div>
        </div>

        {/* Section 2: Obstetric Details */}
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 sm:p-7 space-y-5">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <FileText size={18} className="text-indigo-600" />
            <span>Obstetric History &amp; Measurements</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="LMP (Last Menstrual Period)"
              type="date"
              value={form.lmp}
              onChange={(e) => updateField('lmp', e.target.value)}
            />
            <Input
              label="EDC (Expected Date)"
              type="date"
              value={form.edd}
              readOnly
              helperText="Auto-computed from LMP"
            />
            <Select
              label="Gravida (G)"
              value={form.gravida}
              onChange={(e) => updateField('gravida', e.target.value)}
              options={[
                { value: '', label: 'Select...' },
                ...GRAVIDA_OPTIONS.map((i) => ({ value: String(i), label: `G${i}` })),
              ]}
            />
            <Select
              label="Para (P)"
              value={form.para}
              onChange={(e) => updateField('para', e.target.value)}
              options={[
                { value: '', label: 'Select...' },
                ...PARA_OPTIONS.map((i) => ({ value: String(i), label: `P${i}` })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Blood Pressure"
              value={form.blood_pressure}
              onChange={(e) => updateField('blood_pressure', e.target.value)}
              options={[
                { value: '', label: 'Select BP...' },
                ...BLOOD_PRESSURE_OPTIONS.map((bp) => ({ value: bp, label: bp })),
              ]}
            />
            <Select
              label="Height (cm)"
              value={form.height_cm}
              onChange={(e) => updateField('height_cm', e.target.value)}
              options={[
                { value: '', label: 'Select height...' },
                ...HEIGHT_OPTIONS_CM.map((cm) => ({ value: String(cm), label: `${cm} cm` })),
              ]}
            />
            <Select
              label="Weight (kg)"
              value={form.weight_kg}
              onChange={(e) => updateField('weight_kg', e.target.value)}
              options={[
                { value: '', label: 'Select weight...' },
                ...WEIGHT_OPTIONS_KG.map((kg) => ({ value: String(kg), label: `${kg} kg` })),
              ]}
            />
          </div>
        </div>

        {/* Section 3: Risk Indicators & Location */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 sm:p-7 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <span>High-Risk Indicators</span>
            </h3>
            {indicators.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No active checklist indicators configured.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {indicators.map((ind) => {
                  const checked = selectedIndicatorIds.includes(ind.id);
                  return (
                    <label
                      key={ind.id}
                      className={`flex items-start gap-3 p-3 rounded-2xl border transition-colors cursor-pointer ${
                        checked ? 'bg-amber-50/70 border-amber-200/80 text-amber-900' : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100/70'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleIndicator(ind.id)}
                        className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-xs font-semibold">{ind.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-slate-400 font-medium pt-2">
              Risk level (High/Low) is automatically evaluated based on age, first pregnancy status, and checked indicators.
            </p>
          </div>

          <div className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 sm:p-7 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <MapPin size={18} className="text-emerald-600" />
              <span>Map Pin (Residence)</span>
            </h3>
            <LocationPicker
              latitude={location.lat}
              longitude={location.lng}
              onChange={(lat, lng) => setLocation({ lat, lng })}
              onLocationDetected={handleLocationDetected}
            />
            <p className="text-[11px] text-slate-400 font-medium">
              Click on the map or drag the pin to set the residence location. Location details will appear below the map. Click "Apply Location to Form" to auto-fill the address and zone fields. Use the fullscreen button for precise house location selection.
            </p>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-200/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/pregnant')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            leftIcon={<UserPlus size={18} />}
          >
            Save Record
          </Button>
        </div>
      </form>
    </div>
  );
}

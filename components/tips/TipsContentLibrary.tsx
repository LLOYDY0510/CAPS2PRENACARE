'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SectionHeading from '@/components/ui/SectionHeading';
import { ADVICE_SEED_LABELS } from '@/utils/tips/autoTips';
import { HIGH_RISK_REFERENCES } from '@/utils/tips/references';
import { HeartPulse, Leaf, Pencil, Save } from 'lucide-react';

export type AdviceCell = { indicator_label: string; month: number; content: string };
export type LowTip = { month: number; content: string };

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function TipsContentLibrary({ advice, lowTips }: { advice: AdviceCell[]; lowTips: LowTip[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const labels = useMemo(() => {
    const seen = new Set(advice.map((cell) => cell.indicator_label));
    return [
      ...ADVICE_SEED_LABELS.filter((label) => seen.has(label)),
      ...[...seen].filter((label) => !ADVICE_SEED_LABELS.includes(label)).sort(),
    ];
  }, [advice]);

  const cellFor = (label: string, month: number) =>
    advice.find((cell) => cell.indicator_label === label && cell.month === month)?.content ?? null;
  const lowFor = (month: number) => lowTips.find((tip) => tip.month === month)?.content ?? null;

  async function saveCell(label: string, month: number) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/tips/advice', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicatorLabel: label, month, content: draft }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? 'Save failed.');
      setEditing(null);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <SectionHeading title="Advised sa mga High Risk per Month" icon={HeartPulse} />
        {error && <p role="alert" className="error-message my-3">{error}</p>}
        {advice.length === 0 ? (
          <p className="text-sm text-neutral-500">Advice content is unavailable until the content update is applied.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <caption className="sr-only">High-risk advice per indicator and pregnancy month</caption>
              <thead>
                <tr>
                  <th scope="col">Risk Indicator</th>
                  {MONTHS.map((month) => <th key={month} scope="col">Month {month}</th>)}
                </tr>
              </thead>
              <tbody>
                {labels.map((label) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {MONTHS.map((month) => {
                      const key = `${label}:${month}`;
                      const content = cellFor(label, month);
                      return (
                        <td key={month} className="min-w-48 align-top">
                          {editing === key ? (
                            <div className="space-y-2">
                              <textarea
                                aria-label={`Advice for ${label}, month ${month}`}
                                className="form-textarea w-full"
                                rows={4}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                              />
                              <div className="flex gap-2">
                                <button className="btn-primary" disabled={busy} onClick={() => saveCell(label, month)}>
                                  <Save size={15} aria-hidden="true" />{busy ? 'Saving…' : 'Save'}
                                </button>
                                <button className="btn-secondary" disabled={busy} onClick={() => setEditing(null)}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm whitespace-pre-wrap">{content ?? '—'}</p>
                              <button
                                className="action-link"
                                aria-label={`Edit advice for ${label}, month ${month}`}
                                onClick={() => { setEditing(key); setDraft(content ?? ''); setError(''); }}
                              >
                                <Pencil size={15} aria-hidden="true" />Edit
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="font-bold text-sm text-neutral-800 mt-6 mb-2">References:</p>
        <div className="rounded-2xl border border-neutral-200 p-4">
          <ol className="list-decimal pl-5 space-y-1 text-sm text-neutral-700">
            {HIGH_RISK_REFERENCES.map((ref) => <li key={ref}>{ref}</li>)}
          </ol>
        </div>
      </section>

      <section className="card p-6">
        <SectionHeading title="Health Tips for Low Risk" icon={Leaf} />
        <div className="overflow-x-auto">
          <table className="data-table">
            <caption className="sr-only">Low-risk health tips per pregnancy month</caption>
            <thead>
              <tr>
                <th scope="col">MONTHS</th>
                <th scope="col">Health tips</th>
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((month) => (
                <tr key={month}>
                  <th scope="row">{month}</th>
                  <td className="whitespace-pre-wrap">{lowFor(month) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

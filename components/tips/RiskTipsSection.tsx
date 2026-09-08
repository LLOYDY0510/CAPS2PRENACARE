'use client';

import { useState } from 'react';
import Link from 'next/link';

export type MatchedIndicatorDetail = {
  id: string;
  label: string;
  indicatorType: string;
  thresholdValue: number | null;
  tipTitle: string;
  tipAdvice: string;
  clinicalAction: string;
  urgency: 'high' | 'moderate';
};

export type AtRiskMother = {
  id: string;
  serialNo: string | null;
  fullName: string;
  age: number | null;
  purok: string | null;
  bloodPressure: string | null;
  contactNumber: string | null;
  riskLevel: string | null;
  matchedIndicators: MatchedIndicatorDetail[];
};

export default function RiskTipsSection({
  mothers,
  availableIndicators,
}: {
  mothers: AtRiskMother[];
  availableIndicators: { id: string; label: string }[];
}) {
  const [search, setSearch]                     = useState('');
  const [selectedIndicator, setSelectedIndicator] = useState<string>('all');
  const [selectedUrgency, setSelectedUrgency]   = useState<string>('all');
  const [copiedId, setCopiedId]                 = useState<string | null>(null);

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filteredMothers = mothers.filter((m) => {
    const q = search.toLowerCase();
    const matchesSearch =
      m.fullName.toLowerCase().includes(q) ||
      (m.serialNo ?? '').toLowerCase().includes(q) ||
      (m.purok ?? '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (selectedIndicator !== 'all') {
      if (!m.matchedIndicators.some((ind) => ind.id === selectedIndicator || ind.label === selectedIndicator))
        return false;
    }

    if (selectedUrgency !== 'all') {
      if (!m.matchedIndicators.some((ind) => ind.urgency === selectedUrgency))
        return false;
    }

    return true;
  });

  const totalMatchedTips   = mothers.reduce((sum, m) => sum + m.matchedIndicators.length, 0);
  const highPriorityCount  = mothers.reduce(
    (sum, m) => sum + m.matchedIndicators.filter((i) => i.urgency === 'high').length, 0
  );

  return (
    <div className="card mb-4">

      {/* ── Section header ── */}
      <div
        className="section-header"
        style={{ padding: '0.875rem 1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <h2 style={{ fontSize: '0.875rem' }}>Automatic Risk Tips &amp; Clinical Advice</h2>
            <span className="badge-high" style={{ fontSize: '0.6rem', letterSpacing: '0.05em' }}>
              LIVE
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.125rem' }}>
            Tips are generated automatically when a registered mother matches an active Risk Indicator.
          </p>
        </div>

        {/* Summary counters */}
        <div className="flex items-center gap-4" style={{ fontSize: '0.75rem' }}>
          <Stat label="Flagged" value={mothers.length} color="var(--danger)" />
          <div style={{ width: '1px', height: '28px', background: 'var(--border)' }} />
          <Stat label="Active Tips" value={totalMatchedTips} color="var(--ink)" />
          <div style={{ width: '1px', height: '28px', background: 'var(--border)' }} />
          <Stat label="High Priority" value={highPriorityCount} color="var(--warning)" />
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          padding: '0.875rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-alt)',
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, serial, or zone…"
          className="form-input"
          style={{ fontSize: '0.8125rem' }}
        />
        <select
          value={selectedIndicator}
          onChange={(e) => setSelectedIndicator(e.target.value)}
          className="form-select"
          style={{ fontSize: '0.8125rem' }}
        >
          <option value="all">All Risk Indicators</option>
          {availableIndicators.map((ind) => (
            <option key={ind.id} value={ind.id}>{ind.label}</option>
          ))}
        </select>
        <select
          value={selectedUrgency}
          onChange={(e) => setSelectedUrgency(e.target.value)}
          className="form-select"
          style={{ fontSize: '0.8125rem' }}
        >
          <option value="all">All Urgency Levels</option>
          <option value="high">High Priority</option>
          <option value="moderate">Moderate</option>
        </select>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '1rem 1.25rem' }}>
        {filteredMothers.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '2.5rem 1rem',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-alt)',
            }}
          >
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.375rem' }}>
              {mothers.length === 0
                ? 'No mothers currently match active Risk Indicators.'
                : 'No results for the selected filter criteria.'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', maxWidth: '420px', margin: '0 auto' }}>
              {mothers.length === 0
                ? 'When a pregnant mother is tagged with an active Risk Indicator, clinical advice will appear here automatically.'
                : 'Try clearing the search or selecting "All Risk Indicators".'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {filteredMothers.map((mother) => (
              <MotherCard
                key={mother.id}
                mother={mother}
                copiedId={copiedId}
                onCopy={handleCopy}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   Mother risk card
   ───────────────────────────────────── */
function MotherCard({
  mother,
  copiedId,
  onCopy,
}: {
  mother: AtRiskMother;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface)',
        overflow: 'hidden',
      }}
    >
      {/* Mother meta */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border-light)',
          background: 'var(--surface-alt)',
        }}
      >
        <div>
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)' }}>
              {mother.fullName}
            </span>
            {mother.serialNo && (
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontFamily: 'monospace',
                  background: 'var(--border)',
                  color: 'var(--muted)',
                  padding: '0.125rem 0.4rem',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {mother.serialNo}
              </span>
            )}
            <span className="badge-high">High Risk</span>
          </div>
          <div
            className="flex gap-4"
            style={{
              marginTop: '0.25rem',
              fontSize: '0.75rem',
              color: 'var(--muted)',
              flexWrap: 'wrap',
            }}
          >
            <span>Zone: {mother.purok ? `${mother.purok}` : '—'}</span>
            <span>Age: {mother.age ?? '—'}</span>
            <span>BP: {mother.bloodPressure ?? '—'}</span>
            {mother.contactNumber && <span>Contact: {mother.contactNumber}</span>}
          </div>
        </div>

        <Link
          href={`/dashboard/pregnant/${mother.id}`}
          className="btn-secondary"
          style={{
            fontSize: '0.75rem',
            padding: '0.25rem 0.625rem',
            whiteSpace: 'nowrap',
            alignSelf: 'flex-start',
          }}
        >
          View Record →
        </Link>
      </div>

      {/* Matched indicators */}
      <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {mother.matchedIndicators.map((item, idx) => {
          const copyKey  = `${mother.id}-${item.id || idx}`;
          const isCopied = copiedId === copyKey;
          const copyText =
            `Advisory for ${mother.fullName} — ${item.label}:\n` +
            `${item.tipAdvice}\n\nRecommended Action: ${item.clinicalAction}`;

          return (
            <TipCard
              key={copyKey}
              item={item}
              isCopied={isCopied}
              onCopy={() => onCopy(copyText, copyKey)}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   Individual tip card
   ───────────────────────────────────── */
function TipCard({
  item,
  isCopied,
  onCopy,
}: {
  item: MatchedIndicatorDetail;
  isCopied: boolean;
  onCopy: () => void;
}) {
  const isHigh = item.urgency === 'high';

  return (
    <div
      style={{
        border: `1px solid ${isHigh ? 'var(--danger-border)' : 'var(--warning-border)'}`,
        borderLeft: `3px solid ${isHigh ? 'var(--danger)' : 'var(--warning)'}`,
        borderRadius: 'var(--radius)',
        background: isHigh ? 'var(--danger-bg)' : 'var(--warning-bg)',
        padding: '0.75rem 0.875rem',
        fontSize: '0.8125rem',
      }}
    >
      {/* Tip header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '0.5rem',
          marginBottom: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.8125rem' }}>
            {item.tipTitle}
          </span>
          <span
            style={{
              fontSize: '0.6875rem',
              color: 'var(--muted)',
              background: 'rgba(0,0,0,0.04)',
              padding: '0.125rem 0.4rem',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Indicator: {item.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={isHigh ? 'badge-high' : 'badge-warning'}
          >
            {isHigh ? 'High Priority' : 'Moderate'}
          </span>
          <button
            type="button"
            onClick={onCopy}
            className="btn-ghost"
            style={{ padding: '0.1875rem 0.5rem', fontSize: '0.6875rem' }}
            title="Copy advisory text"
          >
            {isCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Advice */}
      <p style={{ color: 'var(--ink-secondary)', lineHeight: 1.55, marginBottom: '0.5rem' }}>
        <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>Clinical Advice: </strong>
        {item.tipAdvice}
      </p>

      {/* Action */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.4375rem 0.625rem',
          display: 'flex',
          gap: '0.5rem',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--brand)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
          Nurse Action:
        </span>
        <span style={{ color: 'var(--ink-secondary)', fontSize: '0.75rem', lineHeight: 1.5 }}>
          {item.clinicalAction}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   Inline stat counter
   ───────────────────────────────────── */
function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <p style={{ color: 'var(--muted-2)', fontSize: '0.6875rem', marginBottom: '0.125rem' }}>{label}</p>
      <p style={{ color, fontSize: '1.125rem', fontWeight: 700, lineHeight: 1 }}>{value}</p>
    </div>
  );
}

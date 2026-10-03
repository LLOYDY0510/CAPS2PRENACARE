'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Send, Check, ArrowRight } from 'lucide-react';

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
  const [sendingId, setSendingId]               = useState<string | null>(null);
  const [sentId, setSentId]                     = useState<string | null>(null);

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleSend(mother: AtRiskMother, item: MatchedIndicatorDetail) {
    const message = `${item.tipAdvice}\n\nRecommended action: ${item.clinicalAction}`;
    setSendingId(`${mother.id}-${item.id}`);
    const response = await fetch('/api/notifications/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'risk_alert',
        pregnantMotherId: mother.id,
        title: item.tipTitle,
        message,
      }),
    });
    setSendingId(null);
    if (response.ok) {
      setSentId(`${mother.id}-${item.id}`);
      setTimeout(() => setSentId(null), 2500);
    }
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
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 mb-4">

      {/* ── Section header ── */}
      <div
        className="section-header px-5 py-4 flex-wrap gap-3"
      >
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">Automatic Risk Tips &amp; Clinical Advice</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-red-100 text-red-700 border border-red-200">
              LIVE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tips are generated automatically when a registered mother matches an active Risk Indicator.
          </p>
        </div>

        {/* Summary counters */}
        <div className="flex items-center gap-4 text-xs">
          <Stat label="Flagged" value={mothers.length} color="text-red-600" />
          <div className="w-px h-7 bg-slate-200" />
          <Stat label="Active Tips" value={totalMatchedTips} color="text-slate-800" />
          <div className="w-px h-7 bg-slate-200" />
          <Stat label="High Priority" value={highPriorityCount} color="text-amber-600" />
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div
        className="grid gap-3 px-5 py-4 border-b border-slate-200/60 bg-slate-50/50"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, serial, or zone…"
          className="form-input text-xs"
        />
        <select
          value={selectedIndicator}
          onChange={(e) => setSelectedIndicator(e.target.value)}
          className="form-select text-xs"
        >
          <option value="all">All Risk Indicators</option>
          {availableIndicators.map((ind) => (
            <option key={ind.id} value={ind.id}>{ind.label}</option>
          ))}
        </select>
        <select
          value={selectedUrgency}
          onChange={(e) => setSelectedUrgency(e.target.value)}
          className="form-select text-xs"
        >
          <option value="all">All Urgency Levels</option>
          <option value="high">High Priority</option>
          <option value="moderate">Moderate</option>
        </select>
      </div>

      {/* ── Content ── */}
      <div className="p-5">
        {filteredMothers.length === 0 ? (
          <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <p className="text-sm font-semibold text-slate-800 mb-1">
              {mothers.length === 0
                ? 'No mothers currently match active Risk Indicators.'
                : 'No results for the selected filter criteria.'}
            </p>
            <p className="text-xs text-slate-500 max-w-[420px] mx-auto">
              {mothers.length === 0
                ? 'When a pregnant mother is tagged with an active Risk Indicator, clinical advice will appear here automatically.'
                : 'Try clearing the search or selecting "All Risk Indicators".'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {filteredMothers.map((mother) => (
              <MotherCard
                key={mother.id}
                mother={mother}
                copiedId={copiedId}
                onCopy={handleCopy}
                sendingId={sendingId}
                sentId={sentId}
                onSend={handleSend}
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
  sendingId,
  sentId,
  onSend,
}: {
  mother: AtRiskMother;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  sendingId: string | null;
  sentId: string | null;
  onSend: (mother: AtRiskMother, item: MatchedIndicatorDetail) => void;
}) {
  return (
    <div className="border border-slate-200/60 rounded-2xl bg-white overflow-hidden">
      {/* Mother meta */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-slate-200/60 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-slate-800">
              {mother.fullName}
            </span>
            {mother.serialNo && (
              <span className="text-[11px] font-mono bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md">
                {mother.serialNo}
              </span>
            )}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
              High Risk
            </span>
          </div>
          <div className="flex gap-4 mt-1 text-xs text-slate-500 flex-wrap">
            <span>Zone: {mother.purok ? `${mother.purok}` : '—'}</span>
            <span>Age: {mother.age ?? '—'}</span>
            <span>BP: {mother.bloodPressure ?? '—'}</span>
            {mother.contactNumber && <span>Contact: {mother.contactNumber}</span>}
          </div>
        </div>

        <Link
          href={`/dashboard/pregnant/${mother.id}`}
          className="btn-secondary"
        >
          <ArrowRight size={12} className="mr-1" />
          View Record
        </Link>
      </div>

      {/* Matched indicators */}
      <div className="p-4 flex flex-col gap-2.5">
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
              isSending={sendingId === copyKey}
              isSent={sentId === copyKey}
              onSend={() => onSend(mother, item)}
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
  isSending,
  isSent,
  onSend,
}: {
  item: MatchedIndicatorDetail;
  isCopied: boolean;
  onCopy: () => void;
  isSending: boolean;
  isSent: boolean;
  onSend: () => void;
}) {
  const isHigh = item.urgency === 'high';

  return (
    <div
      className={`border-l-4 rounded-xl p-3 text-xs ${
        isHigh
          ? 'border-red-500 bg-red-50/50'
          : 'border-amber-500 bg-amber-50/50'
      }`}
    >
      {/* Tip header row */}
      <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-800">
            {item.tipTitle}
          </span>
          <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
            Indicator: {item.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            isHigh
              ? 'bg-red-100 text-red-700 border border-red-200'
              : 'bg-amber-100 text-amber-700 border border-amber-200'
          }`}>
            {isHigh ? 'High Priority' : 'Moderate'}
          </span>
          <button
            type="button"
            onClick={onCopy}
            className="btn-ghost text-[11px]"
            title="Copy advisory text"
          >
            {isCopied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
          </button>
          <button
            type="button"
            onClick={onSend}
            className="btn-secondary text-[11px]"
            disabled={isSending}
            title="Send this health advice to the pregnant mother"
          >
            {isSending ? 'Sending…' : isSent ? <><Check size={10} /> Sent</> : <><Send size={10} /> Send</>}
          </button>
        </div>
      </div>

      {/* Advice */}
      <p className="text-slate-700 leading-relaxed mb-2">
        <strong className="text-slate-800 font-semibold">Clinical Advice: </strong>
        {item.tipAdvice}
      </p>

      {/* Action */}
      <div className="bg-white border border-slate-200 rounded-lg p-2 flex gap-2">
        <span className="font-semibold text-teal-600 whitespace-nowrap">
          Nurse Action:
        </span>
        <span className="text-slate-600 leading-relaxed">
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
    <div className="text-right">
      <p className="text-[11px] text-slate-400 mb-0.5">{label}</p>
      <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
    </div>
  );
}

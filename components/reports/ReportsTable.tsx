'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import SearchBar from '@/components/ui/SearchBar';
import { Select } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import ReportExport, { type ReportRow } from '@/components/reports/ReportExport';
import RiskBadge from '@/components/ui/RiskBadge';
import StatCard from '@/components/ui/StatCard';
import { Printer, RotateCcw, FileText, Users, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

export type ReportRowWithId = ReportRow & { _id: string };

export type RowMeta = {
  checkupCount: number;
  nextVisit: string | null;
  missedVisits: number;
  upcomingVisits: number;
  latestStatus: 'upcoming' | 'missed' | 'completed' | null;
};

type ReportType =
  | 'all'
  | 'high_risk'
  | 'low_risk'
  | 'missed_checkups'
  | 'upcoming_edc';

const PAGE_SIZE = 10;

const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  {
    value: 'all',
    label: 'All Records',
    description: 'Complete registry of all registered pregnant mothers.',
  },
  {
    value: 'high_risk',
    label: 'High Risk',
    description: 'Mothers currently flagged as high risk.',
  },
  {
    value: 'low_risk',
    label: 'Low Risk',
    description: 'Mothers currently classified as low risk.',
  },
  {
    value: 'missed_checkups',
    label: 'Missed Checkups',
    description: 'Mothers with missed prenatal checkup visits.',
  },
  {
    value: 'upcoming_edc',
    label: 'Upcoming EDC (30 days)',
    description: 'Mothers whose expected delivery date falls within the next 30 days.',
  },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysFromToday(dateStr: string): number {
  const d = new Date(dateStr);
  const t = new Date(today());
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}
function printDate(): string {
  return new Date().toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function ReportsTable({
  rowsWithId,
  meta,
}: {
  rowsWithId: ReportRowWithId[];
  meta: Record<string, RowMeta>;
}) {
  const [reportType, setReportType] = useState<ReportType>('all');
  const [search, setSearch]         = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);

  const zones = useMemo(() => {
    const set = new Set(rowsWithId.map((r) => r.purok).filter(Boolean) as string[]);
    return Array.from(set).sort((a, b) => parseInt(a) - parseInt(b));
  }, [rowsWithId]);

  const byType = useMemo(() => {
    return rowsWithId.filter((r) => {
      switch (reportType) {
        case 'high_risk':
          return r.risk_level === 'high';
        case 'low_risk':
          return r.risk_level === 'low';
        case 'missed_checkups':
          return (meta[r._id]?.missedVisits ?? 0) > 0;
        case 'upcoming_edc':
          if (!r.edd) return false;
          const days = daysFromToday(r.edd);
          return days >= 0 && days <= 30;
        default:
          return true;
      }
    });
  }, [rowsWithId, reportType, meta]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return byType.filter((r) => {
      if (zoneFilter !== 'all' && r.purok !== zoneFilter) return false;
      if (q) {
        const matchName   = (r.name ?? '').toLowerCase().includes(q);
        const matchSerial = String(r.serial_no ?? '').toLowerCase().includes(q);
        if (!matchName && !matchSerial) return false;
      }
      return true;
    });
  }, [byType, search, zoneFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [reportType, search, zoneFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const stats = useMemo(() => ({
    total:    byType.length,
    highRisk: byType.filter((r) => r.risk_level === 'high').length,
    lowRisk:  byType.filter((r) => r.risk_level === 'low').length,
    noCheckup: byType.filter((r) => (meta[r._id]?.checkupCount ?? 0) === 0).length,
  }), [byType, meta]);

  const activeReportDef = REPORT_TYPES.find((t) => t.value === reportType)!;
  const hasSecondary    = search || zoneFilter !== 'all';

  const exportRows: ReportRow[] = filtered.map((row) => {
    return Object.fromEntries(
      Object.entries(row).filter(([key]) => key !== '_id')
    ) as ReportRow;
  });

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* SCREEN CONTROLS */}
      <div className="no-print space-y-6">
        {/* Export & Print Bar */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-md p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">{activeReportDef.label}</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{activeReportDef.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} leftIcon={<Printer size={16} />}>
              Print Report
            </Button>
            <ReportExport records={exportRows} />
          </div>
        </div>

        {/* Report Type Pill Segmented Tabs */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-md p-4 space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Select Report Type
          </p>
          <div className="flex flex-wrap gap-2">
            {REPORT_TYPES.map((t) => {
              const active = reportType === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => { setReportType(t.value); setSearch(''); setZoneFilter('all'); }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                    active
                      ? 'bg-[var(--brand)] text-white shadow-md shadow-teal-700/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Showing Records" value={byType.length} trend="Active report scope" icon={Users} variant="brand" />
          <StatCard title="High Risk" value={stats.highRisk} trend="High risk cases" icon={AlertTriangle} variant="danger" />
          <StatCard title="Low Risk" value={stats.lowRisk} trend="Low risk cases" icon={ShieldCheck} variant="success" />
          <StatCard title="No Checkups" value={stats.noCheckup} trend="Zero recorded visits" icon={HelpCircle} variant="warning" />
        </div>

        {/* Search & Zone Filters */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-md p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="flex-1 min-w-[220px]">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search report by name or serial no..."
              />
            </div>
            {zones.length > 0 && (
              <div className="w-40">
                <Select
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Zones' },
                    ...zones.map((z) => ({ value: z, label: `Zone ${z}` })),
                  ]}
                />
              </div>
            )}
            {hasSecondary && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setZoneFilter('all'); }} leftIcon={<RotateCcw size={14} />}>
                Clear
              </Button>
            )}
          </div>
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
            {filtered.length} of {byType.length} records shown
          </span>
        </div>
      </div>

      {/* PRINT HEADER */}
      <div className="print-only hidden mb-6 pb-4 border-b-2 border-slate-800">
        <h1 className="text-xl font-bold">Prenatrack — {activeReportDef.label}</h1>
        <p className="text-xs text-slate-600 mt-1">{activeReportDef.description}</p>
        <p className="text-xs text-slate-500 mt-2 font-mono">Generated: {printDate()} · {filtered.length} records</p>
      </div>

      {/* REPORT TABLE */}
      <div ref={printRef} className="bg-white rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 overflow-hidden" id="report-table">
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-3">#</th>
                <th className="py-3.5 px-3">Serial No.</th>
                <th className="py-3.5 px-3">Name</th>
                <th className="py-3.5 px-3">Purok</th>
                <th className="py-3.5 px-3">Age</th>
                <th className="py-3.5 px-3">Contact Number</th>
                <th className="py-3.5 px-3">LMP</th>
                <th className="py-3.5 px-3">EDC</th>
                <th className="py-3.5 px-3">G-P</th>
                <th className="py-3.5 px-3">Visits</th>
                <th className="py-3.5 px-3">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-slate-400 font-medium">
                    No records match the report criteria.
                  </td>
                </tr>
              )}
              {paginated.map((r, idx) => {
                const rowNumber = (currentPage - 1) * PAGE_SIZE + idx + 1;
                return (
                  <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 text-slate-400 font-semibold">{rowNumber}</td>
                    <td className="py-3.5 px-3 font-mono text-xs font-semibold text-slate-500">{r.serial_no ?? '—'}</td>
                    <td className="py-3.5 px-3 font-bold text-slate-800">{r.name || '—'}</td>
                    <td className="py-3.5 px-3 text-slate-600 font-medium">{r.purok ? `Zone ${r.purok}` : '—'}</td>
                    <td className="py-3.5 px-3 text-slate-600 font-medium">{r.age ?? '—'}</td>
                    <td className="py-3.5 px-3 text-slate-600 font-medium">{r.contact_number ?? '—'}</td>
                    <td className="py-3.5 px-3 text-slate-600 font-medium">{r.lmp ?? '—'}</td>
                    <td className="py-3.5 px-3 text-slate-600 font-medium">{r.edd ?? '—'}</td>
                    <td className="py-3.5 px-3 text-slate-600 font-medium">{r.gravida_para ?? '—'}</td>
                    <td className="py-3.5 px-3 font-bold text-slate-800">{meta[r._id]?.checkupCount ?? 0}</td>
                    <td className="py-3.5 px-3">
                      <RiskBadge riskLevel={r.risk_level} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Component */}
        <div className="no-print">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filtered.length}
            itemsPerPage={PAGE_SIZE}
          />
        </div>
      </div>
    </div>
  );
}

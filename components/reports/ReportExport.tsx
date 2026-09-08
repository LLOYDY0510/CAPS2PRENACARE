'use client';

import { useState } from 'react';

export type ReportRow = {
  serial_no: string | number | null;
  date_registered: string | null;
  name: string;
  address: string | null;
  purok: string | null;
  age: number | null;
  contact_number: string | null;
  lmp: string | null;
  edd: string | null;
  gravida_para: string | null;
  blood_pressure: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  risk_level: string | null;
};

const COLUMNS: { key: keyof ReportRow; label: string }[] = [
  { key: 'serial_no',       label: 'Serial No.' },
  { key: 'date_registered', label: 'Date Registered' },
  { key: 'name',            label: 'Name' },
  { key: 'address',         label: 'Address' },
  { key: 'purok',           label: 'Purok' },
  { key: 'age',             label: 'Age' },
  { key: 'contact_number',  label: 'Contact Number' },
  { key: 'lmp',             label: 'LMP' },
  { key: 'edd',             label: 'EDC' },
  { key: 'gravida_para',    label: 'Gravida-Para' },
  { key: 'blood_pressure',  label: 'Blood Pressure' },
  { key: 'height_cm',       label: 'Height (cm)' },
  { key: 'weight_kg',       label: 'Weight (kg)' },
  { key: 'risk_level',      label: 'Risk Level' },
];

function cell(value: unknown): string {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

function filename(ext: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `prenatrack-records-${stamp}.${ext}`;
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportExport({ records }: { records: ReportRow[] }) {
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);

  function exportCsv() {
    setExporting('csv');
    try {
      const header = COLUMNS.map((c) => c.label).join(',');
      const rows   = records.map((r) =>
        COLUMNS.map((c) => {
          const v = cell(r[c.key]);
          return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        }).join(',')
      );
      // UTF-8 BOM so Excel opens Filipino characters correctly
      const blob = new Blob(['\ufeff' + [header, ...rows].join('\n')], {
        type: 'text/csv;charset=utf-8;',
      });
      downloadBlob(blob, filename('csv'));
    } finally {
      setExporting(null);
    }
  }

  async function exportXlsx() {
    setExporting('xlsx');
    try {
      const XLSX = await import('xlsx');
      const data = records.map((r) =>
        Object.fromEntries(COLUMNS.map((c) => [c.label, cell(r[c.key])]))
      );
      const worksheet = XLSX.utils.json_to_sheet(data);
      worksheet['!cols'] = COLUMNS.map(() => ({ wch: 18 }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Pregnant Records');
      const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([arrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      downloadBlob(blob, filename('xlsx'));
    } finally {
      setExporting(null);
    }
  }

  const disabled = exporting !== null || records.length === 0;

  return (
    <div className="flex items-center gap-2 no-print">
      <button
        onClick={exportCsv}
        disabled={disabled}
        className="btn-primary"
      >
        {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
      </button>
      <button
        onClick={exportXlsx}
        disabled={disabled}
        className="btn-secondary"
      >
        {exporting === 'xlsx' ? 'Exporting…' : 'Export Excel (.xlsx)'}
      </button>
    </div>
  );
}

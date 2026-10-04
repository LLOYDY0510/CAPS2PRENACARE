type RiskLevel = string | null | undefined;

/**
 * A mother with no recorded assessment must never be shown to staff as
 * "Low Risk" - that is a clinical misreport. Anything that is not an explicit
 * 'high' or 'low' is rendered as unassessed.
 */
export default function RiskBadge({
  riskLevel,
  className = '',
}: {
  riskLevel: RiskLevel;
  className?: string;
}) {
  if (riskLevel === 'high') {
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 ${className}`}>
        High Risk
      </span>
    );
  }
  if (riskLevel === 'medium') {
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
        Medium Risk
      </span>
    );
  }
  if (riskLevel === 'low') {
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
        Low Risk
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 ${className}`}
      title="No risk assessment on record for this mother"
    >
      Unassessed
    </span>
  );
}

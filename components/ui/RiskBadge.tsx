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
    return <span className={`badge-high ${className}`}>High Risk</span>;
  }
  if (riskLevel === 'medium') {
    return <span className={`badge-medium ${className}`}>Medium Risk</span>;
  }
  if (riskLevel === 'low') {
    return <span className={`badge-low ${className}`}>Low Risk</span>;
  }
  return (
    <span
      className={`badge-neutral ${className}`}
      title="No risk assessment on record for this mother"
    >
      Unassessed
    </span>
  );
}

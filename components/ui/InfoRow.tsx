/**
 * A single label/value pair used by every read-only detail view.
 *
 * Extracted from the page files that had each grown their own private copy
 * (my-info, my-records, the pregnant-mother detail page).
 */
export default function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-muted-2 text-xs mb-0.5">{label}</p>
      <p className="text-gray-800">{value ?? '—'}</p>
    </div>
  );
}

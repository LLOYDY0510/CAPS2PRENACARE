/**
 * The two "nothing to show" states shared by the pregnant-mother portal pages.
 *
 * They were duplicated across my-info, my-records, my-schedule and the
 * dashboard, so the copy is now defined once.
 */

export function AccountNotLinked({ className = '' }: { className?: string }) {
  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <div className="card p-6">
        <h1 className="text-lg mb-2">Account not linked</h1>
        <p className="text-muted">
          Your account is not linked to a prenatal record yet. Please contact your BHW or the
          administrator.
        </p>
      </div>
    </div>
  );
}

export function RecordNotFound({ className = '' }: { className?: string }) {
  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <div className="card p-6">
        <h1 className="text-xl font-semibold mb-2 text-ink">Record not found</h1>
        <p className="text-muted text-sm">
          We couldn&apos;t find your linked record. Please contact your BHW or midwife for help.
        </p>
      </div>
    </div>
  );
}

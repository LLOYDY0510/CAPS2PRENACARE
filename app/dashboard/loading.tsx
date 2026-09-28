export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="page-header">
        <div className="h-6 w-56 rounded bg-[#E2E6EA] animate-pulse" />
        <div className="h-3 w-40 mt-2 rounded bg-[#EEF1F4] animate-pulse" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card">
            <div className="h-3 w-20 rounded bg-[#EEF1F4] animate-pulse" />
            <div className="h-7 w-12 mt-3 rounded bg-[#E2E6EA] animate-pulse" />
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="section-header">
          <div className="h-3.5 w-40 rounded bg-[#E2E6EA] animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-full rounded bg-[#F8FAFB] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

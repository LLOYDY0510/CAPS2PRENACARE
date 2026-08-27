import Link from "next/link";

const FEATURES = [
  {
    title: "Risk mapping",
    body: "See every registered mother plotted on a live map, colored by risk level, so high-risk cases never get missed in a busy purok.",
  },
  {
    title: "Prenatal checkups",
    body: "Log blood pressure, weight, and trimester notes at every visit, building a full history for each mother in one place.",
  },
  {
    title: "SMS reminders",
    body: "Schedule and send checkup reminders straight to a mother's phone, no signal-heavy app required on her end.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      {/* Hero */}
      <section className="bg-ink-dark text-white">
        <div className="max-w-5xl mx-auto px-6 py-24 md:py-32">
          <p className="text-sm font-medium tracking-wide text-brand mb-4">
            For barangay health workers &amp; midwives
          </p>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.05] max-w-2xl mb-6">
            Every pregnant mother in your barangay, tracked with care.
          </h1>
          <p className="text-white/70 max-w-lg text-lg mb-10">
            Prenatrack helps BHWs and midwives register mothers, monitor
            prenatal checkups, flag high-risk cases, and follow up by SMS —
            all from one shared record.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center bg-brand text-white font-semibold px-7 py-3 rounded-lg hover:bg-brand-dark transition"
          >
            Log in to your dashboard
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="flex-1 bg-background">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-semibold text-ink mb-2">
            Built around how puroks actually work
          </h2>
          <p className="text-muted max-w-xl mb-12">
            One record per mother, shared across roles — from the BHW who
            registers her, to the midwife who follows up.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6">
                <h3 className="text-lg font-semibold text-ink mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5 py-6">
        <p className="text-center text-xs text-muted-2">
          Prenatrack — a maternal health tracking tool for community health
          workers.
        </p>
      </footer>
    </div>
  );
}

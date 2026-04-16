import Link from "next/link";
import { db } from "@/db";
import { creditApplications } from "@/db/schema";
import { count } from "drizzle-orm";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  FilePenLine,
  LayoutDashboard,
  Plus,
  Send,
} from "lucide-react";

export default async function Home() {
  const stats = { total: 0, draft: 0, submitted: 0, decided: 0 };
  try {
    const rows = await db
      .select({ status: creditApplications.status, cnt: count() })
      .from(creditApplications)
      .groupBy(creditApplications.status);
    for (const r of rows) {
      stats.total += r.cnt;
      if (r.status === "draft") stats.draft += r.cnt;
      if (r.status === "submitted") stats.submitted += r.cnt;
      if (
        ["approved", "approved_with_adjustments", "rejected"].includes(r.status)
      )
        stats.decided += r.cnt;
    }
  } catch {
    // DB might not be ready yet
  }

  return (
    <div className="flex flex-col">
      {/* Hero — light, airy, single focal column + preview */}
      <section className="relative border-b border-slate-200/60 bg-gradient-to-b from-white via-slate-50/40 to-transparent">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 top-0 h-[420px] w-[420px] rounded-full bg-indigo-100/50 blur-3xl" />
          <div className="absolute -left-32 bottom-0 h-[280px] w-[280px] rounded-full bg-violet-100/40 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-16">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                Mini Credit
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
                Credit applications, without the friction.
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                Draft once, send a secure link, and decide when the form comes
                back — clear steps, no clutter.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/applications/new"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/20 transition hover:from-indigo-600 hover:to-indigo-700"
                >
                  <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                  New application
                </Link>
                <Link
                  href="/applications"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-500" />
                  Dashboard
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              </div>

              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Secure recipient links
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Upload to pre-fill
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  Approve or adjust in one view
                </li>
              </ul>
            </div>

            {/* Hero visual — workflow illustration (not placeholder skeletons) */}
            <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
              <div
                className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-indigo-100/60 via-white to-violet-100/50 blur-2xl lg:-inset-6"
                aria-hidden
              />
              <div
                className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_50px_-12px_rgb(15_23_42/0.12)]"
                role="img"
                aria-label="Illustration: create an application, send a link, then review and decide"
              >
                <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
                <div className="p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                        Flow
                      </p>
                      <p className="mt-1 text-base font-semibold tracking-tight text-slate-900">
                        From draft to decision
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200/80">
                      Overview
                    </span>
                  </div>

                  <ol className="relative mt-8 space-y-0">
                    {[
                      {
                        Icon: FilePenLine,
                        title: "Create",
                        body: "Blank form or upload to extract fields.",
                        state: "done" as const,
                      },
                      {
                        Icon: Send,
                        title: "Send",
                        body: "One secure link for your recipient.",
                        state: "current" as const,
                      },
                      {
                        Icon: ClipboardCheck,
                        title: "Decide",
                        body: "Approve, adjust terms, or decline.",
                        state: "upcoming" as const,
                      },
                    ].map((row, i, arr) => {
                      const isLast = i === arr.length - 1;
                      const segmentTint =
                        row.state === "done" ? "bg-indigo-200" : "bg-slate-200";
                      return (
                        <li key={row.title} className="flex gap-4 pb-8 last:pb-0">
                          <div className="relative flex w-8 shrink-0 flex-col items-center">
                            {!isLast && (
                              <span
                                className={`absolute left-1/2 top-8 bottom-0 w-px -translate-x-1/2 ${segmentTint}`}
                                aria-hidden
                              />
                            )}
                            <span
                              className={`relative z-[1] flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                                row.state === "done"
                                  ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                                  : row.state === "current"
                                    ? "border-indigo-500 bg-white text-indigo-600 shadow-sm ring-4 ring-indigo-100"
                                    : "border-slate-200 bg-slate-50 text-slate-400"
                              }`}
                            >
                              {row.state === "done" ? (
                                <Check className="h-4 w-4" strokeWidth={3} />
                              ) : (
                                <row.Icon className="h-4 w-4" strokeWidth={2} />
                              )}
                            </span>
                          </div>
                          <div className="min-w-0 pt-0.5">
                            <p
                              className={`text-sm font-semibold ${
                                row.state === "upcoming"
                                  ? "text-slate-400"
                                  : "text-slate-900"
                              }`}
                            >
                              {row.title}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                              {row.body}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {stats.total > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-10 sm:pb-12">
          <div className="rounded-2xl border border-slate-200/90 bg-white px-6 py-8 shadow-sm sm:px-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Your workspace
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-6">
              {[
                {
                  label: "Total",
                  value: stats.total,
                  dot: "bg-slate-400",
                },
                { label: "Drafts", value: stats.draft, dot: "bg-slate-300" },
                {
                  label: "Awaiting review",
                  value: stats.submitted,
                  dot: "bg-violet-500",
                },
                { label: "Decided", value: stats.decided, dot: "bg-emerald-500" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`}
                    />
                    <span className="text-xs font-medium text-slate-500">
                      {s.label}
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 border-t border-slate-100 pt-6">
              <Link
                href="/applications"
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
              >
                Open dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Steps */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            How it works
          </h2>
          <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Three steps from draft to decision
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Create",
              desc: "Start from a blank form or upload a document to extract fields automatically.",
              icon: FilePenLine,
              accent: "text-indigo-600 bg-indigo-50 ring-indigo-100",
            },
            {
              step: "2",
              title: "Send",
              desc: "Share one link with your recipient. They complete the form on their own time.",
              icon: Send,
              accent: "text-sky-700 bg-sky-50 ring-sky-100",
            },
            {
              step: "3",
              title: "Decide",
              desc: "Review the submission and approve, adjust terms, or reject — all in one place.",
              icon: ClipboardCheck,
              accent: "text-emerald-700 bg-emerald-50 ring-emerald-100",
            },
          ].map((f) => (
            <div
              key={f.step}
              className="group relative rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div
                className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${f.accent}`}
              >
                <f.icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Step {f.step}
              </p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

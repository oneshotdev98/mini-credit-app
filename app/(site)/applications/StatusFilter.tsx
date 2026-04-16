"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { formatStatus } from "@/lib/utils";

const STATUS_ORDER = [
  "draft",
  "sent",
  "submitted",
  "approved",
  "approved_with_adjustments",
  "rejected",
] as const;

const chipInactive: Record<string, string> = {
  draft: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
  sent: "border-sky-200/80 bg-sky-50/40 text-sky-800 hover:bg-sky-50",
  submitted: "border-violet-200/80 bg-violet-50/40 text-violet-800 hover:bg-violet-50",
  approved: "border-emerald-200/80 bg-emerald-50/40 text-emerald-800 hover:bg-emerald-50",
  approved_with_adjustments:
    "border-amber-200/80 bg-amber-50/40 text-amber-900 hover:bg-amber-50",
  rejected: "border-red-200/80 bg-red-50/40 text-red-800 hover:bg-red-50",
};

const chipActive: Record<string, string> = {
  draft: "bg-slate-800 text-white border-slate-800 shadow-sm",
  sent: "bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-600/20",
  submitted: "bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-600/25",
  approved: "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20",
  approved_with_adjustments:
    "bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-600/20",
  rejected: "bg-red-600 text-white border-red-600 shadow-sm shadow-red-600/20",
};

export default function StatusFilter({
  counts,
  total,
  activeStatus,
}: {
  counts: Record<string, number>;
  total: number;
  activeStatus: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setStatus(status: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    router.push(`/applications?${params.toString()}`);
  }

  return (
    <div
      role="tablist"
      aria-label="Filter by status"
      className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:thin]"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!activeStatus}
        onClick={() => setStatus(null)}
        className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full border transition-all ${
          !activeStatus
            ? "bg-slate-900 text-white border-slate-900 shadow-md"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        All
        <span
          className={`tabular-nums rounded-md px-1.5 py-0.5 text-[10px] ${
            !activeStatus ? "bg-white/15" : "bg-slate-100 text-slate-500"
          }`}
        >
          {total}
        </span>
      </button>
      {STATUS_ORDER.map((s) =>
        counts[s] ? (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={activeStatus === s}
            onClick={() => setStatus(s)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full border transition-all ${
              activeStatus === s ? chipActive[s] : chipInactive[s]
            }`}
          >
            {formatStatus(s)}
            <span
              className={`tabular-nums rounded-md px-1.5 py-0.5 text-[10px] ${
                activeStatus === s ? "bg-black/10" : "bg-white/60 text-slate-500"
              }`}
            >
              {counts[s]}
            </span>
          </button>
        ) : null
      )}
    </div>
  );
}

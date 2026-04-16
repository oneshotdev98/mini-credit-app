"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CREDIT_TERMS } from "@/lib/utils";

export default function DecisionPanel({
  applicationId,
}: {
  applicationId: string;
}) {
  const router = useRouter();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);

  async function postDecision(body: Record<string, unknown>) {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to record decision.");
        return;
      }
      if (data.message) {
        setSuccess(data.message);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 animate-fade">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div>
            <p className="font-semibold text-emerald-800 text-sm">Decision Recorded</p>
            <p className="text-sm text-emerald-700 mt-1">{success}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-card-solid overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/40">
        <div className="w-9 h-9 rounded-xl bg-violet-50 ring-1 ring-violet-100 flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Review & decision</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Choose an outcome. Adjustments and rejection ask for confirmation.
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 mb-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={pending}
            onClick={() => postDecision({ decision: "approved" })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Approve
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAdjust(!showAdjust);
              setConfirmReject(false);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
              showAdjust
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Adjust Terms
          </button>

          <button
            type="button"
            onClick={() => {
              setConfirmReject(!confirmReject);
              setShowAdjust(false);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
              confirmReject
                ? "bg-red-600 text-white border-red-600"
                : "bg-white text-red-600 border-red-200 hover:bg-red-50"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            Reject
          </button>
        </div>

        {showAdjust && (
          <form
            onSubmit={async (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const revisedAmount = (fd.get("revisedAmount") as string)?.trim() || null;
              const revisedTermRaw = fd.get("revisedTerm") as string;
              const revisedTerm =
                revisedTermRaw && String(revisedTermRaw).trim() !== ""
                  ? revisedTermRaw
                  : null;
              await postDecision({
                decision: "approved_with_adjustments",
                revisedAmount,
                revisedTerm,
              });
            }}
            className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 animate-fade"
          >
            <p className="text-sm font-medium text-amber-800 mb-3">
              Specify adjusted credit terms:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="revisedAmount" className="!text-amber-700">
                  Revised Credit Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
                    $
                  </span>
                  <input
                    id="revisedAmount"
                    name="revisedAmount"
                    type="text"
                    placeholder="25,000"
                    style={{ paddingLeft: "1.5rem" }}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="revisedTerm" className="!text-amber-700">
                  Revised Credit Term
                </label>
                <select id="revisedTerm" name="revisedTerm">
                  <option value="">No change</option>
                  {CREDIT_TERMS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdjust(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 rounded-md hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {pending && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                )}
                Approve with Adjustments
              </button>
            </div>
          </form>
        )}

        {confirmReject && (
          <form
            onSubmit={async (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              await postDecision({ decision: "rejected" });
            }}
            className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 animate-fade"
          >
            <p className="text-sm text-red-800 mb-4">
              Are you sure you want to reject this application? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmReject(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 rounded-md hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {pending && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                )}
                Confirm Rejection
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

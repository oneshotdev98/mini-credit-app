"use client";

import { useEffect, useState } from "react";

type Props = {
  applicationId: string;
  initialSummary: string | null;
  fetchIfEmpty?: boolean;
};

export default function AiAdvisoryCard({
  applicationId,
  initialSummary,
  fetchIfEmpty = true,
}: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(
    () => !initialSummary?.trim() && fetchIfEmpty
  );
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);

  useEffect(() => {
    if (initialSummary?.trim()) {
      setSummary(initialSummary);
      setLoading(false);
      return;
    }

    if (!fetchIfEmpty) {
      setSummary(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setUnavailable(null);
      try {
        const res = await fetch(
          `/api/applications/${encodeURIComponent(applicationId)}/ai-recommendation`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
        );
        const data = (await res.json()) as {
          summary?: string | null;
          unavailableReason?: string | null;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Could not load advisory summary.");
          return;
        }
        if (data.summary) {
          setSummary(data.summary);
        } else if (data.unavailableReason === "no_ai_key") {
          setUnavailable(
            "Advisory AI summary is not configured (set GROQ_API_KEY on the server)."
          );
        } else if (data.unavailableReason === "not_submitted") {
          setUnavailable(null);
        } else {
          setUnavailable(
            "Advisory summary could not be generated right now. You can still decide using the submission details."
          );
        }
      } catch {
        if (!cancelled) {
          setError("Could not load advisory summary.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applicationId, initialSummary, fetchIfEmpty]);

  if (loading) {
    return (
      <div className="app-card-solid overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/40">
          <div className="w-9 h-9 rounded-xl bg-slate-100 ring-1 ring-slate-200/80 flex items-center justify-center shrink-0">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-slate-500 animate-spin"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
              AI advisory summary
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Generating…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 mb-6">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (unavailable && !summary) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
          AI advisory summary
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">{unavailable}</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="app-card-solid overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r from-violet-50/50 to-white">
        <div className="w-9 h-9 rounded-xl bg-violet-100 ring-1 ring-violet-200/60 flex items-center justify-center shrink-0">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6d28d9"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 6V2H8" />
            <path d="M16 6h4v4" />
            <path d="m2 18 6-6" />
            <path d="m8 8 10 10" />
            <circle cx="12" cy="12" r="2" />
            <path d="M18 12h.01" />
          </svg>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
            AI advisory summary
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Non-binding suggestion for discussion. You remain the decision-maker.
          </p>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
          {summary}
        </pre>
      </div>
    </div>
  );
}

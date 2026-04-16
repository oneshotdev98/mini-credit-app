"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function SendPanel({
  applicationId,
}: {
  applicationId: string;
}) {
  const router = useRouter();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const recipientName = (fd.get("recipientName") as string)?.trim();
    const recipientEmail = (fd.get("recipientEmail") as string)?.trim();

    try {
      const res = await fetch(`/api/applications/${applicationId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientName, recipientEmail }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to send.");
        return;
      }
      setSuccess(data.message ?? "Application sent.");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/90 p-5 shadow-sm ring-1 ring-emerald-100/80 animate-fade">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div>
            <p className="font-semibold text-emerald-900 text-sm">
              Application sent
            </p>
            <p className="text-sm text-emerald-800/95 mt-1.5 leading-relaxed">
              {success}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-200/70 bg-gradient-to-b from-white via-indigo-50/40 to-white shadow-md shadow-indigo-900/[0.06] ring-1 ring-indigo-100/80 overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-indigo-100/80 bg-indigo-50/30">
        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-2">
          Next step
        </p>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
              Send to recipient
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              They get an email with a private link to complete and submit the
              application.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200/90 mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p className="text-sm text-red-800 leading-snug">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3.5">
            <div>
              <label htmlFor="recipientName" className="text-xs font-semibold text-slate-600">
                Recipient name <span className="text-red-500">*</span>
              </label>
              <input
                id="recipientName"
                name="recipientName"
                type="text"
                required
                autoComplete="name"
                placeholder="Jane Smith"
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="recipientEmail" className="text-xs font-semibold text-slate-600">
                Recipient email <span className="text-red-500">*</span>
              </label>
              <input
                id="recipientEmail"
                name="recipientEmail"
                type="email"
                required
                autoComplete="email"
                placeholder="jane@company.com"
                className="mt-1.5"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-500/30 ring-1 ring-indigo-500/20"
          >
            {pending ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            )}
            {pending ? "Sending…" : "Send application"}
          </button>
        </form>
      </div>
    </div>
  );
}

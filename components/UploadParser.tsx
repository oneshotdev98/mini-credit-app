"use client";

import { useState, useRef } from "react";
import type { CustomFieldDefinition } from "@/lib/custom-field-definitions";

type ParsedData = {
  companyName?: string | null;
  dba?: string | null;
  countryOfIncorporation?: string | null;
  websiteUrl?: string | null;
  creditAmountRequested?: string | null;
  creditTermRequested?: string | null;
  revenueBand?: string | null;
  billingContactName?: string | null;
  billingContactEmail?: string | null;
  tradeRef1?: {
    businessName?: string | null;
    engagementStart?: string | null;
    engagementEnd?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPosition?: string | null;
  };
  tradeRef2?: {
    businessName?: string | null;
    engagementStart?: string | null;
    engagementEnd?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPosition?: string | null;
  };
};

export type CustomFieldCandidate = {
  label: string;
  value: string | null;
};

export type UploadApplyPayload = {
  data: ParsedData;
  customFieldValues: Record<string, string>;
  customFieldDefinitions: CustomFieldDefinition[];
};

type Props = {
  onApplyToForm: (payload: UploadApplyPayload) => void;
};

function squish(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Strip decorative quotes and extra spaces from parser output. */
function stripQuotes(s: string): string {
  let t = squish(s);
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return squish(t);
}

function normalizeForCompare(s: string): string {
  return stripQuotes(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** True when the extracted value repeats the label (common with ALL-CAPS docs). */
function isRedundantLabelValue(label: string, value: string | null): boolean {
  if (value == null || !String(value).trim()) return false;
  const a = normalizeForCompare(label);
  const b = normalizeForCompare(String(value));
  return a.length > 0 && b.length > 0 && a === b;
}

/** Soften ALL CAPS for on-screen reading; keep original in form submit via API. */
function formatExtractedPreview(value: string): string {
  const v = stripQuotes(value);
  if (!v) return v;
  const letters = v.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 2) return v;
  const upperRatio =
    [...letters].filter((c) => c === c.toUpperCase()).length / letters.length;
  if (upperRatio < 0.65) return v;
  return v
    .toLowerCase()
    .split(/(\s+)/)
    .map((w) => {
      if (/^\s+$/.test(w) || !w.length) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join("");
}

export default function UploadParser({ onApplyToForm }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [droppedFields, setDroppedFields] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [candidates, setCandidates] = useState<CustomFieldCandidate[]>([]);
  /** Indices of candidates the user wants as additional form fields */
  const [selectedCandidateIdx, setSelectedCandidateIdx] = useState<
    Set<number>
  >(() => new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const resetFileInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const clearReadyState = () => {
    setParsedData(null);
    setCandidates([]);
    setSelectedCandidateIdx(new Set());
    setDroppedFields([]);
    setFile(null);
    resetFileInput();
  };

  const handleFile = async (f: File) => {
    setFile(f);
    setError(null);
    setDroppedFields([]);
    setParsedData(null);
    setCandidates([]);
    setSelectedCandidateIdx(new Set());
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", f);

      const res = await fetch("/api/upload-parse", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to parse file");
      }

      const result = (await res.json()) as {
        data: ParsedData;
        droppedFields?: string[];
        customFieldCandidates?: CustomFieldCandidate[];
      };

      const dropped = Array.isArray(result.droppedFields)
        ? result.droppedFields
        : [];
      if (dropped.length > 0) {
        setDroppedFields(dropped);
      }

      setParsedData(result.data);
      setCandidates(
        Array.isArray(result.customFieldCandidates)
          ? result.customFieldCandidates
          : []
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to parse the uploaded file.");
    } finally {
      setParsing(false);
      resetFileInput();
    }
  };

  async function applyToForm() {
    if (!parsedData) return;
    setApplying(true);
    setError(null);
    try {
      const selections = candidates.filter((_, i) =>
        selectedCandidateIdx.has(i)
      );

      const res = await fetch("/api/custom-field-definitions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections }),
      });

      const out = (await res.json()) as {
        error?: string;
        definitions?: CustomFieldDefinition[];
        values?: Record<string, string>;
      };

      if (!res.ok) {
        throw new Error(out.error ?? "Could not apply extra fields.");
      }

      onApplyToForm({
        data: parsedData,
        customFieldDefinitions: out.definitions ?? [],
        customFieldValues: out.values ?? {},
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to apply to form.");
    } finally {
      setApplying(false);
    }
  }

  function toggleCandidate(index: number) {
    setSelectedCandidateIdx((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="space-y-5 animate-in">
      <div
        className={`relative rounded-2xl border-2 border-dashed p-10 sm:p-12 text-center transition-all ${
          parsedData
            ? "border-slate-200 bg-slate-50/50 cursor-default"
            : dragOver
              ? "border-indigo-400 bg-indigo-50/80 shadow-inner ring-2 ring-indigo-200/50 cursor-pointer"
              : "border-slate-300/90 bg-white/90 hover:border-indigo-300 hover:bg-indigo-50/30 shadow-sm cursor-pointer"
        }`}
        onDragOver={(e) => {
          if (parsedData) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (parsedData) return;
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) void handleFile(f);
        }}
        onClick={() => {
          if (!parsedData && !parsing) inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />

        {parsing ? (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            </div>
            <p className="text-sm font-medium text-gray-900">
              Parsing {file?.name}...
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Extracting fields from your document
            </p>
          </div>
        ) : parsedData ? (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <p className="text-sm font-medium text-gray-900">
              Ready to apply
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {file?.name ? (
                <>
                  Extracted data from <span className="font-medium text-gray-700">{file.name}</span>.
                  Review optional extra fields below, then apply to the form.
                </>
              ) : (
                "Review optional extra fields below, then apply to the form."
              )}
            </p>
            <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-center">
              <button
                type="button"
                disabled={applying}
                onClick={(e) => {
                  e.stopPropagation();
                  void applyToForm();
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-md shadow-indigo-500/25 ring-1 ring-indigo-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                )}
                {applying ? "Applying…" : "Apply extracted data to form"}
              </button>
              <button
                type="button"
                disabled={applying}
                onClick={(e) => {
                  e.stopPropagation();
                  clearReadyState();
                  setError(null);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Upload another file
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <p className="text-sm font-medium text-gray-900">
              Drop a file here or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports PDF, DOC, DOCX, TXT, CSV
            </p>
          </div>
        )}
      </div>

      {parsedData && candidates.length > 0 ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white text-left shadow-[0_1px_3px_rgb(15_23_42/0.06)] ring-1 ring-slate-900/[0.04] overflow-hidden">
          <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 tracking-tight">
                  Optional extra fields
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  Tick only what you want in{" "}
                  <span className="text-slate-600">Additional information</span>.
                  Others are ignored.
                </p>
              </div>
            </div>
          </div>
          <ul className="max-h-[min(22rem,55vh)] overflow-y-auto overscroll-contain divide-y divide-slate-100">
            {candidates.map((c, i) => {
              const redundant = isRedundantLabelValue(c.label, c.value);
              const selected = selectedCandidateIdx.has(i);
              return (
                <li key={`${c.label}-${i}`}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 px-4 py-3 sm:px-5 transition-colors ${
                      selected
                        ? "bg-indigo-50/70"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/30 focus:ring-offset-0"
                      checked={selected}
                      onChange={() => toggleCandidate(i)}
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-medium text-slate-900 leading-snug">
                        {squish(c.label)}
                      </p>
                      {c.value && !redundant ? (
                        <p className="text-[13px] leading-relaxed text-slate-600 line-clamp-3">
                          {formatExtractedPreview(c.value)}
                        </p>
                      ) : !c.value ? (
                        <p className="text-xs text-slate-400">
                          No value extracted
                        </p>
                      ) : null}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                clearReadyState();
              }}
              className="text-xs text-red-600 underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {droppedFields.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div>
            <p className="text-sm font-medium text-amber-800">
              Some content was not mapped to fields:
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {droppedFields.map((f) => (
                <li key={f} className="text-xs text-amber-700">
                  &bull; {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="app-card-solid p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              How upload works
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Standard fields (company, credit, billing, etc.) are filled from
              the document. Extra labeled items appear in the checklist
              above—only checked items are added as additional form fields for
              this and future applications. You can upload again at any time
              from this tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

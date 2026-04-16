"use client";

import { useState, useRef } from "react";

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

type Props = {
  onParsed: (data: ParsedData) => void;
};

export default function UploadParser({ onParsed }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [droppedFields, setDroppedFields] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setError(null);
    setDroppedFields([]);
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

      const result = await res.json();

      if (result.droppedFields?.length > 0) {
        setDroppedFields(result.droppedFields);
      }

      setSuccess(true);
      setParsing(false);

      setTimeout(() => {
        onParsed(result.data);
      }, 1500);
    } catch (e: any) {
      setError(e.message || "Failed to parse the uploaded file.");
      setParsing(false);
    }
  };

  return (
    <div className="space-y-5 animate-in">
      <div
        className={`relative rounded-2xl border-2 border-dashed p-10 sm:p-12 text-center cursor-pointer transition-all ${
          dragOver
            ? "border-indigo-400 bg-indigo-50/80 shadow-inner ring-2 ring-indigo-200/50"
            : "border-slate-300/90 bg-white/90 hover:border-indigo-300 hover:bg-indigo-50/30 shadow-sm"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
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
        ) : success ? (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <p className="text-sm font-medium text-gray-900">
              Parsed successfully!
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Loading form with extracted data...
            </p>
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

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setFile(null);
              }}
              className="text-xs text-red-600 underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Dropped Fields */}
      {droppedFields.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div>
            <p className="text-sm font-medium text-amber-800">
              Some fields from the upload were not supported:
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
              Upload an existing credit application document. The system will
              extract supported fields into an editable form. Any fields not
              supported will be listed so you know what was dropped. You can
              review and edit all extracted data before saving.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import "./pdfjs-node-polyfill";
import path from "node:path";
import { pathToFileURL } from "node:url";

export async function extractPdfText(buf: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { getDocument, GlobalWorkerOptions } = pdfjs;

  const workerFile = path.join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "build",
    "pdf.worker.mjs"
  );
  GlobalWorkerOptions.workerSrc = pathToFileURL(workerFile).href;

  const data = new Uint8Array(buf.byteLength);
  data.set(buf);

  const loadingTask = getDocument({
    data,
    stopAtErrors: false,
    verbosity: 0,
    useSystemFonts: true,
    isEvalSupported: false,
  });

  let doc: Awaited<typeof loadingTask.promise>;
  try {
    doc = await loadingTask.promise;
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    if (/xref|XRef|InvalidPDF|PasswordException/i.test(raw)) {
      throw new Error(
        "This PDF could not be read. Try exporting it again from your editor as PDF, or save a copy as DOCX and upload that instead."
      );
    }
    throw e instanceof Error ? e : new Error(raw);
  }

  const parts: string[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      let lastY: number | undefined;
      for (const item of textContent.items) {
        if (!("str" in item) || typeof item.str !== "string") continue;
        const y = "transform" in item ? item.transform[5] : undefined;
        if (lastY !== undefined && y !== undefined && y !== lastY) {
          parts.push("\n");
        }
        parts.push(item.str);
        lastY = y;
      }
      parts.push("\n\n");
    }
  } finally {
    await doc.destroy().catch(() => undefined);
  }

  return parts.join("").trim();
}

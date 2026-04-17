import DOMMatrixShim from "@thednp/dommatrix";

const g = globalThis as typeof globalThis & {
  DOMMatrix?: typeof DOMMatrix;
};

if (typeof g.DOMMatrix === "undefined") {
  g.DOMMatrix = DOMMatrixShim as unknown as typeof DOMMatrix;
}

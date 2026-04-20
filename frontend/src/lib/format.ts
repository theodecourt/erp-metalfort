export const fmtBRL = (n: number | string): string =>
  Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtDec = (n: number | string, digits = 2): string =>
  Number(n).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const fmtInt = (n: number | string): string =>
  Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

// Units sold/counted as whole items — quantity always integer.
const INTEGER_UNITS = new Set(['pc', 'cx', 'und', 'bd', 'rl', 'sc', 'ct']);

// Formats an estoque quantity based on material unit:
//   integer units (pc, cx, und, ...) → no decimals
//   measured units  (kg, m, m2, ...) → 2 decimals
export const fmtQtd = (n: number | string, unidade: string | null | undefined): string =>
  INTEGER_UNITS.has((unidade ?? '').toLowerCase()) ? fmtInt(n) : fmtDec(n, 2);

export const fmtBRL = (n: number | string): string =>
  Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtDec = (n: number | string, digits = 2): string =>
  Number(n).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const fmtInt = (n: number | string): string =>
  Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

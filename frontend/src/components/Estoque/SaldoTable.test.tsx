import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SaldoTable from './SaldoTable';
import type { SaldoRow } from '../../lib/estoque';

const rows: SaldoRow[] = [
  {
    material_id: 'a',
    sku: 'MT-FCH-001',
    nome: 'Placa Glasroc-X',
    categoria: 'fechamento',
    unidade: 'pc',
    saldo: '15',
    estoque_minimo: '40',
    abaixo_minimo: true,
    preco_unitario: '219.90',
  },
  {
    material_id: 'b',
    sku: 'MT-LSF-001',
    nome: 'Perfil LSF',
    categoria: 'estrutura',
    unidade: 'kg',
    saldo: '800',
    estoque_minimo: '500',
    abaixo_minimo: false,
    preco_unitario: '14.00',
  },
];

describe('SaldoTable', () => {
  it('renders both rows with sku and saldo', () => {
    render(<SaldoTable rows={rows} />);
    expect(screen.getByText('MT-FCH-001')).toBeInTheDocument();
    expect(screen.getByText('MT-LSF-001')).toBeInTheDocument();
  });

  it('shows "abaixo do mínimo" badge only on rows where the flag is true', () => {
    render(<SaldoTable rows={rows} />);
    const badges = screen.queryAllByText(/abaixo do mínimo/i);
    expect(badges).toHaveLength(1);
  });

  it('highlights negative saldo with danger color', () => {
    const neg: SaldoRow[] = [{ ...rows[0], saldo: '-3', abaixo_minimo: true }];
    const { container } = render(<SaldoTable rows={neg} />);
    const saldoCell = container.querySelector('tbody tr td:nth-child(4)');
    expect(saldoCell?.className).toMatch(/text-mf-danger/);
  });
});

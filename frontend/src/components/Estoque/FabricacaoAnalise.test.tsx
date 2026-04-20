import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import FabricacaoAnalise from './FabricacaoAnalise';
import type { FabricacaoAnalise as Analise } from '../../lib/estoque';

const data: Analise = {
  orcamento_id: 'o1',
  orcamento_numero: 'ORC-2026-0001',
  cliente_nome: 'Tatuí',
  produto_nome: 'Farmácia Express 3×6',
  itens: [
    {
      material_id: 'm1', sku: 'MT-FCH-001', nome: 'Placa', unidade: 'pc',
      necessario: '28', saldo_atual: '23', falta: '5', status: 'faltante',
      preco_unitario: '219.90', custo_reposicao_linha: '1099.50',
    },
    {
      material_id: 'm2', sku: 'MT-LSF-001', nome: 'Perfil', unidade: 'kg',
      necessario: '100', saldo_atual: '200', falta: '0', status: 'suficiente',
      preco_unitario: '14.00', custo_reposicao_linha: '0',
    },
  ],
  totais: { itens_total: 2, itens_faltantes: 1, custo_reposicao: '1099.50' },
};

describe('FabricacaoAnalise', () => {
  it('renders orcamento number and both lines', () => {
    render(<FabricacaoAnalise analise={data} />);
    expect(screen.getByText(/ORC-2026-0001/)).toBeInTheDocument();
    expect(screen.getByText('MT-FCH-001')).toBeInTheDocument();
    expect(screen.getByText('MT-LSF-001')).toBeInTheDocument();
  });

  it('marks faltante line visibly', () => {
    render(<FabricacaoAnalise analise={data} />);
    const row = screen.getByText('MT-FCH-001').closest('tr')!;
    expect(row.className).toMatch(/faltante|bg-mf-warning|bg-mf-danger/);
  });

  it('shows totals in footer', () => {
    render(<FabricacaoAnalise analise={data} />);
    expect(screen.getByText(/1.*faltantes/i)).toBeInTheDocument();
  });
});

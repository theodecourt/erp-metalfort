import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MovimentoForm from './MovimentoForm';

const materiais = [{ id: 'mat1', sku: 'MT-X', nome: 'Placa X', unidade: 'pc' }];
const fornecedores = [{ id: 'f1', nome: 'Casa do Construtor' }];
const orcamentos = [{ id: 'o1', numero: 'ORC-1', cliente_nome: 'Cli' }];

describe('MovimentoForm', () => {
  it('shows fornecedor + preco fields when tipo=compra', () => {
    render(
      <MovimentoForm
        materiais={materiais}
        fornecedores={fornecedores}
        orcamentos={orcamentos}
        onSubmit={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/tipo/i), { target: { value: 'compra' } });
    expect(screen.getByLabelText(/preço/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fornecedor/i)).toBeInTheDocument();
  });

  it('shows destino + orcamento fields when tipo=saida_obra', () => {
    render(
      <MovimentoForm
        materiais={materiais}
        fornecedores={fornecedores}
        orcamentos={orcamentos}
        onSubmit={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/tipo/i), { target: { value: 'saida_obra' } });
    expect(screen.getByLabelText(/destino/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/orçamento/i)).toBeInTheDocument();
  });

  it('requires observacao for ajuste', () => {
    const onSubmit = vi.fn();
    render(
      <MovimentoForm
        materiais={materiais}
        fornecedores={fornecedores}
        orcamentos={orcamentos}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText(/tipo/i), { target: { value: 'ajuste_negativo' } });
    fireEvent.change(screen.getByLabelText(/material/i), { target: { value: 'mat1' } });
    fireEvent.change(screen.getByLabelText(/quantidade/i), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /lançar/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/justificativa obrigatória/i)).toBeInTheDocument();
  });

  it('pre-fills destino when orcamento chosen on saida_obra', () => {
    render(
      <MovimentoForm
        materiais={materiais}
        fornecedores={fornecedores}
        orcamentos={orcamentos}
        onSubmit={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/tipo/i), { target: { value: 'saida_obra' } });
    fireEvent.change(screen.getByLabelText(/orçamento/i), { target: { value: 'o1' } });
    expect((screen.getByLabelText(/destino/i) as HTMLInputElement).value).toBe('ORC-1 – Cli');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComboCard from './ComboCard';
import type { PacoteCombo } from '../../lib/combos';

const combo: PacoteCombo = {
  id: '1', slug: 'fechamento-premium', categoria: 'fechamento_ext',
  nome: 'Premium', descricao: 'Cimentícia Infibra + Glasroc dupla',
  ordem: 4, ativo: true, materiais: [],
};

describe('ComboCard', () => {
  it('mostra nome e descricao', () => {
    render(<ComboCard combo={combo} selected={false} unitPrice={328} unitLabel="m² parede" delta={0} onSelect={() => {}} />);
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText(/Cimentícia Infibra/)).toBeInTheDocument();
  });

  it('mostra preco unitario em formato pt-BR', () => {
    render(<ComboCard combo={combo} selected={false} unitPrice={328.50} unitLabel="m² parede" delta={0} onSelect={() => {}} />);
    expect(screen.getByText(/R\$\s?328,50/)).toBeInTheDocument();
    expect(screen.getByText(/m² parede/)).toBeInTheDocument();
  });

  it('mostra Delta positivo vs Standard', () => {
    render(<ComboCard combo={combo} selected={false} unitPrice={328} unitLabel="m² parede" delta={12450} onSelect={() => {}} />);
    expect(screen.getByText(/\+R\$\s?12\.450/)).toBeInTheDocument();
    expect(screen.getByText(/vs Standard/i)).toBeInTheDocument();
  });

  it('oculta Delta quando e o proprio Standard (delta===0)', () => {
    render(<ComboCard combo={combo} selected={false} unitPrice={245} unitLabel="m² parede" delta={0} onSelect={() => {}} />);
    expect(screen.queryByText(/vs Standard/i)).not.toBeInTheDocument();
  });

  it('aplica estilo de selecionado e chama onSelect', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ComboCard combo={combo} selected={true} unitPrice={328} unitLabel="m² parede" delta={0} onSelect={onSelect} />);
    const button = screen.getByRole('button', { name: /Premium/ });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await user.click(button);
    expect(onSelect).toHaveBeenCalledOnce();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepSidebar, { type StepItem } from './StepSidebar';

const steps: StepItem[] = [
  { id: 'estrutura', label: 'Estrutura', filled: true },
  { id: 'fechamento', label: 'Fechamento', filled: true },
  { id: 'cobertura', label: 'Cobertura', filled: false },
];

describe('StepSidebar', () => {
  it('renderiza os items numerados com marcador de preenchido', () => {
    render(<StepSidebar steps={steps} activeId="estrutura" onJump={() => {}} />);
    expect(screen.getByText(/1\b/)).toBeInTheDocument();
    expect(screen.getByText('Estrutura')).toBeInTheDocument();
    expect(screen.getByText('Fechamento')).toBeInTheDocument();
    expect(screen.getByText('Cobertura')).toBeInTheDocument();
  });

  it('chama onJump com o id ao clicar', async () => {
    const user = userEvent.setup();
    const onJump = vi.fn();
    render(<StepSidebar steps={steps} activeId="estrutura" onJump={onJump} />);
    await user.click(screen.getByRole('button', { name: /Cobertura/ }));
    expect(onJump).toHaveBeenCalledWith('cobertura');
  });

  it('marca ativo no aria-current', () => {
    render(<StepSidebar steps={steps} activeId="fechamento" onJump={() => {}} />);
    const active = screen.getByRole('button', { name: /Fechamento/ });
    expect(active).toHaveAttribute('aria-current', 'step');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TemplatePicker from './TemplatePicker';

describe('TemplatePicker', () => {
  it('renderiza 3 botoes: Basico, Premium, Personalizado', () => {
    render(<TemplatePicker active="basico" hasCustomizations={false} onApply={() => {}} onRevert={() => {}} />);
    expect(screen.getByRole('button', { name: /Básico/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Premium/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Personalizado/i })).toBeInTheDocument();
  });

  it('marca o ativo com aria-pressed=true', () => {
    render(<TemplatePicker active="premium" hasCustomizations={false} onApply={() => {}} onRevert={() => {}} />);
    expect(screen.getByRole('button', { name: /Premium/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Básico/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('chama onApply sem modal quando nao ha customizacoes', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<TemplatePicker active="basico" hasCustomizations={false} onApply={onApply} onRevert={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Premium/i }));
    expect(onApply).toHaveBeenCalledWith('premium');
  });

  it('abre modal de confirmacao quando ha customizacoes e confirma', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<TemplatePicker active="basico" hasCustomizations={true} onApply={onApply} onRevert={() => {}} />);
    await user.click(screen.getByRole('button', { name: /Premium/i }));
    // modal aberto
    expect(screen.getByText(/sobrescrever/i)).toBeInTheDocument();
    // onApply NAO deve ter sido chamado ainda
    expect(onApply).not.toHaveBeenCalled();
    // confirmar
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    expect(onApply).toHaveBeenCalledWith('premium');
  });

  it('mostra botao de voltar ao template quando hasCustomizations=true', async () => {
    const user = userEvent.setup();
    const onRevert = vi.fn();
    render(<TemplatePicker active="basico" hasCustomizations={true} onApply={() => {}} onRevert={onRevert} />);
    const revert = screen.getByRole('button', { name: /voltar ao template/i });
    await user.click(revert);
    expect(onRevert).toHaveBeenCalledOnce();
  });

  it('oculta o botao voltar quando nao ha customizacoes', () => {
    render(<TemplatePicker active="basico" hasCustomizations={false} onApply={() => {}} onRevert={() => {}} />);
    expect(screen.queryByRole('button', { name: /voltar ao template/i })).not.toBeInTheDocument();
  });
});

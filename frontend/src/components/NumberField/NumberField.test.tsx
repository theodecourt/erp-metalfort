import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NumberField from './NumberField';

function Controlled({ initial, step }: { initial: number; step?: number }) {
  const [v, setV] = useState(initial);
  return <NumberField value={v} onChange={setV} min={0.01} step={step} />;
}

describe('NumberField', () => {
  it('aceita digitacao decimal com ponto sem reformatar enquanto focado', async () => {
    const user = userEvent.setup();
    render(<Controlled initial={1} step={0.01} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.click(input);
    await user.clear(input);
    await user.type(input, '2.5');
    expect(input.value).toBe('2.5');
  });

  it('aceita digitacao com virgula sem trocar para ponto', async () => {
    const user = userEvent.setup();
    render(<Controlled initial={1} step={0.01} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.click(input);
    await user.clear(input);
    await user.type(input, '0,55');
    expect(input.value).toBe('0,55');
  });

  it('canoniza para formato pt-BR ao perder o foco', async () => {
    const user = userEvent.setup();
    render(<Controlled initial={1} step={0.01} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.click(input);
    await user.clear(input);
    await user.type(input, '2.5');
    await user.tab();
    expect(input.value).toBe('2,5');
  });

  it('botao de subir incrementa pelo step', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NumberField value={1} onChange={onChange} step={1} min={0} max={10} />);
    await user.click(screen.getByLabelText('Aumentar'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('botao de descer decrementa pelo step e respeita min', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NumberField value={1} onChange={onChange} step={1} min={1} max={10} />);
    const down = screen.getByLabelText('Diminuir') as HTMLButtonElement;
    expect(down.disabled).toBe(true);
  });

  it('atualiza o texto exibido quando o value externo muda e o input nao esta focado', () => {
    const { rerender } = render(<NumberField value={1} onChange={() => {}} step={1} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('1');
    rerender(<NumberField value={5} onChange={() => {}} step={1} />);
    expect(input.value).toBe('5');
  });
});

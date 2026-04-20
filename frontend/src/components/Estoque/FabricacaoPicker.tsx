import { useNavigate } from 'react-router-dom';

export interface OrcamentoOption {
  id: string;
  numero: string;
  cliente_nome: string;
  status: string;
}

interface Props {
  orcamentos: OrcamentoOption[];
}

export default function FabricacaoPicker({ orcamentos }: Props) {
  const nav = useNavigate();
  return (
    <div>
      <p className="text-sm text-mf-text-secondary mb-3">
        Escolha um orçamento para ver quais materiais faltam para fabricar.
      </p>
      <ul className="divide-y divide-mf-border/20">
        {orcamentos.map((o) => (
          <li key={o.id} className="py-2 flex justify-between items-center">
            <div>
              <div className="font-mono text-xs">{o.numero}</div>
              <div>{o.cliente_nome}</div>
              <div className="text-xs text-mf-text-secondary">{o.status}</div>
            </div>
            <button
              className="bg-mf-yellow text-mf-black px-3 py-1 rounded text-sm font-bold"
              onClick={() => nav(`/admin/estoque/fabricacao/${o.id}`)}
            >Analisar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

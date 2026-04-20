import type { FabricacaoAnalise as Analise } from '../../lib/estoque';

interface Props { analise: Analise; }

export default function FabricacaoAnalise({ analise }: Props) {
  const moeda = (v: string) =>
    Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div>
      <header className="mb-4">
        <h2 className="text-lg font-bold">Análise de fabricação</h2>
        <p className="text-sm text-mf-text-secondary">
          {analise.orcamento_numero} · {analise.cliente_nome} · {analise.produto_nome}
        </p>
      </header>
      <table className="w-full text-sm tabular-nums">
        <thead className="text-left text-mf-text-secondary">
          <tr>
            <th className="py-2">SKU</th>
            <th>Material</th>
            <th className="text-right">Necessário</th>
            <th className="text-right">Saldo</th>
            <th className="text-right">Falta</th>
            <th className="text-right">Custo reposição</th>
          </tr>
        </thead>
        <tbody>
          {analise.itens.map((l) => {
            const isFalta = l.status === 'faltante';
            return (
              <tr
                key={l.material_id}
                className={`border-t border-mf-border/20 ${isFalta ? 'faltante bg-mf-warning/10' : ''}`}
              >
                <td className="py-2 font-mono text-xs">{l.sku}</td>
                <td>{l.nome}</td>
                <td className="text-right">{l.necessario}</td>
                <td className="text-right">{l.saldo_atual}</td>
                <td className={`text-right ${isFalta ? 'font-bold text-mf-danger' : ''}`}>{l.falta}</td>
                <td className="text-right">{isFalta ? `R$ ${moeda(l.custo_reposicao_linha)}` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t border-mf-border/40">
          <tr>
            <td colSpan={4} className="py-2 text-right text-mf-text-secondary">
              {analise.totais.itens_faltantes} de {analise.totais.itens_total} itens faltantes
            </td>
            <td></td>
            <td className="text-right font-bold">R$ {moeda(analise.totais.custo_reposicao)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

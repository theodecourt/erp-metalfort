import { useEffect, useState } from 'react';
import { useAuthedFetch } from '../../lib/auth';
import { fmtBRL } from '../../lib/format';

interface HistoricoEntry {
  id: string;
  material_id: string;
  preco_unitario: number;
  preco_anterior: number | null;
  vigente_de: string;
  responsavel_id: string | null;
  motivo: string | null;
  origem: 'api_material' | 'api_compra' | 'import_script' | 'manual_sql' | 'migration';
  responsavel: { id: string; nome: string } | null;
}

interface Props {
  material: { id: string; sku: string; nome: string; preco_unitario: number; unidade: string };
  onClose: () => void;
}

const ORIGEM_LABEL: Record<HistoricoEntry['origem'], string> = {
  api_material: 'Edição manual',
  api_compra: 'Compra (NF)',
  import_script: 'Importação planilha',
  manual_sql: 'SQL direto',
  migration: 'Snapshot inicial',
};

const ORIGEM_BADGE: Record<HistoricoEntry['origem'], string> = {
  api_material: 'bg-mf-yellow/20 text-mf-text-primary',
  api_compra: 'bg-blue-100 text-blue-800',
  import_script: 'bg-purple-100 text-purple-800',
  manual_sql: 'bg-mf-warning/20 text-mf-text-primary',
  migration: 'bg-gray-100 text-mf-text-muted',
};

function fmtData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDelta(atual: number, anterior: number | null): { texto: string; cor: string } | null {
  if (anterior === null) return null;
  const delta = Number(atual) - Number(anterior);
  if (Math.abs(delta) < 0.005) return { texto: '0,00', cor: 'text-mf-text-muted' };
  const sinal = delta > 0 ? '+' : '';
  const pct = Number(anterior) > 0 ? (delta / Number(anterior)) * 100 : 0;
  return {
    texto: `${sinal}${fmtBRL(delta)} (${sinal}${pct.toFixed(1)}%)`,
    cor: delta > 0 ? 'text-mf-danger' : 'text-mf-success',
  };
}

export default function MaterialHistoricoDrawer({ material, onClose }: Props) {
  const fetchApi = useAuthedFetch();
  const [historico, setHistorico] = useState<HistoricoEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchApi<HistoricoEntry[]>(`/api/material/${material.id}/historico`)
      .then(setHistorico)
      .finally(() => setLoading(false));
  }, [material.id]);

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex justify-end" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-white shadow-xl overflow-y-auto"
      >
        <header className="sticky top-0 bg-mf-black text-white px-5 py-4 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-mf-text-secondary">{material.sku}</p>
            <h2 className="text-lg font-extrabold mt-0.5">{material.nome}</h2>
            <p className="text-xs text-mf-text-secondary mt-1">
              Preço atual <strong>{fmtBRL(material.preco_unitario)}</strong> / {material.unidade}
            </p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-mf-text-secondary hover:text-white">×</button>
        </header>

        <div className="p-5">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-mf-text-muted mb-3">
            Histórico de preço
          </h3>

          {loading ? (
            <p className="text-mf-text-muted">Carregando…</p>
          ) : historico.length === 0 ? (
            <p className="text-mf-text-muted">Nenhuma entrada no histórico.</p>
          ) : (
            <ol className="space-y-3">
              {historico.map((entry, idx) => {
                const delta = fmtDelta(entry.preco_unitario, entry.preco_anterior);
                const isFirst = idx === 0;
                return (
                  <li
                    key={entry.id}
                    className={`border rounded p-3 ${isFirst ? 'border-mf-yellow bg-mf-yellow/5' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold tabular-nums">
                            {fmtBRL(entry.preco_unitario)}
                          </span>
                          {delta && (
                            <span className={`text-xs font-medium ${delta.cor}`}>
                              {delta.texto}
                            </span>
                          )}
                          {isFirst && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-mf-yellow text-mf-black font-bold">
                              vigente
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-mf-text-muted mt-1">
                          {fmtData(entry.vigente_de)}
                          {entry.preco_anterior !== null && (
                            <> · antes <span className="tabular-nums">{fmtBRL(entry.preco_anterior)}</span></>
                          )}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${ORIGEM_BADGE[entry.origem]}`}>
                        {ORIGEM_LABEL[entry.origem]}
                      </span>
                    </div>
                    {(entry.responsavel || entry.motivo) && (
                      <div className="mt-2 pt-2 border-t text-xs text-mf-text-muted space-y-0.5">
                        {entry.responsavel && (
                          <p><span className="font-medium">Responsável:</span> {entry.responsavel.nome}</p>
                        )}
                        {entry.motivo && (
                          <p><span className="font-medium">Motivo:</span> {entry.motivo}</p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

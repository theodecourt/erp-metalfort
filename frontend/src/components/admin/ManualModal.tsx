import { useEffect, useRef, useState } from 'react';

interface Props { onClose: () => void }

const PANEL_WIDTH = 680;

export default function ManualModal({ onClose }: Props) {
  const [pos, setPos] = useState(() => ({
    x: Math.max(24, window.innerWidth - PANEL_WIDTH - 24),
    y: 80,
  }));
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  function onHeaderMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return; // não inicia drag pelo X
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    setDragging(true);
  }

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) {
      const x = e.clientX - offset.current.x;
      const y = e.clientY - offset.current.y;
      // Mantém pelo menos 80px do header dentro da viewport
      const minX = -PANEL_WIDTH + 80;
      const maxX = window.innerWidth - 80;
      const minY = 0;
      const maxY = window.innerHeight - 40;
      setPos({
        x: Math.min(maxX, Math.max(minX, x)),
        y: Math.min(maxY, Math.max(minY, y)),
      });
    }
    function onUp() { setDragging(false); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  return (
    <div
      className="fixed z-50 bg-white rounded shadow-2xl border max-h-[80vh] overflow-hidden flex flex-col"
      style={{ left: pos.x, top: pos.y, width: PANEL_WIDTH }}
    >
      <header
        onMouseDown={onHeaderMouseDown}
        className={`bg-mf-black text-white px-5 py-3 flex items-start justify-between select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div>
          <h2 className="text-lg font-extrabold">
            <span className="text-mf-yellow">metalfort</span> · ERP — Manual rápido
          </h2>
          <p className="text-xs text-mf-text-secondary mt-1">
            Arraste pelo cabeçalho para reposicionar.
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-2xl leading-none text-mf-text-secondary hover:text-white"
          aria-label="Fechar"
        >×</button>
      </header>

      <div className="p-5 space-y-5 text-sm leading-relaxed overflow-auto">
        <section>
          <p>
            O sistema tem <strong>6 abas no menu superior</strong>. Abaixo, o que cada uma faz e
            os recursos principais.
          </p>
        </section>

        <Section title="Dashboard">
          Visão geral do sistema.
        </Section>

        <Section title="Orçamentos">
          <ul className="list-disc pl-5 space-y-1">
            <li>Lista os pedidos enviados pelos clientes pelo site.</li>
            <li>Botão para criar orçamento manualmente.</li>
            <li>Cada orçamento abre o detalhe com cliente, itens, valores e status.</li>
          </ul>
        </Section>

        <Section title="Produtos">
          <p>Catálogo dos módulos que a Metalfort vende (Home, Shop, etc.). Cada produto tem suas regras de cálculo.</p>
        </Section>

        <Section title="Materiais">
          <p>
            Catálogo completo de tudo que entra na obra: perfis, parafusos, chapas, mão de obra,
            serviços.
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>+ Novo material</strong> abre formulário de cadastro.</li>
            <li><strong>Busca</strong> aceita várias palavras: digite <em>perfil 90</em> e ele acha tudo que tem essas duas palavras.</li>
            <li><strong>Filtro por categoria</strong> ao lado da busca.</li>
            <li>Linhas em <span className="bg-yellow-50 px-1 rounded">amarelo</span> foram importadas da planilha do Samuel (origem visualmente sinalizada).</li>
            <li><strong>Editar</strong> na linha permite mudar preço e estoque mínimo.</li>
            <li><strong>Apagar</strong> tira do catálogo mas preserva movimentos históricos.</li>
          </ul>
        </Section>

        <Section title="Combos">
          <p>
            Pacotes de materiais com fórmulas, agrupados por categoria. No site público, o cliente
            escolhe <strong>um combo por categoria</strong> (ex.: Fechamento Standard, Premium ou Térmico).
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Ativo / Inativo</strong> direto no botão da linha — combo inativo some pro cliente mas fica preservado.</li>
            <li><strong>+ Novo combo</strong> cria vazio; você adiciona os materiais na próxima tela.</li>
            <li><strong>Duplicar</strong> copia tudo num novo combo já desativado (revisa antes de ativar).</li>
            <li><strong>Materiais</strong> abre a página de detalhe do combo.</li>
            <li>No detalhe: editar nome/descrição/ordem; <em>ordem 1 = Standard</em> da categoria (vira a referência base).</li>
          </ul>
        </Section>

        <Section title="Dentro de um combo (página de detalhe)">
          <p>Cada material tem uma fórmula de quantidade. Quatro tipos disponíveis:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>A. Variável direta</strong> — qtd = variável (ex.: 1m² de telha por m² de cobertura).</li>
            <li><strong>B. Variável × fator</strong> — qtd = fator × variável (ex.: 30 parafusos por m²).</li>
            <li><strong>C. Cobertura com perda</strong> — pra chapas que cobrem N m² com % de perda (ex.: chapa cobre 2,88m² com 7% perda).</li>
            <li><strong>D. Constante</strong> — quantidade fixa (ex.: 1 porta).</li>
          </ul>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Reordenar materiais com botões <strong>▲▼</strong>.</li>
            <li><strong>Editar</strong> a fórmula de cada material a qualquer momento.</li>
            <li><strong>Excluir</strong> (botão vermelho no canto superior direito) apaga o combo todo. Se ele estiver em algum template (Básico/Premium), a exclusão é bloqueada — você precisa remover lá primeiro.</li>
          </ul>
        </Section>

        <Section title="Estoque (4 sub-abas)">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Saldo</strong> — quanto tem de cada material agora; itens abaixo do mínimo aparecem destacados.</li>
            <li><strong>Movimentos</strong> — histórico completo: compras, saídas pra obra e ajustes manuais.</li>
            <li><strong>Fornecedores</strong> — cadastro de quem fornece (nome, CNPJ, contato).</li>
            <li><strong>Fabricação</strong> — análise para um orçamento específico: o que precisa, o que tem em estoque, o que falta comprar.</li>
          </ul>
        </Section>

        <Section title="Dicas gerais">
          <ul className="list-disc pl-5 space-y-1">
            <li>Linhas pares com fundo cinza nas tabelas de Estoque facilitam acompanhar a leitura.</li>
            <li>Materiais e combos apagados/desativados não somem do banco — dá pra reativar editando e marcando "Ativo".</li>
            <li>Passe o mouse sobre ícones e linhas amarelas para ver dicas de contexto.</li>
            <li>Esta janela pode ser arrastada pelo cabeçalho para liberar a área de trabalho atrás.</li>
          </ul>
        </Section>
      </div>

      <footer className="bg-white border-t px-5 py-3 flex justify-end">
        <button
          onClick={onClose}
          className="bg-mf-yellow text-mf-black font-bold px-3 py-2 rounded text-sm"
        >Entendi</button>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-extrabold text-mf-black border-b pb-1 mb-2">{title}</h3>
      <div>{children}</div>
    </section>
  );
}

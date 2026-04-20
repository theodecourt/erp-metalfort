import type { Fornecedor } from '../../lib/estoque';

interface Props {
  fornecedores: Fornecedor[];
  onEdit: (f: Fornecedor) => void;
  onDeactivate: (f: Fornecedor) => void;
}

export default function FornecedorList({ fornecedores, onEdit, onDeactivate }: Props) {
  if (!fornecedores.length) {
    return <p className="text-mf-text-secondary text-sm">Nenhum fornecedor cadastrado.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-mf-text-secondary">
        <tr>
          <th className="py-2">Nome</th>
          <th>CNPJ</th>
          <th>Contato</th>
          <th>Telefone</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {fornecedores.map((f) => (
          <tr key={f.id} className="border-t border-mf-border/20">
            <td className="py-2">{f.nome}</td>
            <td>{f.cnpj ?? '—'}</td>
            <td>{f.contato_nome ?? '—'} {f.contato_email ? `(${f.contato_email})` : ''}</td>
            <td>{f.contato_fone ?? '—'}</td>
            <td className="text-right space-x-2">
              <button className="text-mf-text-ink underline" onClick={() => onEdit(f)}>editar</button>
              {f.ativo && (
                <button className="text-mf-danger underline" onClick={() => onDeactivate(f)}>desativar</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

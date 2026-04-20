import { NavLink } from 'react-router-dom';

const tab = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm rounded ${
    isActive ? 'bg-mf-yellow text-mf-black font-bold' : 'text-mf-text-ink hover:bg-mf-black-soft/10'
  }`;

export default function EstoqueNav() {
  return (
    <nav className="flex gap-2 border-b border-mf-border/20 pb-3 mb-4">
      <NavLink to="/admin/estoque/saldo" className={tab}>Saldo</NavLink>
      <NavLink to="/admin/estoque/movimentos" className={tab}>Movimentos</NavLink>
      <NavLink to="/admin/estoque/fornecedores" className={tab}>Fornecedores</NavLink>
      <NavLink to="/admin/estoque/fabricacao" className={tab}>Fabricação</NavLink>
    </nav>
  );
}

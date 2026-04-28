import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import ManualModal from '../../components/admin/ManualModal';

const classFor = (active: boolean) =>
  `px-3 py-2 rounded text-sm ${active ? 'bg-mf-yellow text-mf-black font-bold' : 'hover:bg-mf-black-soft text-white'}`;

const linkClass = ({ isActive }: { isActive: boolean }) => classFor(isActive);

export default function AdminLayout() {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const [showManual, setShowManual] = useState(false);
  const orcamentosActive =
    pathname === '/admin/orcamentos'
    || pathname.startsWith('/admin/orcamentos/')
    || pathname.startsWith('/admin/orcamento/');
  return (
    <div className="min-h-screen bg-mf-bg-light">
      <header className="bg-mf-black text-white px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => setShowManual(true)}
          className="text-lg font-extrabold hover:opacity-80"
          title="Abrir manual rápido"
        >
          <span className="text-mf-yellow">metalfort</span> · ERP
        </button>
        <nav className="flex items-center gap-2">
          <NavLink to="/admin" end className={linkClass}>Dashboard</NavLink>
          <Link to="/admin/orcamentos" className={classFor(orcamentosActive)}>Orçamentos</Link>
          <NavLink to="/admin/produtos" className={linkClass}>Produtos</NavLink>
          <NavLink to="/admin/materiais" className={linkClass}>Materiais</NavLink>
          <NavLink to="/admin/combos" className={linkClass}>Combos</NavLink>
          <NavLink to="/admin/estoque" className={linkClass}>Estoque</NavLink>
          <button onClick={signOut} className="ml-4 text-sm text-mf-text-secondary hover:text-white">Sair</button>
        </nav>
      </header>
      <main className="max-w-[1520px] mx-auto px-6 py-8">
        <Outlet />
      </main>
      {showManual && <ManualModal onClose={() => setShowManual(false)} />}
    </div>
  );
}

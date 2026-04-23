import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

const classFor = (active: boolean) =>
  `px-3 py-2 rounded text-sm ${active ? 'bg-mf-yellow text-mf-black font-bold' : 'hover:bg-mf-black-soft text-white'}`;

const linkClass = ({ isActive }: { isActive: boolean }) => classFor(isActive);

export default function AdminLayout() {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const orcamentosActive =
    pathname === '/admin/orcamentos'
    || pathname.startsWith('/admin/orcamentos/')
    || pathname.startsWith('/admin/orcamento/');
  return (
    <div className="min-h-screen bg-mf-bg-light">
      <header className="bg-mf-black text-white px-6 py-3 flex items-center justify-between">
        <Link to="/admin" className="text-lg font-extrabold"><span className="text-mf-yellow">metalfort</span> · ERP</Link>
        <nav className="flex items-center gap-2">
          <NavLink to="/admin" end className={linkClass}>Dashboard</NavLink>
          <Link to="/admin/orcamentos" className={classFor(orcamentosActive)}>Orçamentos</Link>
          <NavLink to="/admin/produtos" className={linkClass}>Produtos</NavLink>
          <NavLink to="/admin/materiais" className={linkClass}>Materiais</NavLink>
          <NavLink to="/admin/estoque" className={linkClass}>Estoque</NavLink>
          <button onClick={signOut} className="ml-4 text-sm text-mf-text-secondary hover:text-white">Sair</button>
        </nav>
      </header>
      <main className="max-w-[1520px] mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

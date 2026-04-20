import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded text-sm ${isActive ? 'bg-mf-yellow text-mf-black font-bold' : 'hover:bg-mf-black-soft text-white'}`;

export default function AdminLayout() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-mf-bg-light">
      <header className="bg-mf-black text-white px-6 py-3 flex items-center justify-between">
        <Link to="/admin" className="text-lg font-extrabold"><span className="text-mf-yellow">metalfort</span> · ERP</Link>
        <nav className="flex items-center gap-2">
          <NavLink to="/admin" end className={linkClass}>Dashboard</NavLink>
          <NavLink to="/admin/orcamentos" className={linkClass}>Orçamentos</NavLink>
          <NavLink to="/admin/produtos" className={linkClass}>Produtos</NavLink>
          <NavLink to="/admin/materiais" className={linkClass}>Materiais</NavLink>
          <NavLink to="/admin/estoque" className={linkClass}>Estoque</NavLink>
          <button onClick={signOut} className="ml-4 text-sm text-mf-text-secondary hover:text-white">Sair</button>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

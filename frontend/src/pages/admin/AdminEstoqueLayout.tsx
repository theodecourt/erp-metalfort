import { Outlet } from 'react-router-dom';
import EstoqueNav from '../../components/Estoque/EstoqueNav';

export default function AdminEstoqueLayout() {
  return (
    <section>
      <h1 className="text-xl font-bold mb-4">Estoque</h1>
      <EstoqueNav />
      <Outlet />
    </section>
  );
}

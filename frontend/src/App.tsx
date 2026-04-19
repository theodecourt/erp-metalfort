import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Landing from './pages/public/Landing';
import ProdutoDetail from './pages/public/ProdutoDetail';
import ConfigurarOrcamento from './pages/public/ConfigurarOrcamento';
import Obrigado from './pages/public/Obrigado';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrcamentos from './pages/admin/AdminOrcamentos';
import AdminOrcamentoDetail from './pages/admin/AdminOrcamentoDetail';
import AdminOrcamentoNew from './pages/admin/AdminOrcamentoNew';
import AdminProdutos from './pages/admin/AdminProdutos';
import AdminMateriais from './pages/admin/AdminMateriais';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './lib/auth';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/produto/:slug" element={<ProdutoDetail />} />
          <Route path="/orcamento/:slug" element={<ConfigurarOrcamento />} />
          <Route path="/obrigado" element={<Obrigado />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/*" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="orcamentos" element={<AdminOrcamentos />} />
            <Route path="orcamento/new" element={<AdminOrcamentoNew />} />
            <Route path="orcamento/:id" element={<AdminOrcamentoDetail />} />
            <Route path="produtos" element={<AdminProdutos />} />
            <Route path="materiais" element={<AdminMateriais />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

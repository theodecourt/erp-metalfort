import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/public/Landing';
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
import AdminCombos from './pages/admin/AdminCombos';
import AdminComboDetail from './pages/admin/AdminComboDetail';
import AdminEstoqueLayout from './pages/admin/AdminEstoqueLayout';
import AdminEstoqueSaldo from './pages/admin/AdminEstoqueSaldo';
import AdminEstoqueMovimentos from './pages/admin/AdminEstoqueMovimentos';
import AdminEstoqueFornecedores from './pages/admin/AdminEstoqueFornecedores';
import AdminEstoqueFabricacaoPicker from './pages/admin/AdminEstoqueFabricacaoPicker';
import AdminEstoqueFabricacao from './pages/admin/AdminEstoqueFabricacao';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './lib/auth';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
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
            <Route path="combos" element={<AdminCombos />} />
            <Route path="combos/:id" element={<AdminComboDetail />} />
            <Route path="estoque" element={<AdminEstoqueLayout />}>
              <Route index element={<Navigate to="saldo" replace />} />
              <Route path="saldo" element={<AdminEstoqueSaldo />} />
              <Route path="movimentos" element={<AdminEstoqueMovimentos />} />
              <Route path="fornecedores" element={<AdminEstoqueFornecedores />} />
              <Route path="fabricacao" element={<AdminEstoqueFabricacaoPicker />} />
              <Route path="fabricacao/:orcamento_id" element={<AdminEstoqueFabricacao />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

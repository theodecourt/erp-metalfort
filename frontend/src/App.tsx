import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Landing from './pages/public/Landing';
import ProdutoDetail from './pages/public/ProdutoDetail';
import ConfigurarOrcamento from './pages/public/ConfigurarOrcamento';
import Obrigado from './pages/public/Obrigado';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/produto/:slug" element={<ProdutoDetail />} />
        <Route path="/orcamento/:slug" element={<ConfigurarOrcamento />} />
        <Route path="/obrigado" element={<Obrigado />} />
      </Routes>
    </BrowserRouter>
  );
}

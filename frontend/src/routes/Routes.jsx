import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useSessao } from '../contexts/Sessao';
import { ProvedorOperacao } from '../contexts/Operacao';
import { Layout } from '../layouts/Layout';
import Login from '../pages/Login';
import Home from '../pages/Home';
import Gestao from '../pages/Gestao';
import Alertas from '../pages/Alertas';
import Inteligencia from '../pages/Inteligencia';

function RotaProtegida() {
  const { usuario } = useSessao();
  if (!usuario) return <Navigate to="/entrar" replace />;
  return (
    <ProvedorOperacao>
      <Layout />
    </ProvedorOperacao>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/entrar" element={<Login />} />
        <Route element={<RotaProtegida />}>
          <Route index element={<Home />} />
          <Route path="mapa" element={<Home somenteMapa />} />
          <Route
            path="equipamentos"
            element={<Gestao key="equipamentos" recurso="equipamentos" />}
          />
          <Route path="agentes" element={<Gestao key="agentes" recurso="agentes" />} />
          <Route path="manutencoes" element={<Gestao key="manutencoes" recurso="manutencoes" />} />
          <Route path="ocorrencias" element={<Gestao key="ocorrencias" recurso="ocorrencias" />} />
          <Route path="alertas" element={<Alertas />} />
          <Route path="inteligencia" element={<Inteligencia />} />
          <Route
            path="*"
            element={
              <div className="empty">
                <h1>Página não encontrada</h1>
                <a className="text-link" href="/">
                  Voltar à central
                </a>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Flame,
  LayoutDashboard,
  Map,
  Cctv,
  Users,
  Wrench,
  BellRing,
  ChartNoAxesCombined,
  ClipboardList,
  LogOut,
  Menu,
  ShieldCheck,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSessao } from '../contexts/Sessao';
import { useOperacao } from '../contexts/Operacao';
import { Button } from '../components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../components/ui/sheet';
import { rotulo } from '../utils/dados';
export const navegacao = [
  {
    grupo: 'Central de operações',
    itens: [
      ['/', 'Visão geral', LayoutDashboard],
      ['/mapa', 'Mapa operacional', Map],
      ['/alertas', 'Alertas', BellRing],
    ],
  },
  {
    grupo: 'Gestão de recursos',
    itens: [
      ['/equipamentos', 'Equipamentos', Cctv],
      ['/agentes', 'Agentes', Users],
      ['/manutencoes', 'Manutenções', Wrench],
      ['/ocorrencias', 'Ocorrências', ClipboardList],
    ],
  },
  {
    grupo: 'Cidade preditiva',
    itens: [['/inteligencia', 'Inteligência operacional', ChartNoAxesCombined]],
  },
];
export function Marca() {
  return (
    <div className="brand">
      <Flame size={32} strokeWidth={1.6} />
      <div>
        <strong>PROMETHEUS</strong>
        <small>F.O.G.O.</small>
      </div>
    </div>
  );
}
function Navegacao({ aoNavegar }) {
  const { usuario } = useSessao();
  return (
    <nav aria-label="Navegação principal">
      {navegacao.map((grupo) => (
        <div key={grupo.grupo}>
          <p className="nav-group">{grupo.grupo}</p>
          {grupo.itens.map(([url, titulo, Icone]) => (
            <NavLink key={url} to={url} end={url === '/'} onClick={aoNavegar}>
              <Icone size={18} aria-hidden="true" />
              {titulo}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
export function Layout() {
  const { usuario, sair } = useSessao();
  const { conectado, erroCatalogos } = useOperacao();
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `${navegacao.flatMap((g) => g.itens).find((i) => i[0] === pathname)?.[1] || 'Página'} | PROMETHEUS`;
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="app">
      <a className="skip" href="#conteudo">
        Ir para o conteúdo
      </a>
      <aside className="sidebar">
        <Marca />
        <Navegacao />
        <div className="sidebar-bottom">
          <ShieldCheck size={20} className="mb-2" />
          <strong>Inteligência a serviço da cidade</strong>
          <span>Mobilidade e segurança pública</span>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <Button
            className="mobile-menu"
            variant="ghost"
            size="icon"
            aria-label="Abrir navegação"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </Button>
          <div className="topbar-path">
            F.O.G.O. <span className="mx-3">/</span> <strong>Central de monitoramento</strong>
          </div>
          <div className="topbar-right">
            <span role="status" className={`connection ${conectado ? '' : 'offline'}`}>
              <i />
              {conectado
                ? 'Conectado ao servidor'
                : 'Sem tempo real • dados podem estar desatualizados'}
            </span>
            <div className="user-info">
              <span className="avatar">{usuario.nome?.slice(0, 2).toUpperCase()}</span>
              <div>
                {usuario.nome}
                <small>{rotulo(usuario.perfil)}</small>
              </div>
            </div>
            <Button variant="ghost" size="icon" aria-label="Sair da sessão" onClick={sair}>
              <LogOut size={17} />
            </Button>
          </div>
        </header>
        <main id="conteudo" className="content">
          {erroCatalogos && (
            <div className="error" role="alert">
              Não foi possível carregar os catálogos: {erroCatalogos}
            </div>
          )}
          {import.meta.env.VITE_AMBIENTE_DEMONSTRACAO === 'true' && (
            <div className="notice">
              Ambiente de estudo — dados demonstrativos carregados do backend. Não representa uma
              operação real.
            </div>
          )}
          <Outlet />
          <footer className="footer-note">
            <span>F.O.G.O. / PROMETHEUS — Gestão inteligente da cidade</span>
            <span>Horários em Brasília • Acesso {rotulo(usuario.perfil).toLowerCase()}</span>
          </footer>
        </main>
      </div>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>PROMETHEUS</SheetTitle>
            <SheetDescription>Central de monitoramento</SheetDescription>
          </SheetHeader>
          <div className="mobile-nav">
            <Navegacao aoNavegar={() => setMenu(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

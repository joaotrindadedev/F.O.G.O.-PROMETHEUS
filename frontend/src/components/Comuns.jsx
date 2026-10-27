import { useState } from 'react';
import { AlertCircle, Inbox, Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { rotulo } from '../utils/dados';
import { useOperacao } from '../contexts/Operacao';
export function TituloPagina({ titulo, descricao, children }) {
  return (
    <div className="page-title">
      <div>
        <h1>{titulo}</h1>
        <p>{descricao}</p>
      </div>
      <div className="page-actions">{children}</div>
    </div>
  );
}
export function IndicadorSituacao({ valor }) {
  const classe = [
    'OPERACIONAL',
    'EM_ATIVIDADE',
    'DISPONIVEL',
    'CONCLUIDA',
    'RESOLVIDO',
    'BAIXO',
    'BAIXA',
  ].includes(valor)
    ? 'good'
    : ['CRITICA', 'CRITICO', 'FURTADO', 'MAU_FUNCIONAMENTO', 'ALTA', 'ALTO'].includes(valor)
      ? 'bad'
      : ['EM_MANUTENCAO', 'PENDENTE', 'MODERADO', 'MEDIA'].includes(valor)
        ? 'warn'
        : ['EM_ANDAMENTO', 'RECONHECIDO'].includes(valor)
          ? 'info'
          : '';
  return <span className={`badge-status ${classe}`}>{rotulo(valor)}</span>;
}
export function EstadoVazio({
  titulo = 'Nenhum registro encontrado',
  descricao = 'Ajuste os filtros ou cadastre um novo registro.',
}) {
  return (
    <div className="empty">
      <Inbox size={30} aria-hidden="true" />
      <h3>{titulo}</h3>
      <p>{descricao}</p>
    </div>
  );
}
export function EstadoConsulta({ consulta, children }) {
  const { atualizar } = useOperacao();
  if (consulta.carregando)
    return (
      <div className="loading" role="status" aria-label="Carregando dados">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  if (consulta.erro)
    return (
      <div className="error" role="alert">
        <AlertCircle size={20} />
        <span className="flex-1">{consulta.erro}</span>
        <Button variant="outline" onClick={atualizar}>
          Tentar novamente
        </Button>
      </div>
    );
  return children;
}
export function CampoBusca({ value, onChange }) {
  return (
    <div className="search">
      <Search aria-hidden="true" />
      <Input
        aria-label="Pesquisar registros"
        placeholder="Pesquisar registros…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function Seletor({ rotulo: titulo, value, onChange, opcoes, todos = 'Todos', ...props }) {
  return (
    <select
      aria-label={titulo}
      className="select-native"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    >
      <option value="">{todos}</option>
      {opcoes.map((item) => (
        <option key={item.id ?? item} value={item.id ?? item}>
          {item.nome ?? rotulo(item)}
        </option>
      ))}
    </select>
  );
}
export function Atualizar() {
  const { atualizar } = useOperacao();
  return (
    <Button variant="outline" onClick={atualizar}>
      <RefreshCw size={14} />
      Atualizar
    </Button>
  );
}
export function Modal({ aberto, aoFechar, titulo, descricao, children }) {
  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        if (!valor) aoFechar();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function TabelaDados({ dados, colunas, chave = '' }) {
  const [pagina, setPagina] = useState(1);
  const [anterior, setAnterior] = useState(chave);
  if (anterior !== chave) {
    setAnterior(chave);
    setPagina(1);
  }
  const paginas = Math.max(1, Math.ceil(dados.length / 10));
  const atual = Math.min(pagina, paginas);
  return (
    <>
      {dados.length ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {colunas.map((c) => (
                  <th key={c.titulo} scope="col">
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.slice((atual - 1) * 10, atual * 10).map((item) => (
                <tr key={item.id}>
                  {colunas.map((c) => (
                    <td key={c.titulo}>{c.render(item)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EstadoVazio />
      )}
      <div className="pagination">
        <span>{dados.length} registros encontrados</span>
        <div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Página anterior"
            disabled={atual <= 1}
            onClick={() => setPagina(atual - 1)}
          >
            <ChevronLeft size={16} />
          </Button>
          <span>
            Página {atual} de {paginas}
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Próxima página"
            disabled={atual >= paginas}
            onClick={() => setPagina(atual + 1)}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </>
  );
}

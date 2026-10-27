import { useState } from 'react';
import { Plus, Eye, Pencil, Trash2, History } from 'lucide-react';
import { toast } from 'sonner';
import { recursos } from '../services/api';
import { useConsulta } from '../hooks/useConsulta';
import { useOperacao } from '../contexts/Operacao';
import { dataHora, filtrar, rotulo } from '../utils/dados';
import {
  formularios,
  situacoesEquipamento,
  situacoesAgente,
  prioridades,
} from '../utils/formularios';
import {
  Atualizar,
  CampoBusca,
  EstadoConsulta,
  EstadoVazio,
  IndicadorSituacao,
  Modal,
  Seletor,
  TabelaDados,
  TituloPagina,
} from '../components/Comuns';
import { FormularioRecurso } from '../components/FormularioRecurso';
import { Button } from '../components/ui/button';
const configuracoes = {
  equipamentos: {
    titulo: 'Equipamentos',
    descricao: 'Inventário, disponibilidade e histórico dos recursos da cidade.',
    singular: 'equipamento',
    situacoes: situacoesEquipamento,
  },
  agentes: {
    titulo: 'Agentes',
    descricao: 'Equipes operacionais, atribuições e última localização conhecida.',
    singular: 'agente',
    situacoes: situacoesAgente,
  },
  manutencoes: {
    titulo: 'Manutenções',
    descricao: 'Planeje intervenções e acompanhe a recuperação dos equipamentos.',
    singular: 'manutenção',
    situacoes: ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'],
  },
  ocorrencias: {
    titulo: 'Ocorrências',
    descricao: 'Registros operacionais que compõem o histórico da cidade.',
    singular: 'ocorrência',
    situacoes: [],
  },
};
export default function Gestao({ recurso }) {
  const config = configuracoes[recurso];
  const { catalogos, atualizar } = useOperacao();
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState({});
  const [prazo, setPrazo] = useState('');
  const [formulario, setFormulario] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [excluir, setExcluir] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const consulta = useConsulta((signal) => recursos[recurso].listar({}, signal), recurso);
  const equipamentos = useConsulta(
    (signal) =>
      recurso === 'manutencoes' ? recursos.equipamentos.listar({}, signal) : Promise.resolve([]),
    recurso,
  );
  const alterarFiltro = (nome, valor) => setFiltros((f) => ({ ...f, [nome]: valor }));
  const dados = filtrar(consulta.dados || [], busca, filtros).filter(
    (item) =>
      !prazo ||
      (prazo === 'ATRASADA'
        ? item.atrasada
        : prazo === 'PROXIMA'
          ? item.proximaDoVencimento
          : !['CONCLUIDA', 'CANCELADA'].includes(item.situacao) &&
            ['ALTA', 'CRITICA'].includes(item.prioridade)),
  );
  const nomeCatalogo = (tipo, id) =>
    catalogos[tipo].find((c) => c.id === id)?.nome || 'Não informado';
  const nomeEquipamento = (id) => equipamentos.dados?.find((e) => e.id === id)?.descricao || id;
  async function abrirDetalhe(item) {
    setOcupado(true);
    try {
      setDetalhe(await recursos[recurso].buscar(item.id));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setOcupado(false);
    }
  }
  async function abrirHistorico(item) {
    setOcupado(true);
    try {
      setHistorico(await recursos[recurso].historico(item.id));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setOcupado(false);
    }
  }
  const colunas = [
    {
      titulo:
        recurso === 'agentes' ? 'Agente' : recurso === 'equipamentos' ? 'Equipamento' : 'Registro',
      render: (item) => (
        <>
          <strong>{item.nome || item.descricao}</strong>
          <small>{item.numeroSerie || item.matricula || item.categoria || rotulo(item.tipo)}</small>
        </>
      ),
    },
    ...(recurso === 'equipamentos'
      ? [{ titulo: 'Categoria', render: (i) => nomeCatalogo('tipos', i.tipoId) }]
      : recurso === 'agentes'
        ? [{ titulo: 'Função', render: (i) => i.funcao }]
        : recurso === 'manutencoes'
          ? [{ titulo: 'Equipamento', render: (i) => nomeEquipamento(i.equipamentoId) }]
          : []),
    {
      titulo: recurso === 'manutencoes' ? 'Prazo' : 'Região',
      render: (i) =>
        recurso === 'manutencoes' ? (
          <>
            <span>{dataHora(i.dataPrevista)}</span>
            {i.atrasada && <small className="!text-red-700">Atrasada</small>}
            {i.proximaDoVencimento && <small>Vence em até 48 horas</small>}
          </>
        ) : (
          <>
            {nomeCatalogo('regioes', i.regiaoId)}
            <small>{i.bairro}</small>
          </>
        ),
    },
    {
      titulo: recurso === 'ocorrencias' ? 'Gravidade' : 'Situação',
      render: (i) => <IndicadorSituacao valor={i.situacao || i.gravidade} />,
    },
    ...(['equipamentos', 'agentes'].includes(recurso)
      ? [{ titulo: 'Órgão', render: (i) => nomeCatalogo('orgaos', i.orgaoId) }]
      : [
          {
            titulo: recurso === 'manutencoes' ? 'Prioridade' : 'Data',
            render: (i) =>
              recurso === 'manutencoes' ? (
                <IndicadorSituacao valor={i.prioridade} />
              ) : (
                dataHora(i.ocorridoEm)
              ),
          },
        ]),
    {
      titulo: 'Ações',
      render: (i) => (
        <div className="flex gap-1">
          <Button
            disabled={ocupado}
            size="icon"
            variant="ghost"
            aria-label={`Detalhes de ${i.nome || i.descricao}`}
            onClick={() => abrirDetalhe(i)}
          >
            <Eye size={16} />
          </Button>
          {recurso !== 'ocorrencias' && (
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Editar ${i.nome || i.descricao}`}
              onClick={() => setFormulario(i)}
            >
              <Pencil size={15} />
            </Button>
          )}
        </div>
      ),
    },
  ];
  function fecharFormulario() {
    if (window.confirm('Fechar formulário? Alterações não salvas serão descartadas.'))
      setFormulario(null);
  }
  return (
    <>
      <TituloPagina titulo={config.titulo} descricao={config.descricao}>
        <Atualizar />
        <Button onClick={() => setFormulario({})}>
          <Plus size={16} />
          Cadastrar {config.singular}
        </Button>
      </TituloPagina>
      <section className="panel">
        <div className="filterbar">
          <CampoBusca value={busca} onChange={setBusca} />
          {config.situacoes.length > 0 && (
            <Seletor
              rotulo="Situação"
              value={filtros.situacao || ''}
              onChange={(v) => alterarFiltro('situacao', v)}
              opcoes={config.situacoes}
              todos="Todas as situações"
            />
          )}
          {recurso === 'equipamentos' && (
            <Seletor
              rotulo="Categoria"
              value={filtros.tipoId || ''}
              onChange={(v) => alterarFiltro('tipoId', v)}
              opcoes={catalogos.tipos}
              todos="Todas as categorias"
            />
          )}
          {['equipamentos', 'agentes'].includes(recurso) && (
            <>
              <Seletor
                rotulo="Órgão"
                value={filtros.orgaoId || ''}
                onChange={(v) => alterarFiltro('orgaoId', v)}
                opcoes={catalogos.orgaos}
                todos="Todos os órgãos"
              />
              <Seletor
                rotulo="Bairro"
                value={filtros.bairro || ''}
                onChange={(v) => alterarFiltro('bairro', v)}
                opcoes={[...new Set((consulta.dados || []).map((i) => i.bairro).filter(Boolean))]}
                todos="Todos os bairros"
              />
            </>
          )}
          {recurso === 'agentes' && (
            <Seletor
              rotulo="Função"
              value={filtros.funcao || ''}
              onChange={(v) => alterarFiltro('funcao', v)}
              opcoes={[...new Set((consulta.dados || []).map((i) => i.funcao))]}
              todos="Todas as funções"
            />
          )}
          {recurso !== 'manutencoes' && (
            <Seletor
              rotulo="Região"
              value={filtros.regiaoId || ''}
              onChange={(v) => alterarFiltro('regiaoId', v)}
              opcoes={catalogos.regioes}
              todos="Todas as regiões"
            />
          )}
          {recurso === 'manutencoes' && (
            <>
              <Seletor
                rotulo="Prazo"
                value={prazo}
                onChange={setPrazo}
                opcoes={[
                  { id: 'ATRASADA', nome: 'Atrasadas' },
                  { id: 'PROXIMA', nome: 'Próximas (48 h)' },
                  { id: 'URGENTE', nome: 'Urgentes' },
                ]}
                todos="Todos os prazos"
              />
              <Seletor
                rotulo="Prioridade"
                value={filtros.prioridade || ''}
                onChange={(v) => alterarFiltro('prioridade', v)}
                opcoes={prioridades}
                todos="Todas as prioridades"
              />
            </>
          )}
        </div>
        <EstadoConsulta consulta={consulta}>
          <TabelaDados
            dados={dados}
            colunas={colunas}
            chave={JSON.stringify([filtros, busca, prazo])}
          />
        </EstadoConsulta>
      </section>
      <Modal
        aberto={formulario !== null}
        aoFechar={fecharFormulario}
        titulo={`${formulario?.id ? 'Editar' : 'Cadastrar'} ${config.singular}`}
        descricao="As informações serão validadas e gravadas no servidor."
      >
        {formulario && (
          <EstadoConsulta consulta={equipamentos}>
            <FormularioRecurso
              recurso={recurso}
              registro={formulario}
              equipamentos={equipamentos.dados || []}
              aoSalvar={() => {
                setFormulario(null);
                atualizar();
              }}
              aoCancelar={() => setFormulario(null)}
            />
          </EstadoConsulta>
        )}
      </Modal>
      <Modal
        aberto={Boolean(detalhe)}
        aoFechar={() => setDetalhe(null)}
        titulo={`Detalhes do ${config.singular}`}
        descricao="Informações atuais do cadastro e datas registradas pelo servidor."
      >
        {detalhe && (
          <>
            <dl className="details">
              {formularios[recurso].map((c) => (
                <div key={c.nome}>
                  <dt>{c.titulo}</dt>
                  <dd>
                    {c.catalogo
                      ? c.catalogo === 'equipamentos'
                        ? nomeEquipamento(detalhe[c.nome])
                        : nomeCatalogo(c.catalogo, detalhe[c.nome])
                      : c.tipo === 'datetime-local'
                        ? dataHora(detalhe[c.nome])
                        : rotulo(detalhe[c.nome])}
                  </dd>
                </div>
              ))}
              {detalhe.ultimaPosicaoEm && (
                <div>
                  <dt>Última posição conhecida</dt>
                  <dd>{dataHora(detalhe.ultimaPosicaoEm)}</dd>
                </div>
              )}
              {detalhe.propriedades &&
                Object.entries(detalhe.propriedades).map(([k, v]) => (
                  <div key={k}>
                    <dt>{rotulo(k)}</dt>
                    <dd>{typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : String(v)}</dd>
                  </div>
                ))}
            </dl>
            <div className="detail-actions">
              {['equipamentos', 'manutencoes'].includes(recurso) && (
                <Button
                  variant="outline"
                  disabled={ocupado}
                  onClick={() => abrirHistorico(detalhe)}
                >
                  <History size={16} />
                  Consultar histórico
                </Button>
              )}
              {['equipamentos', 'agentes'].includes(recurso) && (
                <Button variant="destructive" onClick={() => setExcluir(detalhe)}>
                  <Trash2 size={16} />
                  Excluir logicamente
                </Button>
              )}
            </div>
          </>
        )}
      </Modal>
      <Modal
        aberto={historico !== null}
        aoFechar={() => setHistorico(null)}
        titulo="Histórico do recurso"
        descricao="Registros de alteração preservados pelo servidor."
      >
        {historico?.length ? (
          historico.map((item) => (
            <div className="history" key={item.id}>
              <strong>{dataHora(item.criadoEm)}</strong>
              {item.situacaoNova ? (
                <>
                  <p>
                    {rotulo(item.situacaoAnterior)} → {rotulo(item.situacaoNova)}
                  </p>
                  <p>{item.motivo}</p>
                </>
              ) : (
                <>
                  <p>Situação: {rotulo(item.dados?.atual?.situacao)}</p>
                  <p>{item.dados?.atual?.descricao}</p>
                  <p>Previsão: {dataHora(item.dados?.atual?.dataPrevista)}</p>
                </>
              )}
            </div>
          ))
        ) : (
          <EstadoVazio titulo="Sem histórico" descricao="Nenhuma alteração registrada." />
        )}
      </Modal>
      <Modal
        aberto={Boolean(excluir)}
        aoFechar={() => !ocupado && setExcluir(null)}
        titulo="Excluir cadastro?"
        descricao="O registro deixará as listagens ativas. O histórico será preservado."
      >
        <p className="text-sm">{excluir?.nome || excluir?.descricao}</p>
        <div className="form-actions">
          <Button variant="outline" disabled={ocupado} onClick={() => setExcluir(null)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={ocupado}
            onClick={async () => {
              setOcupado(true);
              try {
                await recursos[recurso].excluir(excluir.id);
                setExcluir(null);
                setDetalhe(null);
                atualizar();
                toast.success('Cadastro excluído.');
              } catch (e) {
                toast.error(e.message);
              } finally {
                setOcupado(false);
              }
            }}
          >
            {ocupado ? 'Excluindo…' : 'Confirmar exclusão'}
          </Button>
        </div>
      </Modal>
    </>
  );
}

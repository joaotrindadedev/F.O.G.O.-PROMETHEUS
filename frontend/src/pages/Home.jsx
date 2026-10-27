import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cctv, Activity, Users, ShieldAlert, ArrowUpRight, Wrench } from 'lucide-react';
import { painel, recursos, listarTodos } from '../services/api';
import { useOperacao } from '../contexts/Operacao';
import { useConsulta } from '../hooks/useConsulta';
import { dataHora } from '../utils/dados';
import {
  Atualizar,
  EstadoConsulta,
  EstadoVazio,
  Seletor,
  TituloPagina,
  IndicadorSituacao,
} from '../components/Comuns';
import { MapaOperacional } from '../components/mapas/MapaOperacional';
import { ListaAlertasResumo } from './Alertas';
export default function Home({ somenteMapa = false }) {
  const { catalogos } = useOperacao();
  const [regiaoId, setRegiaoId] = useState('');
  const consulta = useConsulta(async (signal) => {
    const filtros = regiaoId ? { regiaoId } : {};
    const [resumo, equipamentos, agentes, alertas, manutencoes, regioes] = await Promise.all([
      painel.resumo(regiaoId || undefined),
      recursos.equipamentos.listar(filtros, signal),
      recursos.agentes.listar(filtros, signal),
      recursos.alertas.listar(filtros, signal),
      recursos.manutencoes.listar({}, signal),
      listarTodos('/painel/regioes', {}, signal),
    ]);
    return {
      resumo,
      equipamentos,
      agentes,
      alertas: alertas
        .filter((a) => a.situacao !== 'RESOLVIDO')
        .sort(
          (a, b) =>
            ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'].indexOf(a.gravidade) -
            ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'].indexOf(b.gravidade),
        ),
      manutencoes: manutencoes.filter(
        (m) => !regiaoId || equipamentos.some((e) => e.id === m.equipamentoId),
      ),
      regioes: regioes.filter((r) => !regiaoId || r.regiao.id === regiaoId),
    };
  }, regiaoId);
  const dados = consulta.dados;
  const resumo = dados?.resumo;
  const urgentes =
    dados?.manutencoes.filter(
      (m) =>
        ['PENDENTE', 'EM_ANDAMENTO'].includes(m.situacao) &&
        (m.atrasada || ['ALTA', 'CRITICA'].includes(m.prioridade)),
    ) || [];
  return (
    <>
      <TituloPagina
        titulo={somenteMapa ? 'Mapa operacional' : 'Visão geral da operação'}
        descricao={
          somenteMapa
            ? 'Recursos no território e suas últimas posições conhecidas.'
            : 'O que acontece na cidade, em uma única visão.'
        }
      >
        <Seletor
          rotulo="Região da operação"
          value={regiaoId}
          onChange={setRegiaoId}
          opcoes={catalogos.regioes}
          todos="Todas as regiões"
        />
        <Atualizar />
      </TituloPagina>
      <EstadoConsulta consulta={consulta}>
        {dados && (
          <>
            {!somenteMapa && (
              <div className="indicator-strip">
                {[
                  {
                    nome: 'Equipamentos',
                    valor: resumo.totalEquipamentos,
                    nota: `${resumo.equipamentosOperacionais} operacionais · ${resumo.equipamentosIndisponiveis} indisponíveis`,
                    Icone: Cctv,
                  },
                  {
                    nome: 'Disponibilidade',
                    valor:
                      resumo.percentualDisponibilidade == null
                        ? '—'
                        : resumo.percentualDisponibilidade.toLocaleString('pt-BR') + '%',
                    nota: `Sobre ${resumo.equipamentosElegiveis} equipamentos elegíveis`,
                    Icone: Activity,
                  },
                  {
                    nome: 'Agentes em atividade',
                    valor: resumo.agentesEmAtividade,
                    nota: `${resumo.totalAgentes} agentes cadastrados`,
                    Icone: Users,
                  },
                  {
                    nome: 'Alertas críticos',
                    valor: resumo.alertasCriticos,
                    nota: 'Ativos e aguardando resolução',
                    Icone: ShieldAlert,
                  },
                ].map(({ nome, valor, nota, Icone }) => (
                  <div className="indicator" key={nome}>
                    <div className="indicator-label">
                      <Icone aria-hidden="true" />
                      {nome}
                    </div>
                    <div
                      className={`indicator-number ${nome === 'Alertas críticos' && valor ? 'critical' : ''}`}
                    >
                      {valor}
                    </div>
                    <div className="indicator-note">{nota}</div>
                  </div>
                ))}
              </div>
            )}
            <div className={somenteMapa ? '' : 'operations-grid'}>
              <MapaOperacional
                equipamentos={dados.equipamentos}
                agentes={dados.agentes}
                expandido={somenteMapa}
              />
              {!somenteMapa && <ListaAlertasResumo alertas={dados.alertas} />}
            </div>
            {!somenteMapa && (
              <div className="lower-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Disponibilidade por região</h2>
                      <p>Proporção de equipamentos aptos a operar</p>
                    </div>
                    <Activity size={18} className="text-muted-foreground" />
                  </div>
                  <div className="panel-body">
                    {dados.regioes.length ? (
                      dados.regioes.map(({ regiao, indicadores }) => (
                        <div className="region-line" key={regiao.id}>
                          <div>
                            {regiao.nome}
                            <small className="block mt-1">
                              {indicadores.equipamentosOperacionais} de{' '}
                              {indicadores.equipamentosElegiveis} elegíveis
                            </small>
                          </div>
                          <div className="meter">
                            <span
                              style={{ width: `${indicadores.percentualDisponibilidade || 0}%` }}
                            />
                          </div>
                          <strong>
                            {indicadores.percentualDisponibilidade == null
                              ? 'Sem base'
                              : indicadores.percentualDisponibilidade.toLocaleString('pt-BR') + '%'}
                          </strong>
                        </div>
                      ))
                    ) : (
                      <EstadoVazio titulo="Nenhuma região cadastrada" />
                    )}
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Manutenções prioritárias</h2>
                      <p>
                        {urgentes.length} urgentes ou atrasadas • {resumo.manutencoesPendentes}{' '}
                        pendentes
                      </p>
                    </div>
                    <Wrench size={18} className="text-muted-foreground" />
                  </div>
                  <div>
                    {urgentes.length ? (
                      urgentes.slice(0, 3).map((m) => (
                        <div className="alert-item" key={m.id}>
                          <div className="flex justify-between gap-3">
                            <h3>{m.descricao}</h3>
                            <IndicadorSituacao valor={m.prioridade} />
                          </div>
                          <p>
                            {m.atrasada ? 'Atrasada • ' : ''}
                            {dataHora(m.dataPrevista)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <EstadoVazio
                        titulo="Sem manutenção urgente"
                        descricao="Acompanhe os próximos serviços na agenda."
                      />
                    )}
                  </div>
                  <Link className="panel-link" to="/manutencoes">
                    Consultar manutenções <ArrowUpRight size={14} />
                  </Link>
                </section>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Última consulta: {dataHora(consulta.atualizadoEm)}. Posições antigas são preservadas
              com seu horário original.
            </p>
          </>
        )}
      </EstadoConsulta>
    </>
  );
}

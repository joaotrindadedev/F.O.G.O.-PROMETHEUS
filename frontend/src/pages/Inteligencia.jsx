import { useState } from 'react';
import { Info, ArrowUpRight } from 'lucide-react';
import { previsoes, recursos } from '../services/api';
import { useConsulta } from '../hooks/useConsulta';
import { useOperacao } from '../contexts/Operacao';
import {
  Atualizar,
  EstadoConsulta,
  EstadoVazio,
  IndicadorSituacao,
  Modal,
  Seletor,
  TituloPagina,
} from '../components/Comuns';
import { GraficoIndicadores } from '../components/graficos/GraficoIndicadores';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { dataHora } from '../utils/dados';
const fatoresNomes = {
  totalEquipamentos: 'Equipamentos cadastrados',
  elegiveis: 'Equipamentos elegíveis',
  operacionais: 'Equipamentos operacionais',
  defeituosos: 'Equipamentos com defeito',
  alertasCriticos: 'Alertas críticos',
  manutencoesUrgentes: 'Manutenções urgentes',
  agentesDisponiveis: 'Agentes disponíveis',
  ocorrencias: 'Ocorrências no período',
  ocorrenciasAnteriores: 'Ocorrências no período anterior',
  dias: 'Dias analisados',
};
export default function Inteligencia() {
  const { catalogos } = useOperacao();
  const [regiaoId, setRegiao] = useState('');
  const [dias, setDias] = useState('30');
  const [detalhe, setDetalhe] = useState(null);
  const consulta = useConsulta(async (signal) => {
    const params = { dias: Number(dias), ...(regiaoId ? { regiaoId } : {}) };
    const area = regiaoId ? { regiaoId } : {};
    const [riscos, horarios, tendencias, anomalias, historico, recomendacoes] = await Promise.all([
      previsoes.listar('riscos', params, signal),
      previsoes.horarios(params, signal),
      previsoes.listar('tendencias', params, signal),
      previsoes.listar('anomalias', area, signal),
      previsoes.listar('historico', area, signal),
      recursos.recomendacoes.listar(area, signal),
    ]);
    return { riscos, horarios, tendencias, anomalias, historico, recomendacoes };
  }, regiaoId + dias);
  const dados = consulta.dados;
  const nomeRegiao = (id) =>
    catalogos.regioes.find((r) => r.id === id)?.nome || 'Região não encontrada';
  return (
    <>
      <TituloPagina
        titulo="Inteligência operacional"
        descricao="Evidências do passado para preparar as próximas decisões."
      >
        <Seletor
          rotulo="Região analisada"
          value={regiaoId}
          onChange={setRegiao}
          opcoes={catalogos.regioes}
          todos="Todas as regiões"
        />
        <select
          aria-label="Período de análise"
          className="select-native"
          value={dias}
          onChange={(e) => setDias(e.target.value)}
        >
          {[7, 15, 30, 60, 90].map((d) => (
            <option key={d} value={d}>
              Últimos {d} dias
            </option>
          ))}
        </select>
        <Atualizar />
      </TituloPagina>
      <div className="notice flex gap-3">
        <Info size={17} className="mt-0.5" />
        <span>
          Estimativas operacionais baseadas em regras, não probabilidades de crimes ou acidentes.
          Recomendações exigem avaliação humana; nenhuma operação é executada automaticamente.
        </span>
      </div>
      <EstadoConsulta consulta={consulta}>
        {dados && (
          <>
            <Tabs defaultValue="panorama">
              <TabsList className="mb-6">
                <TabsTrigger value="panorama">Panorama</TabsTrigger>
                <TabsTrigger value="tendencias">Tendências e anomalias</TabsTrigger>
                <TabsTrigger value="recomendacoes">Recomendações</TabsTrigger>
              </TabsList>
              <TabsContent value="panorama">
                <div className="risk-grid">
                  {dados.riscos.map((r) => (
                    <section className="panel" key={r.regiaoId}>
                      <div className="panel-body">
                        <div className="flex justify-between gap-2">
                          <h2>{nomeRegiao(r.regiaoId)}</h2>
                          <IndicadorSituacao valor={r.classificacao} />
                        </div>
                        <div className="risk-score">
                          {r.pontuacao}
                          <small> / 100</small>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {r.amostra?.suficiente
                            ? 'Amostra suficiente pelos critérios do servidor'
                            : 'Amostra insuficiente: interprete com cautela'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-3">
                          {dataHora(r.periodo.inicio)} a {dataHora(r.periodo.fim)}
                        </p>
                        <Button
                          variant="link"
                          className="!px-0 mt-2 text-xs"
                          onClick={() => setDetalhe(r)}
                        >
                          Entender os fatores <ArrowUpRight size={14} />
                        </Button>
                      </div>
                    </section>
                  ))}
                </div>
                {!dados.riscos.length && <EstadoVazio titulo="Sem regiões para análise" />}
                {!dados.horarios.dadosSuficientes && (
                  <div className="notice">
                    Amostra de horários insuficiente: {dados.horarios.amostras} ocorrências. O
                    backend exige pelo menos 10.
                  </div>
                )}
                <div className="lower-grid">
                  <GraficoIndicadores
                    titulo="Ocorrências por horário"
                    descricao={`${dataHora(dados.horarios.periodo.inicio)} a ${dataHora(dados.horarios.periodo.fim)} • ${dados.horarios.fuso}`}
                    dados={dados.horarios.porHora.map((h) => ({ ...h, hora: `${h.hora}h` }))}
                  />
                  <GraficoIndicadores
                    titulo="Ocorrências por dia da semana"
                    descricao={`Quantidade de registros nos últimos ${dias} dias`}
                    dados={dados.horarios.porDia}
                    chave="dia"
                  />
                </div>
              </TabsContent>
              <TabsContent value="tendencias">
                <section className="panel mb-6">
                  <div className="panel-heading">
                    <div>
                      <h2>Variação das ocorrências</h2>
                      <p>
                        Últimos {dias} dias comparados aos {dias} dias anteriores
                      </p>
                    </div>
                  </div>
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Região</th>
                          <th>Período anterior</th>
                          <th>Período atual</th>
                          <th>Variação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dados.tendencias.map((t) => (
                          <tr key={t.regiaoId}>
                            <td>{t.nome}</td>
                            <td>{t.anterior}</td>
                            <td>{t.atual}</td>
                            <td>
                              {t.variacaoPercentual == null
                                ? 'Sem base anterior'
                                : `${t.variacaoPercentual > 0 ? '+' : ''}${t.variacaoPercentual}%`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className="panel mb-6">
                  <div className="panel-heading">
                    <div>
                      <h2>Anomalias operacionais</h2>
                      <p>Comparação com até 168 fotografias horárias reais dos últimos 7 dias</p>
                    </div>
                  </div>
                  <div className="panel-body">
                    {dados.anomalias.map((a) => (
                      <div key={a.regiaoId} className="mb-5">
                        <h3 className="mb-3">{nomeRegiao(a.regiaoId)}</h3>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {[
                            ['defeitos', 'Defeitos'],
                            ['comunicacao', 'Comunicação'],
                            ['alertas', 'Alertas'],
                            ['disponibilidade', 'Disponibilidade'],
                          ].map(([chave, nome]) => (
                            <div key={chave} className="text-xs border rounded p-3">
                              <strong>{nome}</strong>
                              <p className="mt-2 text-muted-foreground">
                                {!a[chave].dadosSuficientes
                                  ? a[chave].motivo ||
                                    `Dados insuficientes: ${a[chave].amostras || 0} de ${a[chave].minimo || 7} amostras mínimas.`
                                  : a[chave].anomalia
                                    ? 'Anomalia identificada pelo servidor'
                                    : 'Sem desvio significativo'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <div className="notice">
                  O backend não expõe uma série histórica de disponibilidade. Abaixo são exibidas
                  apenas as fotografias persistidas de risco; não há interpolação de dados ausentes.
                </div>
                {dados.riscos.map((r) => (
                  <div className="mb-5" key={r.regiaoId}>
                    <GraficoIndicadores
                      titulo={`Histórico de risco • ${nomeRegiao(r.regiaoId)}`}
                      descricao="Fotografias persistidas pelo servidor • índice de 0 a 100"
                      dados={dados.historico
                        .filter((h) => h.regiaoId === r.regiaoId)
                        .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm))
                        .map((h) => ({ data: dataHora(h.criadoEm), pontuacao: h.pontuacao }))}
                      chave="data"
                      valor="pontuacao"
                      unidade="pontos"
                      linha
                    />
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="recomendacoes">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Recomendações preventivas</h2>
                      <p>
                        Histórico de recomendações do servidor • geração independente do período
                        selecionado
                      </p>
                    </div>
                  </div>
                  {dados.recomendacoes.length ? (
                    dados.recomendacoes.map((r) => (
                      <article className="recommendation" key={r.id}>
                        <div className="flex justify-between gap-3">
                          <h3>{r.titulo}</h3>
                          <IndicadorSituacao valor={r.prioridade} />
                        </div>
                        <p>{r.descricao}</p>
                        <div className="text-xs text-muted-foreground mb-3">
                          {nomeRegiao(r.regiaoId)} • Gerada em {dataHora(r.criadoEm)}
                        </div>
                        <details>
                          <summary>Justificativa e dados considerados</summary>
                          <p>{r.justificativa}</p>
                          {(() => {
                            const p = dados.historico.find((p) => p.id === r.previsaoId);
                            return p ? (
                              <>
                                <p>
                                  Período: {dataHora(p.inicioPeriodo)} a {dataHora(p.fimPeriodo)}
                                </p>
                                <dl className="details">
                                  {Object.entries(p.fatores || {})
                                    .filter(([k]) => fatoresNomes[k])
                                    .map(([k, v]) => (
                                      <div key={k}>
                                        <dt>{fatoresNomes[k]}</dt>
                                        <dd>{String(v)}</dd>
                                      </div>
                                    ))}
                                </dl>
                              </>
                            ) : (
                              <p>Fotografia de origem não disponível nesta consulta.</p>
                            );
                          })()}
                        </details>
                      </article>
                    ))
                  ) : (
                    <EstadoVazio
                      titulo="Nenhuma recomendação disponível"
                      descricao="As recomendações aparecem quando os critérios do backend são atendidos."
                    />
                  )}
                </section>
              </TabsContent>
            </Tabs>
          </>
        )}
      </EstadoConsulta>
      <Modal
        aberto={Boolean(detalhe)}
        aoFechar={() => setDetalhe(null)}
        titulo="Fatores do índice de risco"
        descricao={detalhe ? nomeRegiao(detalhe.regiaoId) : ''}
      >
        {detalhe && (
          <>
            <p className="text-sm">{detalhe.aviso}</p>
            <dl className="details">
              {Object.entries(detalhe.fatores).map(([k, v]) => (
                <div key={k}>
                  <dt>{fatoresNomes[k] || k}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-muted-foreground">
              Pontuação e classificação recebidas do backend. Nenhum cálculo de risco é realizado no
              navegador.
            </p>
          </>
        )}
      </Modal>
    </>
  );
}

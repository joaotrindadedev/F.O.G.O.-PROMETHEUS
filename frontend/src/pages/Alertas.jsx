import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCheck, Check } from 'lucide-react';
import { toast } from 'sonner';
import { recursos } from '../services/api';
import { useConsulta } from '../hooks/useConsulta';
import { useOperacao } from '../contexts/Operacao';
import { dataHora, filtrar } from '../utils/dados';
import { prioridades } from '../utils/formularios';
import {
  Atualizar,
  CampoBusca,
  EstadoConsulta,
  EstadoVazio,
  IndicadorSituacao,
  Modal,
  Seletor,
  TituloPagina,
} from '../components/Comuns';
import { Button } from '../components/ui/button';
export function CartaoAlerta({ alerta, aoAbrir }) {
  return (
    <article className="alert-item">
      <div className="alert-item-top">
        <IndicadorSituacao valor={alerta.gravidade} />
        <small>{dataHora(alerta.criadoEm)}</small>
      </div>
      <h3>{alerta.titulo}</h3>
      <p>{alerta.descricao}</p>
      {aoAbrir && (
        <Button variant="link" className="!p-0 !h-7 mt-2 text-xs" onClick={() => aoAbrir(alerta)}>
          Consultar alerta <ArrowUpRight size={13} />
        </Button>
      )}
    </article>
  );
}
export function ListaAlertasResumo({ alertas }) {
  return (
    <section className="panel alerts-panel">
      <div className="panel-heading">
        <div>
          <h2>Alertas em atenção</h2>
          <p>Prioridades da operação</p>
        </div>
        <span className="badge-status bad">{alertas.length} ativos</span>
      </div>
      <div className="alert-list">
        {alertas.length ? (
          alertas.slice(0, 3).map((a) => <CartaoAlerta key={a.id} alerta={a} />)
        ) : (
          <EstadoVazio
            titulo="Nenhum alerta ativo"
            descricao="Nenhum alerta pendente neste recorte."
          />
        )}
      </div>
      <Link className="panel-link" to="/alertas">
        Acessar todos os alertas <ArrowUpRight size={14} />
      </Link>
    </section>
  );
}
export default function Alertas() {
  const { catalogos, atualizar } = useOperacao();
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState({});
  const [selecionado, setSelecionado] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [resolver, setResolver] = useState(false);
  const consulta = useConsulta((signal) => recursos.alertas.listar({}, signal));
  const dados = filtrar(consulta.dados || [], busca, filtros);
  async function alterar(situacao) {
    setOcupado(true);
    try {
      const alerta = await recursos.alertas.salvar(selecionado.id, { situacao });
      setSelecionado(alerta);
      setResolver(false);
      atualizar();
      toast.success(situacao === 'RESOLVIDO' ? 'Alerta resolvido.' : 'Alerta reconhecido.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setOcupado(false);
    }
  }
  return (
    <>
      <TituloPagina
        titulo="Alertas operacionais"
        descricao="Identifique, reconheça e acompanhe as situações que exigem atenção."
      >
        <Atualizar />
      </TituloPagina>
      <section className="panel">
        <div className="filterbar">
          <CampoBusca value={busca} onChange={setBusca} />
          <Seletor
            rotulo="Gravidade"
            value={filtros.gravidade || ''}
            onChange={(v) => setFiltros((f) => ({ ...f, gravidade: v }))}
            opcoes={prioridades}
            todos="Todas as gravidades"
          />
          <Seletor
            rotulo="Situação"
            value={filtros.situacao || ''}
            onChange={(v) => setFiltros((f) => ({ ...f, situacao: v }))}
            opcoes={['ABERTO', 'RECONHECIDO', 'RESOLVIDO']}
            todos="Todas as situações"
          />
          <Seletor
            rotulo="Região"
            value={filtros.regiaoId || ''}
            onChange={(v) => setFiltros((f) => ({ ...f, regiaoId: v }))}
            opcoes={catalogos.regioes}
            todos="Todas as regiões"
          />
        </div>
        <EstadoConsulta consulta={consulta}>
          {dados.length ? (
            <div className="grid lg:grid-cols-2">
              {dados.map((a) => (
                <div
                  key={a.id}
                  className={
                    a.gravidade === 'CRITICA'
                      ? 'border-l-4 border-l-red-700'
                      : 'border-l-4 border-l-transparent'
                  }
                >
                  <CartaoAlerta alerta={a} aoAbrir={setSelecionado} />
                </div>
              ))}
            </div>
          ) : (
            <EstadoVazio
              titulo="Nenhum alerta encontrado"
              descricao="Não há alertas para os filtros selecionados."
            />
          )}
        </EstadoConsulta>
      </section>
      <Modal
        aberto={Boolean(selecionado)}
        aoFechar={() => !ocupado && setSelecionado(null)}
        titulo={selecionado?.titulo || 'Alerta'}
        descricao="Reconheça o atendimento e registre a resolução após verificar o recurso."
      >
        {selecionado && (
          <>
            <div className="flex gap-2">
              <IndicadorSituacao valor={selecionado.gravidade} />
              <IndicadorSituacao valor={selecionado.situacao} />
            </div>
            <p className="text-sm leading-6">{selecionado.descricao}</p>
            <dl className="details">
              {[
                ['Origem', selecionado.origem],
                [
                  'Região',
                  catalogos.regioes.find((r) => r.id === selecionado.regiaoId)?.nome ||
                    'Não informada',
                ],
                [
                  'Recurso relacionado',
                  selecionado.equipamentoId || selecionado.agenteId || 'Região',
                ],
                ['Criado em', dataHora(selecionado.criadoEm)],
                ['Resolvido em', dataHora(selecionado.resolvidoEm)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {selecionado.situacao !== 'RESOLVIDO' && (
              <div className="form-actions">
                {selecionado.situacao !== 'RECONHECIDO' && (
                  <Button
                    variant="outline"
                    disabled={ocupado}
                    onClick={() => alterar('RECONHECIDO')}
                  >
                    <Check size={16} />
                    Reconhecer
                  </Button>
                )}
                <Button disabled={ocupado} onClick={() => setResolver(true)}>
                  <CheckCheck size={16} />
                  Resolver alerta
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>
      <Modal
        aberto={resolver}
        aoFechar={() => !ocupado && setResolver(false)}
        titulo="Confirmar resolução"
        descricao="Confirme que a situação foi verificada. Um alerta resolvido não pode ser reaberto."
      >
        <div className="form-actions">
          <Button variant="outline" disabled={ocupado} onClick={() => setResolver(false)}>
            Cancelar
          </Button>
          <Button disabled={ocupado} onClick={() => alterar('RESOLVIDO')}>
            {ocupado ? 'Salvando…' : 'Confirmar resolução'}
          </Button>
        </div>
      </Modal>
    </>
  );
}

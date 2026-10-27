import {
  paginar,
  filtroEquipamentos,
  filtroAgentes,
  filtroArea,
  situacoesInelegiveis,
  situacoesPendentes,
} from "../utils/consulta.js";
import { buscarAtivo } from "./cadastroService.js";
import { ErroAplicacao } from "../utils/erro.js";

export async function calcularResumo(banco, regiaoId) {
  const equipamentos = { excluidoEm: null, ...(regiaoId ? { regiaoId } : {}) };
  const agentes = { ...equipamentos };
  const elegiveis = {
    ...equipamentos,
    situacao: { notIn: situacoesInelegiveis },
  };
  const [
    total,
    quantidadeElegiveis,
    operacionais,
    categorias,
    situacoes,
    totalAgentes,
    ativos,
    pendentes,
    atrasadas,
    criticos,
  ] = await Promise.all([
    banco.equipamento.count({ where: equipamentos }),
    banco.equipamento.count({ where: elegiveis }),
    banco.equipamento.count({
      where: { ...equipamentos, situacao: "OPERACIONAL" },
    }),
    banco.equipamento.groupBy({
      by: ["tipoId"],
      where: equipamentos,
      _count: { _all: true },
    }),
    banco.equipamento.groupBy({
      by: ["situacao"],
      where: equipamentos,
      _count: { _all: true },
    }),
    banco.agente.count({ where: agentes }),
    banco.agente.count({ where: { ...agentes, situacao: "EM_ATIVIDADE" } }),
    banco.manutencao.count({
      where: {
        equipamento: equipamentos,
        situacao: { in: situacoesPendentes },
      },
    }),
    banco.manutencao.count({
      where: {
        equipamento: equipamentos,
        situacao: { in: situacoesPendentes },
        dataPrevista: { lt: new Date() },
      },
    }),
    banco.alerta.count({
      where: {
        ...(regiaoId ? { regiaoId } : {}),
        situacao: { not: "RESOLVIDO" },
        gravidade: "CRITICA",
      },
    }),
  ]);
  // Não instalados e desativados não devem operar; sem elegíveis, a porcentagem não é definida.
  return {
    totalEquipamentos: total,
    equipamentosElegiveis: quantidadeElegiveis,
    equipamentosOperacionais: operacionais,
    equipamentosIndisponiveis: quantidadeElegiveis - operacionais,
    percentualDisponibilidade: quantidadeElegiveis
      ? Math.round((operacionais / quantidadeElegiveis) * 10000) / 100
      : null,
    equipamentosPorCategoria: categorias.map((item) => ({
      tipoId: item.tipoId,
      quantidade: item._count._all,
    })),
    equipamentosPorSituacao: situacoes.map((item) => ({
      situacao: item.situacao,
      quantidade: item._count._all,
    })),
    totalAgentes,
    agentesEmAtividade: ativos,
    manutencoesPendentes: pendentes,
    manutencoesAtrasadas: atrasadas,
    alertasCriticos: criticos,
  };
}

export function criarOperacaoServico(banco, publicar) {
  return {
    resumo: (consulta) =>
      banco.$transaction(
        (transacao) => calcularResumo(transacao, consulta.regiaoId),
        { isolationLevel: "RepeatableRead" },
      ),
    async regioes(consulta) {
      const resultado = await paginar(
        banco.regiao,
        { excluidoEm: null },
        consulta,
      );
      resultado.dados = await Promise.all(
        resultado.dados.map(async (regiao) => ({
          regiao,
          indicadores: await calcularResumo(banco, regiao.id),
        })),
      );
      return resultado;
    },
    async mapa(consulta) {
      const agentes = consulta.recurso === "agentes";
      const filtro = {
        ...(agentes ? filtroAgentes(consulta) : filtroEquipamentos(consulta)),
        ...filtroArea(consulta),
      };
      const resultado = await paginar(
        agentes ? banco.agente : banco.equipamento,
        filtro,
        consulta,
      );
      resultado.dados = resultado.dados.map((item) => ({
        id: item.id,
        recurso: consulta.recurso,
        situacao: item.situacao,
        regiaoId: item.regiaoId,
        orgaoId: item.orgaoId,
        tipoId: item.tipoId,
        bairro: item.bairro,
        cidade: item.cidade,
        geometria: {
          type: "Point",
          coordinates: [item.longitude, item.latitude],
        },
        ultimaPosicaoEm: item.ultimaPosicaoEm,
      }));
      return resultado;
    },
    listarAlertas(consulta) {
      const filtro = {};
      for (const campo of [
        "situacao",
        "gravidade",
        "regiaoId",
        "equipamentoId",
      ])
        if (consulta[campo]) filtro[campo] = consulta[campo];
      return paginar(banco.alerta, filtro, consulta);
    },
    async buscarAlerta(id) {
      const alerta = await banco.alerta.findFirst({
        where: {
          id,
        },
      });
      if (!alerta) throw new ErroAplicacao("Alerta não encontrado.", 404);
      return alerta;
    },
    async criarAlerta(dados) {
      if (dados.tipo === "SEM_COMUNICACAO")
        throw new ErroAplicacao(
          "O tipo SEM_COMUNICACAO é reservado à verificação automática.",
          422,
        );
      const alerta = await banco.$transaction(async (transacao) => {
        let regiaoId = dados.regiaoId;
        if (dados.equipamentoId || dados.agenteId) {
          const recurso = await buscarAtivo(
            transacao,
            dados.equipamentoId ? "equipamento" : "agente",
            dados.equipamentoId ?? dados.agenteId,
          );
          regiaoId ??= recurso.regiaoId;
          if (regiaoId && recurso.regiaoId && regiaoId !== recurso.regiaoId)
            throw new ErroAplicacao(
              "A região do alerta deve coincidir com a região do recurso.",
              422,
            );
        }
        if (regiaoId) await buscarAtivo(transacao, "regiao", regiaoId);
        const chaveAtiva = `${dados.tipo}:${dados.equipamentoId ?? dados.agenteId ?? regiaoId}`;
        return transacao.alerta.create({
          data: { ...dados, regiaoId, chaveAtiva },
        });
      });
      publicar("alerta:criado", alerta, Boolean(alerta.agenteId));
      return alerta;
    },
    async alterarAlerta(id, dados) {
      const atualizado = await banco.$transaction(
        async (transacao) => {
          const anterior = await transacao.alerta.findUnique({ where: { id } });
          if (!anterior) throw new ErroAplicacao("Alerta não encontrado.", 404);
          if (anterior.situacao === "RESOLVIDO")
            throw new ErroAplicacao("Alerta já resolvido.", 409);
          return transacao.alerta.update({
            where: { id },
            data: {
              situacao: dados.situacao,
              ...(dados.situacao === "RESOLVIDO"
                ? { resolvidoEm: new Date(), chaveAtiva: null }
                : {}),
            },
          });
        },
        { isolationLevel: "Serializable" },
      );
      publicar("alerta:atualizado", atualizado, Boolean(atualizado.agenteId));
      return atualizado;
    },
    listarOcorrencias(consulta) {
      const filtro = {};
      for (const campo of ["regiaoId", "bairro", "gravidade"])
        if (consulta[campo]) filtro[campo] = consulta[campo];
      if (consulta.inicio || consulta.fim)
        filtro.ocorridoEm = { gte: consulta.inicio, lte: consulta.fim };
      return paginar(banco.ocorrencia, filtro, consulta);
    },
    async buscarOcorrencia(id) {
      const ocorrencia = await banco.ocorrencia.findUnique({ where: { id } });
      if (!ocorrencia)
        throw new ErroAplicacao("Ocorrência não encontrada.", 404);
      return ocorrencia;
    },
    async criarOcorrencia(dados) {
      await buscarAtivo(banco, "regiao", dados.regiaoId);
      const ocorrencia = await banco.ocorrencia.create({ data: dados });
      publicar("ocorrencia:criada", ocorrencia);
      return ocorrencia;
    },
  };
}

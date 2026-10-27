import {
  calcularRisco,
  detectarAnomalia,
  calcularTendencia,
} from "../utils/analises.js";
import { calcularResumo } from "./operacaoService.js";
import {
  paginar,
  situacoesPendentes,
  situacoesInelegiveis,
} from "../utils/consulta.js";
import { buscarAtivo } from "./cadastroService.js";

const diaMs = 86_400_000;
export function criarPrevisaoServico(banco, ambiente) {
  function periodo(dias, agora = new Date()) {
    return {
      fim: agora,
      inicio: new Date(+agora - dias * diaMs),
      anterior: new Date(+agora - 2 * dias * diaMs),
    };
  }
  async function risco(regiaoId, dias, agora = new Date(), conexao = banco) {
    const { inicio, fim, anterior } = periodo(dias, agora);
    const recursos = { regiaoId, excluidoEm: null };
    const [
      resumo,
      defeituosos,
      urgentes,
      agentesDisponiveis,
      ocorrencias,
      ocorrenciasAnteriores,
    ] = await Promise.all([
      calcularResumo(conexao, regiaoId),
      conexao.equipamento.count({
        where: { ...recursos, situacao: "MAU_FUNCIONAMENTO" },
      }),
      conexao.manutencao.count({
        where: {
          equipamento: recursos,
          situacao: { in: situacoesPendentes },
          OR: [
            { prioridade: { in: ["ALTA", "CRITICA"] } },
            { dataPrevista: { lt: fim } },
          ],
        },
      }),
      conexao.agente.count({
        where: {
          ...recursos,
          situacao: { in: ["DISPONIVEL", "EM_ATIVIDADE"] },
        },
      }),
      conexao.ocorrencia.findMany({
        where: { regiaoId, ocorridoEm: { gte: inicio, lt: fim } },
        select: { gravidade: true },
      }),
      conexao.ocorrencia.count({
        where: { regiaoId, ocorridoEm: { gte: anterior, lt: inicio } },
      }),
    ]);
    const fatores = {
      totalEquipamentos: resumo.totalEquipamentos,
      elegiveis: resumo.equipamentosElegiveis,
      operacionais: resumo.equipamentosOperacionais,
      defeituosos,
      alertasCriticos: resumo.alertasCriticos,
      manutencoesUrgentes: urgentes,
      agentesDisponiveis,
      ocorrencias,
      ocorrenciasAnteriores,
      dias,
    };
    return {
      regiaoId,
      ...calcularRisco(fatores, [
        ambiente.RISCO_LIMITE_MODERADO,
        ambiente.RISCO_LIMITE_ALTO,
        ambiente.RISCO_LIMITE_CRITICO,
      ]),
      fatores: { ...fatores, ocorrencias: ocorrencias.length },
      periodo: { inicio, fim },
    };
  }

  async function indicadores(regiaoId, conexao = banco) {
    const filtro = { regiaoId, excluidoEm: null };
    const [
      total,
      elegiveis,
      operacionais,
      defeituosos,
      semComunicacao,
      alertasAtivos,
    ] = await Promise.all([
      conexao.equipamento.count({ where: filtro }),
      conexao.equipamento.count({
        where: { ...filtro, situacao: { notIn: situacoesInelegiveis } },
      }),
      conexao.equipamento.count({
        where: { ...filtro, situacao: "OPERACIONAL" },
      }),
      conexao.equipamento.count({
        where: { ...filtro, situacao: "MAU_FUNCIONAMENTO" },
      }),
      conexao.equipamento.count({
        where: {
          ...filtro,
          semComunicacao: true,
          situacao: { notIn: situacoesInelegiveis },
        },
      }),
      conexao.alerta.count({
        where: { regiaoId, situacao: { not: "RESOLVIDO" } },
      }),
    ]);
    return {
      total,
      elegiveis,
      defeituosos,
      semComunicacao,
      alertasAtivos,
      disponibilidade: elegiveis ? (operacionais / elegiveis) * 100 : 0,
    };
  }

  async function horarios(consulta) {
    const { inicio, fim } = periodo(consulta.dias);
    const ocorrencias = await banco.ocorrencia.findMany({
      where: {
        ...(consulta.regiaoId ? { regiaoId: consulta.regiaoId } : {}),
        ocorridoEm: { gte: inicio, lt: fim },
      },
      select: { ocorridoEm: true },
    });
    const porHora = Array(24).fill(0);
    const porDia = Object.fromEntries(
      ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."].map((dia) => [
        dia,
        0,
      ]),
    );
    // Datas são UTC no banco; agrupamento usa o fuso operacional configurado, não o fuso do servidor.
    const formatador = new Intl.DateTimeFormat("pt-BR", {
      timeZone: ambiente.FUSO_ANALISE,
      weekday: "short",
      hour: "numeric",
      hourCycle: "h23",
    });
    for (const ocorrencia of ocorrencias) {
      const partes = Object.fromEntries(
        formatador
          .formatToParts(ocorrencia.ocorridoEm)
          .map((parte) => [parte.type, parte.value]),
      );
      porHora[Number(partes.hour)]++;
      porDia[partes.weekday] = (porDia[partes.weekday] ?? 0) + 1;
    }
    return {
      periodo: { inicio, fim },
      fuso: ambiente.FUSO_ANALISE,
      amostras: ocorrencias.length,
      dadosSuficientes: ocorrencias.length >= 10,
      porHora: porHora.map((quantidade, hora) => ({ hora, quantidade })),
      porDia: Object.entries(porDia).map(([dia, quantidade]) => ({
        dia,
        quantidade,
      })),
    };
  }

  return {
    async riscos(consulta) {
      const resultado = await paginar(
        banco.regiao,
        {
          excluidoEm: null,
          ...(consulta.regiaoId ? { id: consulta.regiaoId } : {}),
        },
        consulta,
      );
      resultado.dados = await Promise.all(
        resultado.dados.map((regiao) => risco(regiao.id, consulta.dias)),
      );
      return resultado;
    },
    async risco(regiaoId, consulta) {
      await buscarAtivo(banco, "regiao", regiaoId);
      return risco(regiaoId, consulta.dias);
    },
    horarios,
    async tendencias(consulta) {
      const { inicio, fim, anterior } = periodo(consulta.dias);
      const resultado = await paginar(
        banco.regiao,
        {
          excluidoEm: null,
          ...(consulta.regiaoId ? { id: consulta.regiaoId } : {}),
        },
        consulta,
      );
      resultado.dados = await Promise.all(
        resultado.dados.map(async (regiao) => {
          const [antes, agora, bairros] = await Promise.all([
            banco.ocorrencia.count({
              where: {
                regiaoId: regiao.id,
                ocorridoEm: { gte: anterior, lt: inicio },
              },
            }),
            banco.ocorrencia.count({
              where: {
                regiaoId: regiao.id,
                ocorridoEm: { gte: inicio, lt: fim },
              },
            }),
            banco.ocorrencia.groupBy({
              by: ["bairro"],
              where: {
                regiaoId: regiao.id,
                ocorridoEm: { gte: inicio, lt: fim },
              },
              _count: { _all: true },
            }),
          ]);
          return {
            regiaoId: regiao.id,
            nome: regiao.nome,
            ...calcularTendencia(antes, agora),
            bairros: bairros.map((item) => ({
              bairro: item.bairro,
              quantidade: item._count._all,
            })),
          };
        }),
      );
      return { ...resultado, periodo: { anterior, inicio, fim } };
    },
    async anomalias(consulta) {
      const resultado = await paginar(
        banco.regiao,
        {
          excluidoEm: null,
          ...(consulta.regiaoId ? { id: consulta.regiaoId } : {}),
        },
        consulta,
      );
      const horaAtual = new Date(
        Math.floor(Date.now() / 3_600_000) * 3_600_000,
      );
      resultado.dados = await Promise.all(
        resultado.dados.map(async (regiao) => {
          const [historico, atual] = await Promise.all([
            banco.indicadorOperacional.findMany({
              where: {
                regiaoId: regiao.id,
                criadoEm: {
                  gte: new Date(+horaAtual - 7 * diaMs),
                  lt: horaAtual,
                },
              },
              orderBy: { criadoEm: "desc" },
              take: 168,
            }),
            indicadores(regiao.id),
          ]);
          // Comparamos taxas de falha para mudanças no tamanho da frota não criarem falsos aumentos.
          const taxa = (item, campo) =>
            item.total ? (item[campo] / item.total) * 100 : 0;
          return {
            regiaoId: regiao.id,
            defeitos: detectarAnomalia(
              historico.map((item) => taxa(item, "defeituosos")),
              taxa(atual, "defeituosos"),
            ),
            comunicacao: detectarAnomalia(
              historico.map((item) => taxa(item, "semComunicacao")),
              taxa(atual, "semComunicacao"),
            ),
            alertas: detectarAnomalia(
              historico.map((item) => item.alertasAtivos),
              atual.alertasAtivos,
            ),
            disponibilidade:
              atual.elegiveis === 0
                ? {
                    dadosSuficientes: false,
                    anomalia: false,
                    motivo: "Não há equipamentos elegíveis para operação.",
                  }
                : detectarAnomalia(
                    historico
                      .filter((item) => item.elegiveis > 0)
                      .map((item) => item.disponibilidade),
                    atual.disponibilidade,
                    "queda",
                  ),
            semEquipamentosElegiveis: atual.elegiveis === 0,
          };
        }),
      );
      return resultado;
    },
    recomendacoes: (consulta) =>
      paginar(
        banco.recomendacao,
        consulta.regiaoId ? { regiaoId: consulta.regiaoId } : {},
        consulta,
      ),
    historico: (consulta) =>
      paginar(
        banco.previsao,
        consulta.regiaoId ? { regiaoId: consulta.regiaoId } : {},
        consulta,
      ),
    async registrarAnalises(agora = new Date()) {
      const regioes = await banco.regiao.findMany({
        where: { excluidoEm: null },
        select: { id: true },
      });
      const hora = new Date(Math.floor(+agora / 3_600_000) * 3_600_000);
      for (const regiao of regioes) {
        try {
          await banco.$transaction(
            async (transacao) => {
              if (
                await transacao.indicadorOperacional.findUnique({
                  where: {
                    regiaoId_criadoEm: { regiaoId: regiao.id, criadoEm: hora },
                  },
                })
              )
                return;
              const fotografia = await indicadores(regiao.id, transacao);
              const analise = await risco(regiao.id, 30, agora, transacao);
              await transacao.indicadorOperacional.create({
                data: { regiaoId: regiao.id, criadoEm: hora, ...fotografia },
              });
              const previsao = await transacao.previsao.create({
                data: {
                  regiaoId: regiao.id,
                  pontuacao: analise.pontuacao,
                  classificacao: analise.classificacao,
                  fatores: {
                    ...analise.fatores,
                    normalizados: analise.normalizados,
                    pesos: analise.pesos,
                    amostra: analise.amostra,
                  },
                  inicioPeriodo: analise.periodo.inicio,
                  fimPeriodo: analise.periodo.fim,
                },
              });
              const recomendacoes = [];
              if (
                analise.fatores.ocorrencias >= 10 &&
                analise.normalizados.faltaAgentes > 0.5
              )
                recomendacoes.push({
                  titulo: "Avaliar reforço operacional",
                  descricao: "Avalie a distribuição de agentes nesta região.",
                  prioridade: "ALTA",
                  justificativa: `${analise.fatores.ocorrencias} ocorrências em 30 dias e ${analise.fatores.agentesDisponiveis} agentes disponíveis.`,
                });
              if (analise.fatores.manutencoesUrgentes)
                recomendacoes.push({
                  titulo: "Priorizar manutenções urgentes",
                  descricao:
                    "Revisar a agenda de manutenção antes de ampliar a operação.",
                  prioridade: "ALTA",
                  justificativa: `${analise.fatores.manutencoesUrgentes} manutenções urgentes ou atrasadas.`,
                });
              if (analise.fatores.defeituosos)
                recomendacoes.push({
                  titulo: "Inspecionar equipamentos com defeito",
                  descricao:
                    "Avaliar reparo dos equipamentos em mau funcionamento.",
                  prioridade: "MEDIA",
                  justificativa: `${analise.fatores.defeituosos} equipamentos com defeito entre ${analise.fatores.totalEquipamentos} monitorados.`,
                });
              const falhas = await transacao.historicoSituacao.findMany({
                where: {
                  equipamento: { regiaoId: regiao.id, excluidoEm: null },
                  situacaoNova: "MAU_FUNCIONAMENTO",
                  criadoEm: { gte: new Date(+agora - 60 * diaMs), lt: agora },
                },
                select: {
                  criadoEm: true,
                  equipamento: { select: { bairro: true } },
                },
              });
              const bairros = new Map();
              for (const falha of falhas) {
                const bairro =
                  falha.equipamento.bairro ?? "Bairro não informado";
                const contagens = bairros.get(bairro) ?? {
                  atual: 0,
                  anterior: 0,
                };
                contagens[
                  falha.criadoEm >= analise.periodo.inicio
                    ? "atual"
                    : "anterior"
                ]++;
                bairros.set(bairro, contagens);
              }
              for (const [bairro, contagens] of bairros) {
                // Exigimos ao menos três falhas e duplicação da base, evitando reação a um caso isolado.
                if (
                  contagens.atual >= 3 &&
                  contagens.atual >= 2 * Math.max(1, contagens.anterior)
                )
                  recomendacoes.push({
                    titulo: "Investigar aumento de falhas no bairro",
                    descricao: `Avaliar equipamentos atualmente localizados em ${bairro}.`,
                    prioridade: "ALTA",
                    justificativa: `${contagens.atual} falhas nos últimos 30 dias contra ${contagens.anterior} nos 30 anteriores; bairro atual do equipamento.`,
                  });
              }
              const ocorrenciasRecentes = await transacao.ocorrencia.findMany({
                where: {
                  regiaoId: regiao.id,
                  ocorridoEm: { gte: analise.periodo.inicio, lt: agora },
                },
                select: { ocorridoEm: true },
              });
              const horas = Array(24).fill(0);
              const formatadorHora = new Intl.DateTimeFormat("pt-BR", {
                timeZone: ambiente.FUSO_ANALISE,
                hour: "numeric",
                hourCycle: "h23",
              });
              for (const ocorrencia of ocorrenciasRecentes)
                horas[Number(formatadorHora.format(ocorrencia.ocorridoEm))]++;
              const horaCritica = horas.indexOf(Math.max(...horas));
              if (
                ocorrenciasRecentes.length >= 10 &&
                horas[horaCritica] / ocorrenciasRecentes.length >= 0.2
              )
                recomendacoes.push({
                  titulo: "Avaliar atenção ao horário recorrente",
                  descricao: `Avaliar planejamento entre ${horaCritica}h e ${horaCritica + 1}h (${ambiente.FUSO_ANALISE}).`,
                  prioridade: "MEDIA",
                  justificativa: `${horas[horaCritica]} de ${ocorrenciasRecentes.length} ocorrências nos últimos 30 dias nessa faixa horária.`,
                });
              for (const recomendacao of recomendacoes)
                await transacao.recomendacao.create({
                  data: {
                    ...recomendacao,
                    regiaoId: regiao.id,
                    previsaoId: previsao.id,
                  },
                });
            },
            { isolationLevel: "Serializable", timeout: 30000 },
          );
        } catch (erro) {
          // Outra instância pode ter registrado a mesma hora; a chave única mantém uma fotografia.
          if (!["P2002", "P2034"].includes(erro.code)) throw erro;
        }
      }
    },
  };
}

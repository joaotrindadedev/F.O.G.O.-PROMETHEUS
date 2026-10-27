import { buscarAtivo } from "./cadastroService.js";
import { ErroAplicacao } from "../utils/erro.js";

export function criarIntegracaoServico(banco, publicar) {
  return {
    async telemetria(dados) {
      const resultado = await banco.$transaction(
        async (transacao) => {
          const existente = await transacao.telemetria.findUnique({
            where: { identificadorMensagem: dados.identificadorMensagem },
          });
          if (existente) {
            if (existente.equipamentoId !== dados.equipamentoId)
              throw new ErroAplicacao(
                "Identificador de mensagem já utilizado por outro equipamento.",
                409,
              );
            return { duplicada: true, telemetria: existente };
          }
          const equipamento = await buscarAtivo(
            transacao,
            "equipamento",
            dados.equipamentoId,
          );
          const telemetria = await transacao.telemetria.create({ data: dados });
          // Comunicação usa o horário de RECEBIMENTO do servidor. Pacotes antigos podem chegar atrasados.
          // Telemetria não altera a situação operacional: conectividade é um registro independente.
          await transacao.equipamento.update({
            where: { id: equipamento.id },
            data: { ultimaComunicacao: new Date(), semComunicacao: false },
          });
          const alertas = await transacao.alerta.findMany({
            where: { chaveAtiva: `SEM_COMUNICACAO:${equipamento.id}` },
          });
          await transacao.alerta.updateMany({
            where: { chaveAtiva: `SEM_COMUNICACAO:${equipamento.id}` },
            data: {
              situacao: "RESOLVIDO",
              resolvidoEm: new Date(),
              chaveAtiva: null,
            },
          });
          return { duplicada: false, telemetria, alertas };
        },
        { isolationLevel: "Serializable" },
      );
      if (!resultado.duplicada) {
        publicar("equipamento:comunicacao", {
          id: dados.equipamentoId,
          semComunicacao: false,
        });
        for (const alerta of resultado.alertas)
          publicar("alerta:atualizado", {
            id: alerta.id,
            situacao: "RESOLVIDO",
          });
      }
      return {
        duplicada: resultado.duplicada,
        telemetria: resultado.telemetria,
      };
    },
    async posicao(dados) {
      const agente = Boolean(dados.agenteId);
      const modelo = agente ? "agente" : "equipamento";
      const identificador = dados.agenteId ?? dados.equipamentoId;
      const resultado = await banco.$transaction(async (transacao) => {
        await buscarAtivo(transacao, modelo, identificador);
        const historico = await transacao.historicoPosicao.create({
          data: dados,
        });
        // Pacotes fora de ordem ficam no histórico, mas não fazem a posição atual voltar no tempo.
        const atualizacao = await transacao[modelo].updateMany({
          where: {
            id: identificador,
            OR: [
              { ultimaPosicaoEm: null },
              { ultimaPosicaoEm: { lt: dados.ocorridoEm } },
            ],
          },
          data: {
            latitude: dados.latitude,
            longitude: dados.longitude,
            ultimaPosicaoEm: dados.ocorridoEm,
          },
        });
        return { historico, atualizouPosicao: atualizacao.count > 0 };
      });
      if (resultado.atualizouPosicao)
        publicar(
          `${modelo}:posicao`,
          {
            id: identificador,
            latitude: dados.latitude,
            longitude: dados.longitude,
            ocorridoEm: dados.ocorridoEm,
          },
          agente,
        );
      return resultado;
    },
  };
}

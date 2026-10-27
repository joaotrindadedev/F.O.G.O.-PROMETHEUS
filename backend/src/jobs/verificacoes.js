import { situacoesInelegiveis } from "../utils/consulta.js";

export async function verificarComunicacao(
  banco,
  publicar,
  ambiente,
  agora = new Date(),
) {
  const limite = new Date(+agora - ambiente.SEM_COMUNICACAO_SEGUNDOS * 1000);
  const ativos = {
    excluidoEm: null,
    situacao: { notIn: situacoesInelegiveis },
  };
  const equipamentos = await banco.equipamento.findMany({
    where: {
      ...ativos,
      OR: [
        { ultimaComunicacao: { lt: limite } },
        { ultimaComunicacao: null, criadoEm: { lt: limite } },
      ],
    },
    select: { id: true },
  });
  for (const item of equipamentos) {
    try {
      const resultado = await banco.$transaction(
        async (transacao) => {
          const equipamento = await transacao.equipamento.findFirst({
            where: {
              ...ativos,
              id: item.id,
              OR: [
                { ultimaComunicacao: { lt: limite } },
                { ultimaComunicacao: null, criadoEm: { lt: limite } },
              ],
            },
          });
          if (!equipamento) return null;
          await transacao.equipamento.update({
            where: { id: item.id },
            data: { semComunicacao: true },
          });
          const chaveAtiva = `SEM_COMUNICACAO:${item.id}`;
          // Resolver manualmente não significa que o dispositivo voltou. Uma mesma
          // interrupção só gera um alerta; nova interrupção exige comunicação entre elas.
          if (equipamento.semComunicacao) return null;
          if (await transacao.alerta.findUnique({ where: { chaveAtiva } }))
            return null;
          const alerta = await transacao.alerta.create({
            data: {
              tipo: "SEM_COMUNICACAO",
              titulo: "Equipamento sem comunicação",
              descricao: "Intervalo de comunicação excedido.",
              origem: "VERIFICACAO_AUTOMATICA",
              gravidade: "ALTA",
              equipamentoId: item.id,
              regiaoId: equipamento.regiaoId,
              chaveAtiva,
            },
          });
          return { alerta, equipamento };
        },
        { isolationLevel: "Serializable" },
      );
      if (resultado) {
        publicar("alerta:criado", resultado.alerta);
        publicar("equipamento:comunicacao", {
          id: item.id,
          semComunicacao: true,
        });
      }
    } catch (erro) {
      if (!["P2002", "P2034"].includes(erro.code)) throw erro;
    }
  }
}

export function iniciarTarefas(banco, publicar, ambiente, previsoes) {
  let encerrando = false;
  let emExecucao = null;
  async function executar() {
    if (encerrando || emExecucao) return;
    // Não sobrepor ciclos: uma consulta lenta não pode criar uma fila crescente de verificações.
    emExecucao = (async () => {
      try {
        await verificarComunicacao(banco, publicar, ambiente);
        await previsoes.registrarAnalises();
      } catch (erro) {
        console.error(
          "Falha na verificação periódica:",
          erro.code || erro.name,
        );
      }
    })();
    await emExecucao;
    emExecucao = null;
  }
  const temporizador = setInterval(
    executar,
    ambiente.INTERVALO_TAREFAS_SEGUNDOS * 1000,
  );
  executar();
  return async () => {
    encerrando = true;
    clearInterval(temporizador);
    await emExecucao;
  };
}

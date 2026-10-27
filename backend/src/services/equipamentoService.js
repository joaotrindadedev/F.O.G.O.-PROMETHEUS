import { buscarAtivo, conferirReferencias } from "./cadastroService.js";
import { paginar, filtroEquipamentos } from "../utils/consulta.js";

export function criarEquipamentoServico(banco, publicar) {
  return {
    listar: (consulta) =>
      paginar(banco.equipamento, filtroEquipamentos(consulta), consulta, {
        tipo: true,
        orgao: true,
        regiao: true,
      }),
    buscar: (id) => buscarAtivo(banco, "equipamento", id),
    async historico(id, consulta) {
      await buscarAtivo(banco, "equipamento", id);
      return paginar(banco.historicoSituacao, { equipamentoId: id }, consulta);
    },
    async salvar(id, dados) {
      const salvo = await banco.$transaction(
        async (transacao) => {
          const anterior = id
            ? await buscarAtivo(transacao, "equipamento", id)
            : null;
          await conferirReferencias(transacao, dados);
          const { motivo, ...campos } = dados;
          const agora = new Date();
          const alteracoes = {
            ...campos,
            ...("latitude" in dados ? { ultimaPosicaoEm: agora } : {}),
          };
          const equipamento = id
            ? await transacao.equipamento.update({
                where: { id },
                data: alteracoes,
              })
            : await transacao.equipamento.create({ data: alteracoes });
          // A transação garante que situação e histórico sejam confirmados juntos.
          if (!anterior || anterior.situacao !== equipamento.situacao) {
            await transacao.historicoSituacao.create({
              data: {
                equipamentoId: equipamento.id,
                situacaoAnterior: anterior?.situacao,
                situacaoNova: equipamento.situacao,
                motivo:
                  motivo ||
                  (anterior ? "Situação atualizada." : "Cadastro inicial."),
              },
            });
          }
          if (dados.latitude != null)
            await transacao.historicoPosicao.create({
              data: {
                equipamentoId: equipamento.id,
                latitude: dados.latitude,
                longitude: dados.longitude,
                ocorridoEm: agora,
              },
            });
          return equipamento;
        },
        { isolationLevel: "Serializable" },
      );
      // Eventos só saem após o commit: o frontend nunca recebe uma alteração desfeita.
      publicar("equipamento:atualizado", salvo);
      return salvo;
    },
    async excluir(id) {
      await buscarAtivo(banco, "equipamento", id);
      await banco.equipamento.update({
        where: { id },
        data: { excluidoEm: new Date() },
      });
      publicar("equipamento:excluido", { id });
    },
  };
}

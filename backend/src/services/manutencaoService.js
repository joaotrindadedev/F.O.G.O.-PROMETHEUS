import { buscarAtivo } from "./cadastroService.js";
import { paginar, situacoesPendentes } from "../utils/consulta.js";
import { ErroAplicacao } from "../utils/erro.js";

export function avaliarPrazo(manutencao, agora = new Date(), horas = 48) {
  const pendente = situacoesPendentes.includes(manutencao.situacao);
  const diferenca = new Date(manutencao.dataPrevista) - agora;
  // Apenas serviços ainda abertos vencem. O limite exato pertence à janela próxima.
  return {
    atrasada: pendente && diferenca < 0,
    proximaDoVencimento:
      pendente && diferenca >= 0 && diferenca <= horas * 3_600_000,
  };
}

export function criarManutencaoServico(banco, publicar, ambiente) {
  return {
    async listar(consulta) {
      const filtro = {};
      for (const campo of ["equipamentoId", "situacao"])
        if (consulta[campo]) filtro[campo] = consulta[campo];
      if (consulta.prazo) {
        filtro.situacao = { in: situacoesPendentes };
        const agora = new Date();
        filtro.dataPrevista =
          consulta.prazo === "ATRASADA"
            ? { lt: agora }
            : {
                gte: agora,
                lte: new Date(
                  +agora + ambiente.MANUTENCAO_PROXIMA_HORAS * 3_600_000,
                ),
              };
      }
      const resultado = await paginar(banco.manutencao, filtro, consulta);
      resultado.dados = resultado.dados.map((item) => ({
        ...item,
        ...avaliarPrazo(item, new Date(), ambiente.MANUTENCAO_PROXIMA_HORAS),
      }));
      return resultado;
    },
    async buscar(id) {
      const registro = await banco.manutencao.findUnique({ where: { id } });
      if (!registro) throw new ErroAplicacao("Manutenção não encontrada.", 404);
      return {
        ...registro,
        ...avaliarPrazo(
          registro,
          new Date(),
          ambiente.MANUTENCAO_PROXIMA_HORAS,
        ),
      };
    },
    historico: (id, consulta) =>
      paginar(banco.historicoManutencao, { manutencaoId: id }, consulta),
    async salvar(id, dados) {
      const salvo = await banco.$transaction(
        async (transacao) => {
          const anterior = id
            ? await transacao.manutencao.findUnique({ where: { id } })
            : null;
          if (id && !anterior)
            throw new ErroAplicacao("Manutenção não encontrada.", 404);
          await buscarAtivo(
            transacao,
            "equipamento",
            dados.equipamentoId ?? anterior.equipamentoId,
          );
          const alteracoes = {
            ...dados,
            ...(dados.situacao
              ? {
                  dataConclusao:
                    dados.situacao === "CONCLUIDA"
                      ? (anterior?.dataConclusao ?? new Date())
                      : null,
                }
              : {}),
          };
          const manutencao = id
            ? await transacao.manutencao.update({
                where: { id },
                data: alteracoes,
              })
            : await transacao.manutencao.create({ data: alteracoes });
          await transacao.historicoManutencao.create({
            data: {
              manutencaoId: manutencao.id,
              dados: JSON.parse(
                JSON.stringify({ anterior, atual: manutencao }),
              ),
            },
          });
          // Concluir manutenção não torna o equipamento operacional automaticamente: exige avaliação humana.
          return manutencao;
        },
        { isolationLevel: "Serializable" },
      );
      publicar("manutencao:atualizada", salvo);
      return salvo;
    },
  };
}

import { ErroAplicacao } from "../utils/erro.js";
import { paginar, filtroAgentes } from "../utils/consulta.js";

export async function buscarAtivo(banco, modelo, identificador) {
  const registro = await banco[modelo].findFirst({
    where: { id: identificador, excluidoEm: null },
  });
  if (!registro) throw new ErroAplicacao("Registro não encontrado.", 404);
  return registro;
}

export async function conferirReferencias(banco, dados) {
  for (const [campo, modelo] of [
    ["orgaoId", "orgao"],
    ["regiaoId", "regiao"],
    ["tipoId", "tipoEquipamento"],
  ]) {
    if (dados[campo]) await buscarAtivo(banco, modelo, dados[campo]);
  }
}

export function criarCadastroServico(banco, publicar) {
  // Este pequeno serviço compartilha apenas operações idênticas dos três catálogos.
  const catalogos = {
    listar: (modelo, consulta) =>
      paginar(banco[modelo], { excluidoEm: null }, consulta),
    buscar: (modelo, id) => buscarAtivo(banco, modelo, id),
    criar: (modelo, dados) => banco[modelo].create({ data: dados }),
    async alterar(modelo, id, dados) {
      await buscarAtivo(banco, modelo, id);
      return banco[modelo].update({ where: { id }, data: dados });
    },
    async excluir(modelo, id) {
      await buscarAtivo(banco, modelo, id);
      const campo = {
        regiao: "regiaoId",
        orgao: "orgaoId",
        tipoEquipamento: "tipoId",
      }[modelo];
      const equipamentos = await banco.equipamento.count({
        where: { [campo]: id, excluidoEm: null },
      });
      const agentes =
        modelo === "tipoEquipamento"
          ? 0
          : await banco.agente.count({
              where: { [campo]: id, excluidoEm: null },
            });
      if (equipamentos || agentes)
        throw new ErroAplicacao(
          "Transfira os recursos ativos antes de excluir este cadastro.",
          409,
        );
      return banco[modelo].update({
        where: { id },
        data: { excluidoEm: new Date() },
      });
    },
  };
  const agentes = {
    listar: (consulta) =>
      paginar(banco.agente, filtroAgentes(consulta), consulta),
    buscar: (id) => buscarAtivo(banco, "agente", id),
    async salvar(id, dados) {
      const agente = await banco.$transaction(async (transacao) => {
        await conferirReferencias(transacao, dados);
        if (id) await buscarAtivo(transacao, "agente", id);
        const agora = new Date();
        const alteracoes = {
          ...dados,
          ...("latitude" in dados ? { ultimaPosicaoEm: agora } : {}),
        };
        const salvo = id
          ? await transacao.agente.update({ where: { id }, data: alteracoes })
          : await transacao.agente.create({ data: alteracoes });
        if (dados.latitude != null)
          await transacao.historicoPosicao.create({
            data: {
              agenteId: salvo.id,
              latitude: dados.latitude,
              longitude: dados.longitude,
              ocorridoEm: agora,
            },
          });
        return salvo;
      });
      publicar("agente:atualizado", agente, true);
      return agente;
    },
    async excluir(id) {
      await buscarAtivo(banco, "agente", id);
      await banco.agente.update({
        where: { id },
        data: { excluidoEm: new Date() },
      });
      publicar("agente:excluido", { id }, true);
    },
  };
  return { catalogos, agentes };
}

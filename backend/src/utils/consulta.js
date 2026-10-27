export async function paginar(modelo, filtro, consulta, incluir) {
  const { pagina, limite } = consulta;
  const [dados, total] = await Promise.all([
    modelo.findMany({
      where: filtro,
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { criadoEm: "desc" },
      ...(incluir ? { include: incluir } : {}),
    }),
    modelo.count({ where: filtro }),
  ]);
  return {
    dados,
    paginacao: { pagina, limite, total, paginas: Math.ceil(total / limite) },
  };
}

export const situacoesPendentes = ["PENDENTE", "EM_ANDAMENTO"];
export const situacoesInelegiveis = ["NAO_INSTALADO", "DESATIVADO"];

export function filtroEquipamentos(consulta) {
  const filtro = { excluidoEm: null };
  for (const campo of [
    "tipoId",
    "situacao",
    "bairro",
    "regiaoId",
    "cidade",
    "orgaoId",
  ]) {
    if (consulta[campo] !== undefined) filtro[campo] = consulta[campo];
  }
  if (consulta.necessitaManutencao !== undefined) {
    filtro.manutencoes = {
      [consulta.necessitaManutencao ? "some" : "none"]: {
        situacao: { in: situacoesPendentes },
      },
    };
  }
  return filtro;
}

export function filtroAgentes(consulta) {
  const filtro = { excluidoEm: null };
  for (const campo of ["situacao", "bairro", "cidade", "regiaoId", "orgaoId"]) {
    if (consulta[campo] !== undefined) filtro[campo] = consulta[campo];
  }
  return filtro;
}

export function filtroArea(consulta) {
  if (consulta.sul === undefined)
    return { latitude: { not: null }, longitude: { not: null } };
  return {
    latitude: { gte: consulta.sul, lte: consulta.norte },
    longitude: { gte: consulta.oeste, lte: consulta.leste },
  };
}

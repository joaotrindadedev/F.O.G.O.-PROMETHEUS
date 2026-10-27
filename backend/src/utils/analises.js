const pesosGravidade = { BAIXA: 1, MEDIA: 2, ALTA: 3, CRITICA: 4 };
export const pesosRisco = {
  ocorrencias: 25,
  defeitos: 15,
  alertas: 15,
  manutencoes: 10,
  indisponibilidade: 15,
  faltaAgentes: 10,
  recorrencia: 10,
};
const limitar = (valor) => Math.max(0, Math.min(1, valor));

export function calcularRisco(fatores, limites = [25, 50, 75]) {
  const {
    totalEquipamentos,
    elegiveis,
    operacionais,
    defeituosos,
    alertasCriticos,
    manutencoesUrgentes,
    agentesDisponiveis,
    ocorrencias,
    ocorrenciasAnteriores,
    dias,
  } = fatores;
  let ocorrenciasPonderadas = 0;
  for (const ocorrencia of ocorrencias) {
    ocorrenciasPonderadas += pesosGravidade[ocorrencia.gravidade];
  }
  // Cada fator é limitado a 0..1. Ocorrências são normalizadas por dia e pela raiz da
  // quantidade de recursos: regiões com mais sensores não são penalizadas linearmente.
  // Os denominadores mínimos evitam divisão por zero em regiões ainda pouco monitoradas.
  const recursos = Math.max(totalEquipamentos, 1);
  const normalizados = {
    ocorrencias: limitar(ocorrenciasPonderadas / (dias * Math.sqrt(recursos))),
    defeitos: limitar(defeituosos / Math.max(elegiveis, 1)),
    alertas: limitar(alertasCriticos / recursos),
    manutencoes: limitar(manutencoesUrgentes / recursos),
    indisponibilidade: elegiveis
      ? limitar((elegiveis - operacionais) / elegiveis)
      : 0,
    faltaAgentes: ocorrencias.length
      ? limitar(1 - agentesDisponiveis / Math.max(1, ocorrencias.length / dias))
      : 0,
    recorrencia: limitar(ocorrenciasAnteriores / (dias * Math.sqrt(recursos))),
  };
  let soma = 0;
  for (const nome of Object.keys(pesosRisco)) {
    soma += normalizados[nome] * pesosRisco[nome];
  }
  const pontuacao = Math.round(soma);
  let classificacao = "CRITICO";
  if (pontuacao < limites[0]) classificacao = "BAIXO";
  else if (pontuacao < limites[1]) classificacao = "MODERADO";
  else if (pontuacao < limites[2]) classificacao = "ALTO";
  return {
    pontuacao,
    classificacao,
    normalizados,
    pesos: pesosRisco,
    amostra: {
      ocorrencias: ocorrencias.length,
      recursos: totalEquipamentos,
      suficiente: ocorrencias.length >= 10 && totalEquipamentos >= 5,
    },
    aviso:
      "Estimativa operacional baseada em regras; não é probabilidade de crimes ou acidentes.",
  };
}

export function detectarAnomalia(valores, atual, direcao = "aumento") {
  if (valores.length < 7)
    return {
      dadosSuficientes: false,
      amostras: valores.length,
      minimo: 7,
      anomalia: false,
    };
  let soma = 0;
  for (const valor of valores) soma += valor;
  const media = soma / valores.length;
  let somaDiferencas = 0;
  for (const valor of valores) somaDiferencas += (valor - media) ** 2;
  const desvio = Math.sqrt(somaDiferencas / valores.length);
  // Três desvios padrão reduzem alertas de pequenas oscilações. O piso evita alertar
  // por qualquer diferença quando a série histórica tem desvio zero.
  const margem = Math.max(3 * desvio, direcao === "queda" ? 10 : 2);
  const diferenca = direcao === "queda" ? media - atual : atual - media;
  return {
    dadosSuficientes: true,
    amostras: valores.length,
    media,
    desvioPadrao: desvio,
    margem,
    atual,
    anomalia: diferenca > margem,
  };
}

export function calcularTendencia(anterior, atual) {
  const diferenca = atual - anterior;
  let variacaoPercentual = null;
  let interpretacao = "ESTAVEL";
  if (anterior === 0) {
    interpretacao = "Sem base anterior para calcular porcentagem.";
  } else {
    variacaoPercentual = Math.round((diferenca / anterior) * 10000) / 100;
    if (atual > anterior) interpretacao = "AUMENTO";
    else if (atual < anterior) interpretacao = "REDUCAO";
  }
  return { anterior, atual, diferenca, variacaoPercentual, interpretacao };
}

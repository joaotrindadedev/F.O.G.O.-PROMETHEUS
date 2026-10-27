export const rotulos = {
  OPERACIONAL: 'Operacional',
  NAO_INSTALADO: 'Não instalado',
  MAU_FUNCIONAMENTO: 'Mau funcionamento',
  EM_MANUTENCAO: 'Em manutenção',
  DESATIVADO: 'Desativado',
  FURTADO: 'Furtado',
  EM_ATIVIDADE: 'Em atividade',
  DISPONIVEL: 'Disponível',
  AFASTADO: 'Afastado',
  FORA_DE_SERVICO: 'Fora de serviço',
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
  ABERTO: 'Aberto',
  RECONHECIDO: 'Reconhecido',
  RESOLVIDO: 'Resolvido',
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
  BAIXO: 'Baixo',
  MODERADO: 'Moderado',
  ALTO: 'Alto',
  CRITICO: 'Crítico',
  ADMINISTRADOR: 'Administrador',
  GESTOR: 'Gestor',
  OPERADOR: 'Operador',
  VISUALIZADOR: 'Visualizador',
  FIXO: 'Fixo',
  MOVEL: 'Móvel',
  IMEDIATA: 'Imediata',
  AGENDADA: 'Agendada',
  PERIODICA: 'Periódica',
  VELOCIDADE: 'Velocidade',
  SEMAFORO: 'Semáforo',
  RETORNO: 'Retorno',
  CONVERSAO_PROIBIDA: 'Conversão proibida',
  limiteVelocidade: 'Limite de velocidade (km/h)',
  tipoFiscalizacao: 'Tipo de fiscalização',
  visaoNoturna: 'Visão noturna',
  capturaColorida: 'Captura colorida',
  resolucao: 'Resolução',
  placa: 'Placa',
  tipoVeiculo: 'Tipo de veículo',
  identificacaoOperacional: 'Identificação operacional',
};
export const rotulo = (valor) =>
  rotulos[valor] ?? (valor === '' || valor == null ? 'Não informado' : valor);
export const dataHora = (valor) =>
  valor && !Number.isNaN(new Date(valor).getTime())
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo',
      }).format(new Date(valor))
    : 'Sem registro';
export const coordenadasValidas = (item) =>
  typeof item.latitude === 'number' &&
  typeof item.longitude === 'number' &&
  Number.isFinite(item.latitude) &&
  Number.isFinite(item.longitude) &&
  Math.abs(item.latitude) <= 90 &&
  Math.abs(item.longitude) <= 180;
export const normalizar = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export function filtrar(dados, busca, filtros) {
  return dados.filter(
    (item) =>
      Object.entries(filtros).every(([chave, valor]) => !valor || String(item[chave]) === valor) &&
      normalizar(
        [
          item.nome,
          item.descricao,
          item.numeroSerie,
          item.marca,
          item.modelo,
          item.matricula,
          item.funcao,
          item.titulo,
          item.categoria,
        ].join(' '),
      ).includes(normalizar(busca)),
  );
}

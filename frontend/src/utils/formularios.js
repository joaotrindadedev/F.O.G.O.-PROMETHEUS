export const situacoesEquipamento = [
  'NAO_INSTALADO',
  'OPERACIONAL',
  'MAU_FUNCIONAMENTO',
  'EM_MANUTENCAO',
  'DESATIVADO',
  'FURTADO',
];
export const situacoesAgente = ['EM_ATIVIDADE', 'DISPONIVEL', 'AFASTADO', 'FORA_DE_SERVICO'];
export const prioridades = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
const campo = (nome, titulo, extra = {}) => ({ nome, titulo, ...extra });
const area = [
  campo('regiaoId', 'Região', { catalogo: 'regioes' }),
  campo('bairro', 'Bairro'),
  campo('cidade', 'Cidade', { obrigatorio: true }),
];
const coordenadas = [
  campo('latitude', 'Latitude', { tipo: 'number', min: -90, max: 90 }),
  campo('longitude', 'Longitude', { tipo: 'number', min: -180, max: 180 }),
];
export const formularios = {
  equipamentos: [
    campo('tipoId', 'Tipo de equipamento', { catalogo: 'tipos', obrigatorio: true }),
    campo('orgaoId', 'Órgão responsável', { catalogo: 'orgaos', obrigatorio: true }),
    campo('numeroSerie', 'Número de série'),
    campo('marca', 'Marca', { obrigatorio: true }),
    campo('modelo', 'Modelo', { obrigatorio: true }),
    campo('descricao', 'Descrição', { obrigatorio: true }),
    campo('mobilidade', 'Mobilidade', { opcoes: ['FIXO', 'MOVEL'], obrigatorio: true }),
    campo('situacao', 'Situação operacional', { opcoes: situacoesEquipamento, obrigatorio: true }),
    campo('cep', 'CEP', { padrao: '[0-9]{5}-?[0-9]{3}' }),
    campo('rua', 'Endereço'),
    ...area,
    campo('estado', 'UF', { obrigatorio: true, padrao: '[A-Z]{2}', maxLength: 2 }),
    campo('referencia', 'Referência'),
    ...coordenadas,
    campo('baseOperacional', 'Base operacional'),
    campo('baseLatitude', 'Latitude da base', { tipo: 'number', min: -90, max: 90 }),
    campo('baseLongitude', 'Longitude da base', { tipo: 'number', min: -180, max: 180 }),
  ],
  agentes: [
    campo('nome', 'Nome', { obrigatorio: true }),
    campo('matricula', 'Matrícula', { obrigatorio: true }),
    campo('funcao', 'Função', { obrigatorio: true }),
    campo('orgaoId', 'Órgão', { catalogo: 'orgaos', obrigatorio: true }),
    campo('baseOperacional', 'Base operacional', { obrigatorio: true }),
    campo('situacao', 'Situação', { opcoes: situacoesAgente, obrigatorio: true }),
    ...area,
    ...coordenadas,
  ],
  manutencoes: [
    campo('equipamentoId', 'Equipamento', { catalogo: 'equipamentos', obrigatorio: true }),
    campo('tipo', 'Tipo', { opcoes: ['IMEDIATA', 'AGENDADA', 'PERIODICA'], obrigatorio: true }),
    campo('descricao', 'Descrição do serviço', { obrigatorio: true }),
    campo('prioridade', 'Prioridade', { opcoes: prioridades, obrigatorio: true }),
    campo('situacao', 'Situação', {
      opcoes: ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'],
      obrigatorio: true,
    }),
    campo('dataPrevista', 'Data prevista', { tipo: 'datetime-local', obrigatorio: true }),
    campo('observacoes', 'Observações'),
  ],
  ocorrencias: [
    campo('categoria', 'Categoria', { obrigatorio: true }),
    campo('descricao', 'Descrição', { obrigatorio: true }),
    campo('gravidade', 'Gravidade', { opcoes: prioridades, obrigatorio: true }),
    campo('regiaoId', 'Região', { catalogo: 'regioes', obrigatorio: true }),
    campo('bairro', 'Bairro'),
    campo('ocorridoEm', 'Data e horário', { tipo: 'datetime-local', obrigatorio: true }),
    campo('origem', 'Origem', { obrigatorio: true }),
    ...coordenadas,
  ],
};
export function camposPropriedades(familia) {
  if (familia === 'CAMERA') {
    return [
      campo('resolucao', 'Resolução'),
      campo('visaoNoturna', 'Visão noturna', { tipo: 'checkbox' }),
      campo('capturaColorida', 'Captura colorida', { tipo: 'checkbox' }),
    ];
  }
  if (familia === 'RADAR') {
    return [
      campo('tipoFiscalizacao', 'Tipo de fiscalização', {
        opcoes: ['VELOCIDADE', 'SEMAFORO', 'RETORNO', 'CONVERSAO_PROIBIDA'],
      }),
      campo('limiteVelocidade', 'Limite de velocidade (km/h)', {
        tipo: 'number',
        min: 1,
        max: 200,
      }),
    ];
  }
  if (familia === 'VEICULO') {
    return [
      campo('identificacaoOperacional', 'Identificação operacional'),
      campo('placa', 'Placa'),
      campo('tipoVeiculo', 'Tipo de veículo'),
    ];
  }
  return [];
}
export function prepararDados(recurso, valores, anterior, catalogos) {
  const dados = {};
  const erros = {};
  for (const campo of formularios[recurso]) {
    if (anterior?.id && recurso === 'manutencoes' && campo.nome === 'equipamentoId') continue;
    const valor = valores[campo.nome];
    if (campo.obrigatorio && !String(valor ?? '').trim())
      erros[campo.nome] = 'Preencha este campo.';
    if (valor !== '' && valor != null) {
      if (campo.padrao && !new RegExp(`^(?:${campo.padrao})$`).test(String(valor).trim()))
        erros[campo.nome] = 'Formato inválido. Confira os caracteres informados.';
      if (campo.tipo === 'datetime-local' && Number.isNaN(new Date(valor).getTime())) {
        erros[campo.nome] = 'Informe uma data e horário válidos.';
        continue;
      }
      dados[campo.nome] =
        campo.tipo === 'number'
          ? Number(valor)
          : campo.tipo === 'datetime-local'
            ? new Date(valor).toISOString()
            : String(valor).trim();
      if (
        campo.tipo === 'number' &&
        (!Number.isFinite(dados[campo.nome]) ||
          dados[campo.nome] < campo.min ||
          dados[campo.nome] > campo.max)
      )
        erros[campo.nome] = 'Coordenada fora do intervalo permitido.';
    } else if (anterior?.[campo.nome] != null) dados[campo.nome] = null;
  }
  for (const [lat, lon] of [
    ['latitude', 'longitude'],
    ['baseLatitude', 'baseLongitude'],
  ]) {
    if (
      (valores[lat] !== '' && valores[lat] != null) !==
      (valores[lon] !== '' && valores[lon] != null)
    ) {
      erros[lat] = 'Informe as duas coordenadas.';
    }
    if (lat in dados || lon in dados) {
      dados[lat] ??= null;
      dados[lon] ??= null;
    }
  }
  // Não reenviamos coordenadas inalteradas: o backend renovaria o horário da última posição.
  if (anterior?.id)
    for (const [lat, lon] of [
      ['latitude', 'longitude'],
      ['baseLatitude', 'baseLongitude'],
    ])
      if (dados[lat] === anterior[lat] && dados[lon] === anterior[lon]) {
        delete dados[lat];
        delete dados[lon];
      }
  if (recurso === 'equipamentos') {
    const familia = catalogos.tipos.find((t) => t.id === valores.tipoId)?.familia;
    dados.propriedades = { ...valores.propriedades };
    for (const campo of camposPropriedades(familia)) {
      const valor = valores.propriedades?.[campo.nome];
      if (valor && campo.padrao && !new RegExp(`^(?:${campo.padrao})$`).test(String(valor)))
        erros['propriedades.' + campo.nome] =
          'Formato inválido. Informe a placa sem hífen e em maiúsculas.';
      if (
        campo.tipo === 'number' &&
        valor != null &&
        valor !== '' &&
        (!Number.isFinite(Number(valor)) || Number(valor) < campo.min || Number(valor) > campo.max)
      )
        erros['propriedades.' + campo.nome] = `Informe um valor entre ${campo.min} e ${campo.max}.`;
      if (campo.obrigatorio && !String(valor ?? '').trim())
        erros['propriedades.' + campo.nome] = 'Preencha este campo.';
      if (campo.tipo === 'checkbox') dados.propriedades[campo.nome] = Boolean(valor);
      else if (valor !== '' && valor != null)
        dados.propriedades[campo.nome] =
          campo.tipo === 'number' ? Number(valor) : String(valor).trim();
    }
    if (familia === 'OUTRO') {
      try {
        dados.propriedades = JSON.parse(valores.propriedadesTexto ?? '{}');
        if (
          !dados.propriedades ||
          Array.isArray(dados.propriedades) ||
          typeof dados.propriedades !== 'object' ||
          Object.entries(dados.propriedades).some(
            ([k, v]) =>
              !k ||
              k.length > 80 ||
              (v !== null && !['string', 'number', 'boolean'].includes(typeof v)) ||
              (typeof v === 'string' && v.length > 500),
          )
        )
          throw Error();
      } catch {
        erros.propriedadesTexto =
          'Preencha nomes únicos para todas as características e confira os valores.';
      }
    }
    if (valores.motivo?.trim()) dados.motivo = valores.motivo.trim();
  }
  if (recurso === 'ocorrencias' && new Date(dados.ocorridoEm) > new Date())
    erros.ocorridoEm = 'A ocorrência não pode estar no futuro.';
  return { dados, erros };
}

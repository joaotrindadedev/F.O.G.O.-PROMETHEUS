import 'dotenv/config';
import bcrypt from 'bcrypt';
import { banco } from '../src/config/prisma.js';
import { criarPrevisaoServico } from '../src/services/previsaoService.js';
import { lerAmbiente } from '../src/config/ambiente.js';

const agora = new Date();
const diasAtras = (dias) => new Date(+agora - dias * 86_400_000);
// Identificadores determinísticos tornam o seed repetível sem apagar registros do usuário.
const identificador = (grupo, numero) => `${String(grupo).padStart(8, '0')}-0000-4000-8000-${String(numero).padStart(12, '0')}`;
async function inserir(modelo, id, dados) {
  return banco[modelo].upsert({ where: { id }, update: {}, create: { id, ...dados } });
}

try {
  if (process.env.NODE_ENV === 'production') throw new Error('Seed demonstrativo bloqueado em produção.');
  const ambiente = lerAmbiente();
  const senha = process.env.SEED_SENHA;
  if (!senha || Buffer.byteLength(senha) > 72 || senha.startsWith('defina_')) throw new Error('Defina SEED_SENHA com 1 a 72 bytes.');
  const email = process.env.SEED_EMAIL?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+$/.test(email)) throw new Error('Defina um SEED_EMAIL válido.');
  await banco.usuario.upsert({ where: { email }, update: {}, create: {
    nome: 'Administrador demonstrativo', email, senhaHash: await bcrypt.hash(senha, 12), perfil: 'ADMINISTRADOR',
  } });
  const orgaos = [];
  for (const [indice, nome] of ['Secretaria Demonstrativa de Mobilidade', 'Guarda Municipal Demonstrativa', 'Polícia Militar Demonstrativa'].entries()) {
    orgaos.push(await inserir('orgao', identificador(1, indice), { nome, sigla: ['SDM', 'GMD', 'PMD'][indice] }));
  }
  const regioes = [];
  for (const [indice, nome] of ['Centro demonstrativo', 'Norte demonstrativo', 'Sul demonstrativo'].entries()) {
    regioes.push(await inserir('regiao', identificador(2, indice), { nome, cidade: 'Cidade Demonstrativa', estado: 'SP', bairros: [`Bairro ${indice + 1} demonstrativo`] }));
  }
  const categorias = [
    ['Câmera de videomonitoramento', 'CAMERA'], ['Radar de velocidade', 'RADAR'], ['Radar de semáforo', 'RADAR'],
    ['Radar de retorno', 'RADAR'], ['Radar de conversão proibida', 'RADAR'], ['Balança de caminhões', 'OUTRO'],
    ['Veículo de estacionamento rotativo', 'VEICULO'], ['Cancela automatizada', 'OUTRO'], ['Táxi', 'VEICULO'],
    ['Mototáxi', 'VEICULO'], ['Veículo escolar', 'VEICULO'], ['Totem de autoatendimento', 'OUTRO'], ['Patinete compartilhado', 'OUTRO'],
    ['Motocicleta de agente', 'VEICULO'], ['Viatura da Guarda Municipal', 'VEICULO'], ['Viatura da Polícia Militar', 'VEICULO'], ['Outros', 'OUTRO'],
  ];
  const tipos = [];
  for (const [indice, [nome, familia]] of categorias.entries()) tipos.push(await inserir('tipoEquipamento', identificador(3, indice), { nome, familia }));
  const equipamentos = [];
  for (let indice = 0; indice < 36; indice++) {
    const tipo = tipos[indice % tipos.length];
    const regiao = regioes[indice % 3];
    const situacao = ['OPERACIONAL', 'OPERACIONAL', 'MAU_FUNCIONAMENTO', 'EM_MANUTENCAO', 'NAO_INSTALADO', 'FURTADO'][indice % 6];
    const propriedades = tipo.familia === 'CAMERA' ? { visaoNoturna: true, resolucao: '1920x1080', capturaColorida: true }
      : tipo.familia === 'RADAR' ? { tipoFiscalizacao: ['VELOCIDADE', 'SEMAFORO', 'RETORNO', 'CONVERSAO_PROIBIDA'][Math.max(0, indice % tipos.length - 1)], limiteVelocidade: 50 }
      : tipo.familia === 'VEICULO' ? { identificacaoOperacional: `DEMO-${indice}`, placa: `ABC1D${String(indice).padStart(2, '0')}`, tipoVeiculo: tipo.nome }
      : { demonstrativo: true };
    const equipamento = await inserir('equipamento', identificador(4, indice), {
      tipoId: tipo.id, orgaoId: orgaos[indice % 3].id, regiaoId: regiao.id, numeroSerie: `DEMONSTRACAO-${indice}`,
      marca: 'Marca fictícia', modelo: 'Modelo demonstrativo', descricao: 'Equipamento fictício para estudo.', situacao,
      mobilidade: tipo.familia === 'VEICULO' ? 'MOVEL' : 'FIXO', cidade: regiao.cidade, estado: 'SP', bairro: regiao.bairros[0],
      rua: 'Rua demonstrativa', cep: '01000-000', latitude: -23.55 + indice * 0.001, longitude: -46.63 + indice * 0.001,
      baseOperacional: 'Base demonstrativa', propriedades, criadoEm: diasAtras(70), ultimaComunicacao: indice % 4 ? agora : diasAtras(1), ultimaPosicaoEm: agora,
    });
    equipamentos.push(equipamento);
    await inserir('historicoSituacao', identificador(5, indice), { equipamentoId: equipamento.id, situacaoNova: situacao, motivo: 'Cadastro demonstrativo.', criadoEm: diasAtras(70) });
    await inserir('historicoPosicao', identificador(6, indice), { equipamentoId: equipamento.id, latitude: equipamento.latitude, longitude: equipamento.longitude, ocorridoEm: agora });
    if (['MAU_FUNCIONAMENTO', 'EM_MANUTENCAO'].includes(situacao)) {
      const manutencao = await inserir('manutencao', identificador(7, indice), { equipamentoId: equipamento.id, tipo: 'AGENDADA', descricao: 'Inspeção demonstrativa.', prioridade: indice % 2 ? 'ALTA' : 'CRITICA', dataPrevista: diasAtras(indice % 2 ? -1 : 2) });
      await inserir('historicoManutencao', identificador(8, indice), { manutencaoId: manutencao.id, dados: { motivo: 'Cadastro demonstrativo', situacao: 'PENDENTE' } });
    }
  }
  for (let indice = 0; indice < 9; indice++) {
    const regiao = regioes[indice % 3];
    const agente = await inserir('agente', identificador(9, indice), { nome: `Profissional fictício ${indice + 1}`, matricula: `DEMO-${indice}`, funcao: ['Agente de trânsito', 'Guarda municipal', 'Policial'][indice % 3],
      orgaoId: orgaos[indice % 3].id, regiaoId: regiao.id, baseOperacional: 'Base demonstrativa', bairro: regiao.bairros[0], cidade: regiao.cidade,
      situacao: indice % 3 ? 'EM_ATIVIDADE' : 'FORA_DE_SERVICO', latitude: -23.55 + indice * 0.002, longitude: -46.63, ultimaPosicaoEm: agora });
    await inserir('historicoPosicao', identificador(10, indice), { agenteId: agente.id, latitude: agente.latitude, longitude: agente.longitude, ocorridoEm: agora });
  }
  for (let indice = 0; indice < 240; indice++) {
    const regiao = regioes[indice % 3];
    await inserir('ocorrencia', identificador(11, indice), { regiaoId: regiao.id, bairro: regiao.bairros[0], categoria: ['TRÂNSITO', 'OBSTRUÇÃO', 'FALHA_OPERACIONAL'][indice % 3],
      descricao: 'Ocorrência fictícia para demonstração estatística.', gravidade: ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'][indice % 4],
      ocorridoEm: new Date(+diasAtras(1 + indice % 60) + (indice % 12) * 3_600_000), origem: 'SEED_DEMONSTRATIVO', latitude: -23.55, longitude: -46.63 });
  }
  for (let indice = 0; indice < 6; indice++) await inserir('alerta', identificador(12, indice), { tipo: 'FALHA_DEMONSTRATIVA', titulo: 'Alerta fictício', descricao: 'Registro para estudo da central.', origem: 'SEED_DEMONSTRATIVO', gravidade: indice % 2 ? 'ALTA' : 'CRITICA', equipamentoId: equipamentos[indice].id, regiaoId: equipamentos[indice].regiaoId, chaveAtiva: `DEMO:${indice}` });
  // O seed não fabrica fotografias operacionais passadas. As anomalias começam com
  // dados insuficientes e passam a funcionar após sete coletas horárias reais.
  await criarPrevisaoServico(banco, ambiente).registrarAnalises();
  console.log('Dados fictícios carregados. A senha demonstrativa está no .env.');
} finally { await banco.$disconnect(); }

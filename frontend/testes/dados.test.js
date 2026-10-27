import test from 'node:test';
import assert from 'node:assert/strict';
import { coordenadasValidas, filtrar } from '../src/utils/dados.js';
import { prepararDados } from '../src/utils/formularios.js';
const catalogos = {
  tipos: [
    { id: 'camera', familia: 'CAMERA' },
    { id: 'radar', familia: 'RADAR' },
  ],
};
const base = {
  tipoId: 'camera',
  orgaoId: 'orgao',
  marca: 'Marca',
  modelo: 'Modelo',
  descricao: 'Câmera',
  cidade: 'Cidade',
  estado: 'SP',
  mobilidade: 'FIXO',
  situacao: 'OPERACIONAL',
  latitude: '-23.5',
  longitude: '-46.6',
  propriedades: { resolucao: '1920x1080', visaoNoturna: true, capturaColorida: true },
};
test('coordenadas não tratam null ou texto como zero', () => {
  for (const p of [
    { latitude: null, longitude: null },
    { latitude: '0', longitude: '0' },
    { latitude: 91, longitude: 0 },
    { latitude: 0, longitude: Infinity },
  ])
    assert.equal(coordenadasValidas(p), false);
  assert.equal(coordenadasValidas({ latitude: 0, longitude: 0 }), true);
});
test('busca ignora acentos e combina filtros', () => {
  assert.equal(
    filtrar(
      [
        { nome: 'Câmera Centro', orgaoId: '1' },
        { nome: 'Câmera Norte', orgaoId: '2' },
      ],
      'camera',
      { orgaoId: '1' },
    ).length,
    1,
  );
});
test('não renova posição ao editar sem mover equipamento', () => {
  const anterior = { ...base, id: 'id', latitude: -23.5, longitude: -46.6 };
  const { dados, erros } = prepararDados('equipamentos', base, anterior, catalogos);
  assert.deepEqual(erros, {});
  assert.equal('latitude' in dados, false);
  assert.equal('longitude' in dados, false);
});
test('mudança de situação dispensa motivo', () => {
  assert.equal(
    prepararDados(
      'equipamentos',
      { ...base, situacao: 'DESATIVADO' },
      { ...base, id: 'id' },
      catalogos,
    ).erros.motivo,
    undefined,
  );
});
test('coordenadas são opcionais, mas devem formar um par quando preenchidas', () => {
  assert.equal(
    prepararDados('equipamentos', { ...base, latitude: '', longitude: '' }, null, catalogos).erros
      .latitude,
    undefined,
  );
  assert.ok(
    prepararDados('equipamentos', { ...base, longitude: '' }, null, catalogos).erros.latitude,
  );
});
test('limite de velocidade informado deve ser válido', () => {
  assert.ok(
    prepararDados(
      'equipamentos',
      {
        ...base,
        tipoId: 'radar',
        propriedades: { tipoFiscalizacao: 'VELOCIDADE', limiteVelocidade: 201 },
      },
      null,
      catalogos,
    ).erros['propriedades.limiteVelocidade'],
  );
});

test('características são opcionais e campos extras existentes são preservados', () => {
  const radar = prepararDados(
    'equipamentos',
    { ...base, tipoId: 'radar', propriedades: {} },
    null,
    catalogos,
  );
  assert.deepEqual(radar.erros, {});
  const camera = prepararDados(
    'equipamentos',
    { ...base, propriedades: { observacao: 'Lente nova' } },
    null,
    catalogos,
  );
  assert.deepEqual(camera.erros, {});
  assert.equal(camera.dados.propriedades.observacao, 'Lente nova');
});
test('editar manutenção não envia equipamentoId imutável', () => {
  const { dados } = prepararDados(
    'manutencoes',
    {
      equipamentoId: 'id',
      tipo: 'AGENDADA',
      descricao: 'Revisão',
      prioridade: 'ALTA',
      situacao: 'PENDENTE',
      dataPrevista: '2026-10-25T10:00',
    },
    { id: 'id' },
    catalogos,
  );
  assert.equal('equipamentoId' in dados, false);
  assert.ok(dados.dataPrevista.endsWith('Z'));
});
test('ocorrência futura é rejeitada antes do envio', () => {
  const { erros } = prepararDados(
    'ocorrencias',
    {
      categoria: 'Teste',
      descricao: 'Teste',
      gravidade: 'BAIXA',
      regiaoId: 'id',
      origem: 'Teste',
      ocorridoEm: '2099-01-01T10:00',
    },
    null,
    catalogos,
  );
  assert.ok(erros.ocorridoEm);
});
test('data inválida retorna erro sem interromper o formulário', () => {
  const { erros } = prepararDados('ocorrencias', { ocorridoEm: 'data inválida' }, null, catalogos);
  assert.ok(erros.ocorridoEm);
});
test('CEP e UF inválidos são barrados no cliente', () => {
  const { erros } = prepararDados(
    'equipamentos',
    { ...base, cep: '123', estado: 'sp' },
    null,
    catalogos,
  );
  assert.ok(erros.cep);
  assert.ok(erros.estado);
});

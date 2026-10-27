import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularRisco, detectarAnomalia, calcularTendencia } from '../src/utils/analises.js';
import { avaliarPrazo } from '../src/services/manutencaoService.js';

const fatores = { totalEquipamentos: 10, elegiveis: 10, operacionais: 10, defeituosos: 0, alertasCriticos: 0, manutencoesUrgentes: 0, agentesDisponiveis: 10, ocorrencias: [], ocorrenciasAnteriores: 0, dias: 30 };
test('risco sem problemas é zero e informa amostra insuficiente', () => {
  const resultado = calcularRisco(fatores);
  assert.equal(resultado.pontuacao, 0);
  assert.equal(resultado.classificacao, 'BAIXO');
  assert.equal(resultado.amostra.suficiente, false);
});
test('risco satura em 100 sem exceder os limites', () => {
  const resultado = calcularRisco({ ...fatores, operacionais: 0, defeituosos: 100, alertasCriticos: 100, manutencoesUrgentes: 100, agentesDisponiveis: 0, ocorrencias: Array(1000).fill({ gravidade: 'CRITICA' }), ocorrenciasAnteriores: 1000 });
  assert.equal(resultado.pontuacao, 100);
  assert.equal(resultado.classificacao, 'CRITICO');
});
test('risco não divide por zero e respeita limites configurados', () => {
  assert.equal(calcularRisco({ ...fatores, totalEquipamentos: 0, elegiveis: 0, operacionais: 0 }).pontuacao, 0);
  assert.equal(calcularRisco({ ...fatores, operacionais: 0 }, [10, 20, 30]).classificacao, 'MODERADO');
});
test('anomalia exige histórico e detecta aumento e queda relevantes', () => {
  assert.equal(detectarAnomalia([1, 2], 100).dadosSuficientes, false);
  assert.equal(detectarAnomalia(Array(7).fill(1), 10).anomalia, true);
  assert.equal(detectarAnomalia(Array(7).fill(1), 2).anomalia, false);
  assert.equal(detectarAnomalia(Array(7).fill(90), 50, 'queda').anomalia, true);
});
test('tendência distingue ausência de base de aumento de 100%', () => {
  assert.equal(calcularTendencia(0, 10).variacaoPercentual, null);
  assert.equal(calcularTendencia(10, 20).variacaoPercentual, 100);
});
test('prazo considera fronteira e exclui manutenções encerradas', () => {
  const agora = new Date('2026-01-01T12:00:00Z');
  assert.deepEqual(avaliarPrazo({ situacao: 'PENDENTE', dataPrevista: agora }, agora), { atrasada: false, proximaDoVencimento: true });
  assert.equal(avaliarPrazo({ situacao: 'PENDENTE', dataPrevista: new Date(+agora - 1) }, agora).atrasada, true);
  assert.equal(avaliarPrazo({ situacao: 'CONCLUIDA', dataPrevista: new Date(0) }, agora).atrasada, false);
});

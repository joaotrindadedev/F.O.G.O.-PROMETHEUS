import { test } from "node:test";
import assert from "node:assert/strict";
import { consulta } from "../src/validators/comumValidation.js";
import { alterarEquipamento } from "../src/validators/equipamentoValidation.js";
import { posicao, telemetria } from "../src/validators/operacaoValidation.js";
import { lerAmbiente } from "../src/config/ambiente.js";

const identificador = "00000000-0000-4000-8000-000000000001";
test("características são opcionais e aceitam campos livres", () => {
  assert.deepEqual(
    alterarEquipamento.parse({ propriedades: {} }).propriedades,
    {},
  );
  assert.deepEqual(
    alterarEquipamento.parse({
      propriedades: { tipoFiscalizacao: "VELOCIDADE", observacao: "Teste" },
    }).propriedades,
    { tipoFiscalizacao: "VELOCIDADE", observacao: "Teste" },
  );
  assert.deepEqual(
    alterarEquipamento.parse({ marca: "Teste", campoExtra: true }),
    { marca: "Teste" },
  );
});
test("alteração exige campos conhecidos e pares de coordenadas", () => {
  assert.throws(() => alterarEquipamento.parse({}));
  assert.throws(() => alterarEquipamento.parse({ latitude: 2 }));
  assert.throws(() =>
    alterarEquipamento.parse({ ultimaComunicacao: new Date() }),
  );
});
test("posição exige exatamente um recurso e rejeita futuro distante", () => {
  const dados = {
    equipamentoId: identificador,
    latitude: 0,
    longitude: 0,
    ocorridoEm: new Date().toISOString(),
  };
  assert.ok(posicao.parse(dados));
  assert.throws(() => posicao.parse({ ...dados, agenteId: identificador }));
  assert.throws(() =>
    posicao.parse({ ...dados, ocorridoEm: "2099-01-01T00:00:00Z" }),
  );
});
test("paginação e área rejeitam limites incorretos", () => {
  assert.throws(() => consulta.parse({ limite: "101" }));
  assert.throws(() => consulta.parse({ sul: "0" }));
  assert.throws(() =>
    consulta.parse({ sul: "10", norte: "5", oeste: "0", leste: "1" }),
  );
  assert.equal(
    consulta.parse({ necessitaManutencao: "false" }).necessitaManutencao,
    false,
  );
});
test("telemetria só aceita medidas primitivas e finitas", () => {
  assert.throws(() =>
    telemetria.parse({
      equipamentoId: identificador,
      identificadorMensagem: "a",
      ocorridoEm: new Date().toISOString(),
      dados: { temperatura: Infinity },
    }),
  );
});
test("ambiente rejeita segredos iguais e faixas de risco invertidas", () => {
  const dados = {
    DATABASE_URL: "postgresql://localhost/fogo",
    JWT_SEGREDO: "a".repeat(32),
    IOT_CHAVE: "b".repeat(32),
    CORS_ORIGENS: "http://localhost:5173",
  };
  assert.ok(lerAmbiente(dados));
  assert.throws(() => lerAmbiente({ ...dados, IOT_CHAVE: dados.JWT_SEGREDO }));
  assert.throws(() => lerAmbiente({ ...dados, RISCO_LIMITE_ALTO: 10 }));
});

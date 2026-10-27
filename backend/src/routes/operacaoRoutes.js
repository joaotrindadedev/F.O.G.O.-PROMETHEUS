import {
  consulta,
  id,
  validarSituacao,
  situacaoAgente,
  situacaoEquipamento,
} from "../validators/comumValidation.js";
import {
  alerta,
  novoAlerta,
  ocorrencia,
} from "../validators/operacaoValidation.js";

import { criarOperacaoServico } from "../services/operacaoService.js";
import { Router } from "express";

export function operacaoRoutes(banco, publicar, ambiente) {
  const servico = criarOperacaoServico(banco, publicar, ambiente);
  const router = Router();
  router.get("/painel/resumo", async (req, res) => {
    res.json(await servico.resumo(consulta.parse(req.query)));
  });
  router.get("/painel/regioes", async (req, res) => {
    res.json(await servico.regioes(consulta.parse(req.query)));
  });
  router.get("/mapa/recursos", async (req, res) => {
    const filtros = consulta.parse(req.query);
    validarSituacao(
      filtros,
      filtros.recurso === "agentes"
        ? situacaoAgente.options
        : situacaoEquipamento.options,
    );
    res.json(await servico.mapa(filtros));
  });
  router.get("/alertas", async (req, res) => {
    const filtros = consulta.parse(req.query);
    validarSituacao(filtros, ["ABERTO", "RECONHECIDO", "RESOLVIDO"]);
    res.json(await servico.listarAlertas(filtros));
  });
  router.post("/alertas", async (req, res) => {
    res.status(201).json(await servico.criarAlerta(novoAlerta.parse(req.body)));
  });
  router.get("/alertas/:id", async (req, res) => {
    res.json(await servico.buscarAlerta(id.parse(req.params.id)));
  });
  router.patch("/alertas/:id", async (req, res) => {
    res.json(
      await servico.alterarAlerta(
        id.parse(req.params.id),
        alerta.parse(req.body),
      ),
    );
  });
  router.get("/ocorrencias", async (req, res) => {
    res.json(await servico.listarOcorrencias(consulta.parse(req.query)));
  });
  router.get("/ocorrencias/:id", async (req, res) => {
    res.json(await servico.buscarOcorrencia(id.parse(req.params.id)));
  });
  router.post("/ocorrencias", async (req, res) => {
    res
      .status(201)
      .json(await servico.criarOcorrencia(ocorrencia.parse(req.body)));
  });
  return router;
}

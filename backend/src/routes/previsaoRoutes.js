import { consulta, id } from "../validators/comumValidation.js";

import { Router } from "express";

export function previsaoRoutes(servico) {
  const router = Router();
  router.get("/previsoes/riscos", async (req, res) => {
    res.json(await servico.riscos(consulta.parse(req.query)));
  });
  router.get("/previsoes/riscos/:regiaoId", async (req, res) => {
    res.json(
      await servico.risco(
        id.parse(req.params.regiaoId),
        consulta.parse(req.query),
      ),
    );
  });
  router.get("/previsoes/horarios-criticos", async (req, res) => {
    res.json(await servico.horarios(consulta.parse(req.query)));
  });
  router.get("/previsoes/tendencias", async (req, res) => {
    res.json(await servico.tendencias(consulta.parse(req.query)));
  });
  router.get("/previsoes/anomalias", async (req, res) => {
    res.json(await servico.anomalias(consulta.parse(req.query)));
  });
  router.get("/previsoes/historico", async (req, res) => {
    res.json(await servico.historico(consulta.parse(req.query)));
  });
  router.get("/recomendacoes", async (req, res) => {
    res.json(await servico.recomendacoes(consulta.parse(req.query)));
  });
  return router;
}

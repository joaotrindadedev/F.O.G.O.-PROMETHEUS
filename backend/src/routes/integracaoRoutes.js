import { telemetria, posicao } from "../validators/operacaoValidation.js";

import { Router } from "express";
import { criarIntegracaoServico } from "../services/integracaoService.js";
import { limitar } from "../middlewares/limite.js";

export function integracaoRoutes(banco, publicar, autenticarIntegrador) {
  const router = Router();
  const integracao = criarIntegracaoServico(banco, publicar);
  const limite = limitar({ maximo: 300, janelaMs: 60_000 });
  router.post("/telemetria", limite, autenticarIntegrador, async (req, res) => {
    const resultado = await integracao.telemetria(telemetria.parse(req.body));
    res.status(resultado.duplicada ? 200 : 201).json(resultado);
  });
  router.post("/posicoes", limite, autenticarIntegrador, async (req, res) => {
    res.status(201).json(await integracao.posicao(posicao.parse(req.body)));
  });
  return router;
}

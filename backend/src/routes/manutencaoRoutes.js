import {
  consulta,
  id,
  validarSituacao,
} from "../validators/comumValidation.js";
import {
  manutencao,
  alterarManutencao,
} from "../validators/operacaoValidation.js";

import { criarManutencaoServico } from "../services/manutencaoService.js";
import { Router } from "express";

export function manutencaoRoutes(banco, publicar, ambiente) {
  const servico = criarManutencaoServico(banco, publicar, ambiente);
  const router = Router();
  router.get("/", async (req, res) => {
    const filtros = consulta.parse(req.query);
    validarSituacao(filtros, [
      "PENDENTE",
      "EM_ANDAMENTO",
      "CONCLUIDA",
      "CANCELADA",
    ]);
    res.json(await servico.listar(filtros));
  });
  router.get("/:id/historico", async (req, res) => {
    res.json(
      await servico.historico(
        id.parse(req.params.id),
        consulta.parse(req.query),
      ),
    );
  });
  router.get("/:id", async (req, res) => {
    res.json(await servico.buscar(id.parse(req.params.id)));
  });
  router.post("/", async (req, res) => {
    res
      .status(201)
      .json(await servico.salvar(null, manutencao.parse(req.body)));
  });
  router.patch("/:id", async (req, res) => {
    res.json(
      await servico.salvar(
        id.parse(req.params.id),
        alterarManutencao.parse(req.body),
      ),
    );
  });
  return router;
}

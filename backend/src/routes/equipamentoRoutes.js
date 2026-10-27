import {
  consulta,
  id,
  validarSituacao,
  situacaoEquipamento,
} from "../validators/comumValidation.js";
import {
  equipamento,
  alterarEquipamento,
} from "../validators/equipamentoValidation.js";

import { criarEquipamentoServico } from "../services/equipamentoService.js";
import { Router } from "express";

export function equipamentoRoutes(banco, publicar, ambiente) {
  const servico = criarEquipamentoServico(banco, publicar, ambiente);
  const router = Router();
  router.get("/", async (req, res) => {
    const filtros = consulta.parse(req.query);
    validarSituacao(filtros, situacaoEquipamento.options);
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
      .json(await servico.salvar(null, equipamento.parse(req.body)));
  });
  router.patch("/:id", async (req, res) => {
    res.json(
      await servico.salvar(
        id.parse(req.params.id),
        alterarEquipamento.parse(req.body),
      ),
    );
  });
  router.delete("/:id", async (req, res) => {
    await servico.excluir(id.parse(req.params.id));
    res.status(204).end();
  });
  return router;
}

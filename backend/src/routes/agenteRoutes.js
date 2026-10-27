import {
  consulta,
  id,
  validarSituacao,
  situacaoAgente,
} from "../validators/comumValidation.js";
import { agente, alterarAgente } from "../validators/cadastroValidation.js";

import { Router } from "express";
import { criarCadastroServico } from "../services/cadastroService.js";

export function agenteRoutes(banco, publicar) {
  const router = Router();
  const servico = criarCadastroServico(banco, publicar).agentes;
  router.get("/", async (req, res) => {
    const filtros = consulta.parse(req.query);
    validarSituacao(filtros, situacaoAgente.options);
    res.json(await servico.listar(filtros));
  });
  router.get("/:id", async (req, res) => {
    res.json(await servico.buscar(id.parse(req.params.id)));
  });
  router.post("/", async (req, res) => {
    res.status(201).json(await servico.salvar(null, agente.parse(req.body)));
  });
  router.patch("/:id", async (req, res) => {
    res.json(
      await servico.salvar(
        id.parse(req.params.id),
        alterarAgente.parse(req.body),
      ),
    );
  });
  router.delete("/:id", async (req, res) => {
    await servico.excluir(id.parse(req.params.id));
    res.status(204).end();
  });
  return router;
}

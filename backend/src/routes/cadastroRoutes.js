import { consulta, id, alterar } from "../validators/comumValidation.js";

import { Router } from "express";
import { criarCadastroServico } from "../services/cadastroService.js";

export function cadastroRoutes(banco, publicar, modelo, esquema) {
  const router = Router();
  const servico = criarCadastroServico(banco, publicar).catalogos;
  router.get("/", async (req, res) => {
    res.json(await servico.listar(modelo, consulta.parse(req.query)));
  });
  router.get("/:id", async (req, res) => {
    res.json(await servico.buscar(modelo, id.parse(req.params.id)));
  });
  router.post("/", async (req, res) => {
    res.status(201).json(await servico.criar(modelo, esquema.parse(req.body)));
  });
  router.patch("/:id", async (req, res) => {
    res.json(
      await servico.alterar(
        modelo,
        id.parse(req.params.id),
        alterar(esquema).parse(req.body),
      ),
    );
  });
  router.delete("/:id", async (req, res) => {
    await servico.excluir(modelo, id.parse(req.params.id));
    res.status(204).end();
  });
  return router;
}

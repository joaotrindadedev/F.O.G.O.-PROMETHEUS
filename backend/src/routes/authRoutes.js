import { Router } from "express";
import { z } from "zod";
import { criarAutenticacaoServico } from "../services/autenticacaoService.js";
import { limitar } from "../middlewares/limite.js";

const entrada = z
  .object({
    email: z.string().trim().regex(/^[^\s@]+@[^\s@]+$/, "Informe um e-mail válido.").toLowerCase(),
    senha: z.string().min(1).max(72),
  })
  .strict();

export function authRoutes(banco, ambiente, autenticar) {
  const router = Router();
  const logar = criarAutenticacaoServico(banco, ambiente);
  router.post(
    "/entrar",
    limitar({ maximo: 10, janelaMs: 60_000 }),
    async (req, res) => {
      const dados = entrada.parse(req.body);
      const usuario = await logar(dados);
      res.json(usuario);
    },
  );
  router.get("/meu-perfil", autenticar, (req, res) => res.json(req.usuario));
  return router;
}

import { authRoutes } from "./routes/authRoutes.js";
import { cadastroRoutes } from "./routes/cadastroRoutes.js";
import { agenteRoutes } from "./routes/agenteRoutes.js";
import { equipamentoRoutes } from "./routes/equipamentoRoutes.js";
import { manutencaoRoutes } from "./routes/manutencaoRoutes.js";
import { operacaoRoutes } from "./routes/operacaoRoutes.js";
import { integracaoRoutes } from "./routes/integracaoRoutes.js";
import { previsaoRoutes } from "./routes/previsaoRoutes.js";
import express from "express";
import cors from "cors";
import { criarAutenticacao } from "./middlewares/autenticacao.js";
import { tratarErros } from "./middlewares/erros.js";
import { ErroAplicacao } from "./utils/erro.js";
import { criarPrevisaoServico } from "./services/previsaoService.js";
import {
  orgao,
  regiao,
  tipoEquipamento,
} from "./validators/cadastroValidation.js";

export function criarAplicacao({ banco, ambiente, publicar = () => {} }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    cors({
      origin(origem, retorno) {
        retorno(
          origem && !ambiente.origens.includes(origem)
            ? new ErroAplicacao("Origem não autorizada.", 403)
            : null,
          true,
        );
      },
    }),
  );
  app.use(express.json({ limit: "64kb" }));
  app.use((requisicao, resposta, proximo) => {
    resposta.set("Cache-Control", "no-store");
    resposta.set("X-Content-Type-Options", "nosniff");
    proximo();
  });
  app.get("/saude", (requisicao, resposta) =>
    resposta.json({ situacao: "ATIVO" }),
  );
  const autenticacao = criarAutenticacao(banco, ambiente);
  const previsoes = criarPrevisaoServico(banco, ambiente);
  app.use(
    "/api/v1/autenticacao",
    authRoutes(banco, ambiente, autenticacao.autenticar),
  );
  app.use(
    "/api/v1",
    integracaoRoutes(banco, publicar, autenticacao.autenticarIntegrador),
  );
  app.use("/api/v1", autenticacao.autenticar);
  app.use("/api/v1/orgaos", cadastroRoutes(banco, publicar, "orgao", orgao));
  app.use("/api/v1/regioes", cadastroRoutes(banco, publicar, "regiao", regiao));
  app.use(
    "/api/v1/tipos-equipamentos",
    cadastroRoutes(banco, publicar, "tipoEquipamento", tipoEquipamento),
  );
  app.use("/api/v1/agentes", agenteRoutes(banco, publicar));
  app.use("/api/v1/equipamentos", equipamentoRoutes(banco, publicar));
  app.use("/api/v1/manutencoes", manutencaoRoutes(banco, publicar, ambiente));
  app.use("/api/v1", operacaoRoutes(banco, publicar));
  app.use("/api/v1", previsaoRoutes(previsoes));
  app.use((requisicao, resposta) =>
    resposta.status(404).json({ mensagem: "Rota não encontrada." }),
  );
  app.use(tratarErros);
  return { app, autenticacao, previsoes };
}

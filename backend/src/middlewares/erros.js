import { ZodError } from "zod";
import { ErroAplicacao } from "../utils/erro.js";

export function tratarErros(erro, requisicao, resposta, proximo) {
  if (resposta.headersSent) return proximo(erro);
  if (erro instanceof ZodError)
    return resposta
      .status(422)
      .json({
        mensagem: "Dados inválidos.",
        erros: erro.issues.map((item) => ({
          campo: item.path.join("."),
          mensagem: item.message,
        })),
      });
  if (erro instanceof ErroAplicacao)
    return resposta.status(erro.status).json({ mensagem: erro.message });
  if (erro.code === "P2002")
    return resposta
      .status(409)
      .json({ mensagem: "Já existe um registro com essa identificação." });
  if (erro.code === "P2003")
    return resposta
      .status(409)
      .json({
        mensagem:
          "O registro está relacionado a outros dados ou a referência não existe.",
      });
  if (erro.code === "P2025")
    return resposta.status(404).json({ mensagem: "Registro não encontrado." });
  if (erro.code === "P2034")
    return resposta
      .status(409)
      .json({
        mensagem:
          "O registro mudou durante a operação. Atualize os dados e tente novamente.",
      });
  if (erro.type === "entity.parse.failed")
    return resposta.status(400).json({ mensagem: "JSON inválido." });
  if (erro.type === "entity.too.large")
    return resposta
      .status(413)
      .json({ mensagem: "Conteúdo maior que o permitido." });
  // Não devolvemos mensagens do driver: elas podem conter SQL e detalhes internos.
  console.error("Falha interna:", erro.code || erro.name);
  return resposta
    .status(500)
    .json({ mensagem: "Não foi possível concluir a operação." });
}
